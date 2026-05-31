import { DeckSpec } from '../common/types/deck';
import { UserModelConfig } from '../common/types/model-config';
import { llmService } from './llm/llm.service';
import { newId } from '../common/utils/id';

const fallbackDeck = (input: {
  projectName: string;
  pageCount: number;
  projectBrief: string;
  additionalInstructions?: string;
}): DeckSpec => {
  const slides = Array.from({ length: input.pageCount }).map((_, idx) => {
    const order = idx + 1;
    return {
      id: newId(),
      title: `第${order}页：${input.projectName}`,
      bullets: [
        `${input.projectName} 关键要点 ${order}`,
        '根据素材自动提炼内容',
        input.additionalInstructions
          ? `补充要求：${input.additionalInstructions.slice(0, 80)}`
          : '后续可继续在 Studio 微调'
      ],
      speakerNotes: input.projectBrief || '待补充讲稿备注',
      imagePrompt: `${input.projectName}, slide ${order}, clean professional, 16:9, 1920x1080`,
      imageAssetKey: '',
      order
    };
  });

  return {
    deckTitle: input.projectName,
    audience: '通用受众',
    tone: '专业清晰',
    slides
  };
};

export class DeckPlanService {
  public async generateDeckSpec(input: {
    modelConfig: UserModelConfig;
    projectName: string;
    projectBrief: string;
    sourceChunks: string[];
    pageCount: number;
    additionalInstructions?: string;
  }): Promise<DeckSpec> {
    const prompt = this.buildPrompt(input);

    try {
      const response = await llmService.chat(
        input.modelConfig,
        [
          {
            role: 'system',
            content:
              '你是专业演示文稿策划助手。请输出严格JSON，不要输出任何额外文本。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        {
          temperature: 0.4,
          maxTokens: 3500
        }
      );

      const parsed = this.parseDeckSpecFromJson(response);
      return parsed;
    } catch {
      return fallbackDeck({
        projectName: input.projectName,
        pageCount: input.pageCount,
        projectBrief: input.projectBrief,
        additionalInstructions: input.additionalInstructions
      });
    }
  }

  public async generateSlidesPlanMarkdown(input: {
    modelConfig: UserModelConfig;
    projectName: string;
    projectBrief: string;
    sourceChunks: string[];
    pageCount: number;
    additionalInstructions?: string;
  }): Promise<string> {
    const prompt = this.buildMarkdownPrompt(input);

    try {
      const response = await llmService.chat(
        input.modelConfig,
        [
          {
            role: 'system',
            content:
              '你是演示文稿策划助手。仅输出 markdown，不要输出代码块标记。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        {
          temperature: 0.4,
          maxTokens: 3500
        }
      );

      return this.normalizeMarkdownPlan(response, input.projectName, input.pageCount);
    } catch {
      return this.fallbackMarkdownPlan(
        input.projectName,
        input.projectBrief,
        input.pageCount,
        input.additionalInstructions
      );
    }
  }

  private buildPrompt(input: {
    projectName: string;
    projectBrief: string;
    sourceChunks: string[];
    pageCount: number;
    additionalInstructions?: string;
  }): string {
    const excerpt = input.sourceChunks.join('\n\n').slice(0, 12000);
    const additionalInstructions = (input.additionalInstructions || '').trim();

    return [
      `项目名称：${input.projectName}`,
      `项目brief：${input.projectBrief || '无'}`,
      `目标页数：${input.pageCount}`,
      additionalInstructions
        ? `用户补充要求（最近消息优先）：\n${additionalInstructions}\n请严格遵循补充要求，同时不得脱离素材事实虚构数据。`
        : '用户补充要求：无',
      '请输出如下JSON结构（字段名必须一致）：',
      '{"deckTitle":"...","audience":"...","tone":"...","slides":[{"title":"...","bullets":["..."],"speakerNotes":"...","imagePrompt":"...","order":1}]}',
      '要求：slides长度必须等于目标页数；每页3条bullets；order从1递增。',
      '以下是素材片段：',
      excerpt || '（无素材）'
    ].join('\n\n');
  }

  private buildMarkdownPrompt(input: {
    projectName: string;
    projectBrief: string;
    sourceChunks: string[];
    pageCount: number;
    additionalInstructions?: string;
  }): string {
    const excerpt = input.sourceChunks.join('\n\n').slice(0, 12000);
    const additionalInstructions = (input.additionalInstructions || '').trim();
    return [
      `项目名称：${input.projectName}`,
      `项目brief：${input.projectBrief || '无'}`,
      `目标页数：${input.pageCount}`,
      additionalInstructions
        ? `用户补充要求（最近消息优先）：\n${additionalInstructions}\n请严格遵循补充要求，同时不得脱离素材事实虚构数据。`
        : '用户补充要求：无',
      '请输出 markdown，严格遵循如下格式：',
      '---',
      'title: 演示标题',
      '---',
      '',
      '## 1. [cover] 首页标题',
      '- 要点1',
      '- 要点2',
      '',
      '## 2. [content] 页面标题',
      '- 要点1',
      '- 要点2',
      '',
      `最后一页使用 [data]。总页数必须是 ${input.pageCount}，每页至少2条要点。`,
      '以下是素材片段：',
      excerpt || '（无素材）'
    ].join('\n');
  }

  private normalizeMarkdownPlan(raw: string, projectName: string, pageCount: number): string {
    const text = raw.replace(/\r\n/g, '\n').trim();
    const hasHeading = /(^|\n)##\s+/m.test(text);

    if (!hasHeading) {
      return this.fallbackMarkdownPlan(projectName, '', pageCount);
    }

    const hasFrontmatter = /^---\s*\n[\s\S]*?\n---/m.test(text);
    const body = hasFrontmatter ? text : `---\ntitle: ${projectName}\n---\n\n${text}`;

    return body.trim() + '\n';
  }

  private fallbackMarkdownPlan(
    projectName: string,
    brief: string,
    pageCount: number,
    additionalInstructions?: string
  ): string {
    const lines: string[] = [];
    lines.push('---');
    lines.push(`title: ${projectName}`);
    lines.push('---');
    lines.push('');

    const instruction = (additionalInstructions || '').trim();
    if (instruction) {
      lines.push('> 用户补充要求（最近消息优先）');
      lines.push(`> ${instruction.slice(0, 240)}`);
      lines.push('');
    }

    for (let i = 1; i <= pageCount; i += 1) {
      const pageType = i === 1 ? 'cover' : i === pageCount ? 'data' : 'content';
      lines.push(`## ${i}. [${pageType}] 第${i}页：${projectName}`);
      lines.push(`- 关键点 ${i}.1`);
      lines.push(`- 关键点 ${i}.2`);
      if (brief) lines.push(`- ${brief.slice(0, 80)}`);
      lines.push('');
    }

    return lines.join('\n').trim() + '\n';
  }

  private parseDeckSpecFromJson(raw: string): DeckSpec {
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');

    if (jsonStart < 0 || jsonEnd <= jsonStart) {
      throw new Error('model output is not json');
    }

    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as {
      deckTitle?: string;
      audience?: string;
      tone?: string;
      slides?: Array<{
        title?: string;
        bullets?: string[];
        speakerNotes?: string;
        imagePrompt?: string;
        order?: number;
      }>;
    };

    const slides = (parsed.slides || []).map((slide, idx) => ({
      id: newId(),
      title: slide.title || `第${idx + 1}页`,
      bullets: Array.isArray(slide.bullets) ? slide.bullets.map((x) => String(x)) : [],
      speakerNotes: slide.speakerNotes || '',
      imagePrompt: slide.imagePrompt || `${parsed.deckTitle || 'presentation'} slide ${idx + 1}`,
      imageAssetKey: '',
      order: Number(slide.order || idx + 1)
    }));

    return {
      deckTitle: parsed.deckTitle || 'Untitled Deck',
      audience: parsed.audience || '通用受众',
      tone: parsed.tone || '专业清晰',
      slides
    };
  }
}

export const deckPlanService = new DeckPlanService();
