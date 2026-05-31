import { AppError } from '../common/errors/app-error';
import { DeckSpec } from '../common/types/deck';
import {
  ChatMessageRecord,
  ProjectAnalysisSummary,
  ProjectRecord,
  SourceRecord,
  SourceStatus
} from '../common/types/project';
import { newId } from '../common/utils/id';
import { llmService } from './llm/llm.service';
import { modelConfigService } from './model-config.service';
import { projectRepository } from '../repositories/project.repository';

const mapProject = (row: {
  project_uuid: string;
  user_uuid: string;
  name: string;
  project_brief: string | null;
  custom_style: string | null;
  created_at: Date;
  updated_at: Date;
}): ProjectRecord => ({
  id: row.project_uuid,
  userId: row.user_uuid,
  name: row.name,
  projectBrief: row.project_brief || '',
  customStyle: row.custom_style || undefined,
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString()
});

const mapSource = (row: {
  source_uuid: string;
  project_uuid: string;
  filename: string;
  object_key: string;
  mime_type: string;
  file_size: number;
  status: SourceStatus;
  parse_summary: string | null;
  chunk_count: number;
  parse_preview: string | null;
  created_at: Date;
  updated_at: Date;
}): SourceRecord => ({
  id: row.source_uuid,
  projectId: row.project_uuid,
  filename: row.filename,
  objectKey: row.object_key,
  mimeType: row.mime_type,
  size: Number(row.file_size),
  status: row.status,
  parseSummary: row.parse_summary || undefined,
  parsePreview: row.parse_preview || undefined,
  chunkCount: Number(row.chunk_count || 0),
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString()
});

const mapChat = (row: {
  message_uuid: string;
  project_uuid: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: Date;
}): ChatMessageRecord => ({
  id: row.message_uuid,
  projectId: row.project_uuid,
  role: row.role,
  content: row.content,
  createdAt: new Date(row.created_at).toISOString()
});

const normalizeText = (text: string): string => {
  return text.replace(/\r\n/g, '\n').replace(/\u00A0/g, ' ').replace(/[ \t]+/g, ' ').trim();
};

const stripMarkdownNoise = (text: string): string => {
  return text
    .replace(/^---[\s\S]*?---[\r\n]*/m, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+[.)、]\s+/gm, '')
    .replace(/\[(cover|content|data)\]\s*/gi, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*(title|date|author|tags|description|来源)\s*:\s*/gim, '')
    .replace(/\n{2,}/g, '\n');
};

const isMetaLine = (line: string): boolean => {
  if (!line) return true;
  if (/^(小组|成员|汇报人|日期|来源)[:：]/.test(line)) return true;
  if (/^[\W_]+$/.test(line)) return true;
  return false;
};

const ensureSentenceEnd = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return /[。！？.!?]$/.test(trimmed) ? trimmed : `${trimmed}。`;
};

const makeAnalysisCacheKey = (userId: string, projectId: string): string => `${userId}:${projectId}`;

const makeSourcesSignature = (sources: SourceRecord[]): string => {
  return sources
    .map((item) => `${item.id}:${item.status}:${item.updatedAt}:${item.chunkCount}`)
    .sort()
    .join('|');
};

const normalizeAiHighlight = (raw: string): string => {
  const cleaned = stripMarkdownNoise(raw)
    .replace(/\n+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();

  if (!cleaned) return '';

  const clipped = cleaned.length > 520 ? `${cleaned.slice(0, 520)}...` : cleaned;
  return ensureSentenceEnd(clipped);
};

const buildChatOnlyHighlight = (messages: string[]): string | undefined => {
  const merged = messages
    .map((line) => normalizeText(line))
    .filter((line) => line.length >= 6)
    .slice(-6)
    .join('，');
  if (!merged) return undefined;

  const text = `当前项目暂无上传素材，本次分析基于你的需求描述：${merged}`;
  return ensureSentenceEnd(text.length > 420 ? `${text.slice(0, 420)}...` : text);
};

const analysisHighlightCache = new Map<
  string,
  {
    sourceSignature: string;
    highlight: string;
    refreshedAt: string;
  }
>();

const buildHighlightParagraph = (sources: SourceRecord[]): string | undefined => {
  const segments: string[] = [];

  for (const source of sources) {
    if (source.status !== 'success') continue;
    const raw = normalizeText(source.parseSummary || source.parsePreview || '');
    if (!raw) continue;

    const cleaned = stripMarkdownNoise(raw);
    const lines = cleaned
      .split('\n')
      .map((line) => normalizeText(line))
      .filter((line) => line.length >= 8 && !isMetaLine(line));

    for (const line of lines) {
      segments.push(line);
      if (segments.length >= 6) break;
    }
    if (segments.length >= 6) break;
  }

  if (!segments.length) return undefined;

  const deduped = Array.from(new Set(segments)).slice(0, 4);
  const merged = deduped
    .map((item) => item.replace(/[。！？.!?]+$/g, '').trim())
    .filter(Boolean)
    .join('，');

  if (!merged) return undefined;

  const paragraph = `综合已解析素材，${merged}`;
  const clipped = paragraph.length > 460 ? `${paragraph.slice(0, 460)}...` : paragraph;
  return ensureSentenceEnd(clipped);
};

export class ProjectService {
  public async listProjects(userId: string): Promise<ProjectRecord[]> {
    const rows = await projectRepository.listProjectsByUserUuid(userId);
    return rows.map(mapProject);
  }

  public async createProject(userId: string, name: string): Promise<ProjectRecord> {
    if (!name?.trim()) {
      throw new AppError('project name is required', 400);
    }

    const projectUuid = newId();
    await projectRepository.createProject(userId, projectUuid, name.trim());
    const created = await this.getProject(userId, projectUuid);
    return created;
  }

  public async renameProject(userId: string, projectId: string, nextNameRaw: string): Promise<ProjectRecord> {
    const name = String(nextNameRaw || '').trim();
    if (!name) {
      throw new AppError('project name is required', 400);
    }
    if (name.length > 255) {
      throw new AppError('project name length must be <= 255', 400);
    }

    const result = await projectRepository.updateProjectName(userId, projectId, name);
    if (!result.updated) {
      throw new AppError('project not found', 404);
    }

    return this.getProject(userId, projectId);
  }

  public async deleteProject(
    userId: string,
    projectId: string
  ): Promise<{
    deleted: boolean;
    sourceObjectKeys: string[];
    exportFileKeys: string[];
    slideImageKeys: string[];
  }> {
    const result = await projectRepository.deleteProjectByUser(userId, projectId);
    if (!result.deleted) {
      throw new AppError('project not found', 404);
    }
    return result;
  }

  public async getProject(userId: string, projectId: string): Promise<ProjectRecord> {
    const row = await projectRepository.getProjectByUserAndProjectUuid(userId, projectId);
    if (!row) {
      throw new AppError('project not found', 404);
    }

    const base = mapProject(row);
    const deck = await projectRepository.getDeckByProject(userId, projectId);

    if (!deck) return base;

    return {
      ...base,
      deckSpec: {
        deckTitle: deck.deckTitle,
        audience: deck.audience,
        tone: deck.tone,
        slides: deck.slides.map((slide) => ({
          id: slide.slideUuid,
          title: slide.title,
          bullets: slide.bullets,
          speakerNotes: slide.speakerNotes,
          imagePrompt: slide.imagePrompt,
          imageAssetKey: slide.imageAssetKey,
          order: slide.order
        }))
      }
    };
  }

  public async updateProjectBrief(
    userId: string,
    projectId: string,
    brief: string
  ): Promise<ProjectRecord> {
    await this.getProject(userId, projectId);
    await projectRepository.updateProjectBrief(userId, projectId, brief);
    return this.getProject(userId, projectId);
  }

  public async updateProjectCustomStyle(
    userId: string,
    projectId: string,
    customStyleRaw: string
  ): Promise<ProjectRecord> {
    await this.getProject(userId, projectId);
    const trimmed = String(customStyleRaw || '').trim();

    if (trimmed.length > 300) {
      throw new AppError('customStyle length must be <= 300', 400);
    }

    await projectRepository.updateProjectCustomStyle(
      userId,
      projectId,
      trimmed.length === 0 ? null : trimmed
    );
    return this.getProject(userId, projectId);
  }

  public async listSources(userId: string, projectId: string): Promise<SourceRecord[]> {
    await this.getProject(userId, projectId);
    const rows = await projectRepository.listSourcesByProject(userId, projectId);
    const sources = rows.map(mapSource);

    // Auto-timeout: mark sources stuck in 'parsing' for over 5 minutes as failed
    const PARSE_TIMEOUT_MS = 5 * 60 * 1000;
    const now = Date.now();
    for (const source of sources) {
      if (source.status === 'parsing') {
        const age = now - new Date(source.updatedAt).getTime();
        if (age > PARSE_TIMEOUT_MS) {
          await projectRepository.updateSourceStatusBySourceUuid(
            source.id,
            'failed',
            '解析超时：任务未在预期时间内完成。请检查 AI 模型配置是否正确，然后重试。'
          );
          source.status = 'failed';
          source.parseSummary = '解析超时：任务未在预期时间内完成。请检查 AI 模型配置是否正确，然后重试。';
        }
      }
    }

    return sources;
  }

  public async deleteSource(
    userId: string,
    projectId: string,
    sourceId: string
  ): Promise<{ objectKey: string }> {
    const source = await this.getSourceForUser(userId, projectId, sourceId);
    if (!source) {
      throw new AppError('source not found', 404);
    }

    const result = await projectRepository.deleteSourceByUser(userId, projectId, sourceId);
    if (!result.deleted) {
      throw new AppError('source not found', 404);
    }

    return { objectKey: source.objectKey };
  }

  public async getSourceForUser(
    userId: string,
    projectId: string,
    sourceId: string
  ): Promise<
    | {
        sourceId: number;
        sourceUuid: string;
        objectKey: string;
        mimeType: string;
      }
    | undefined
  > {
    await this.getProject(userId, projectId);
    return projectRepository.getSourceForUser(userId, projectId, sourceId);
  }

  public async createSource(
    userId: string,
    projectId: string,
    input: {
      filename: string;
      objectKey: string;
      mimeType: string;
      size: number;
      status?: SourceStatus;
    }
  ): Promise<SourceRecord> {
    await this.getProject(userId, projectId);

    const sourceUuid = newId();
    await projectRepository.createSource(userId, projectId, sourceUuid, {
      filename: input.filename,
      objectKey: input.objectKey,
      mimeType: input.mimeType,
      size: input.size,
      status: input.status || 'parsing'
    });

    const rows = await projectRepository.listSourcesByProject(userId, projectId);
    const created = rows.find((r) => r.source_uuid === sourceUuid);
    if (!created) {
      throw new Error('source create failed');
    }

    return mapSource(created);
  }

  public async replaceSourceChunks(
    sourceId: number,
    chunks: Array<{ chunkUuid: string; index: number; content: string; tokenEstimate: number }>
  ): Promise<void> {
    await projectRepository.replaceSourceChunks(sourceId, chunks);
  }

  public async listSourceChunkContents(
    userId: string,
    projectId: string,
    limit = 120
  ): Promise<string[]> {
    await this.getProject(userId, projectId);
    const rows = await projectRepository.listSourceChunksByProject(userId, projectId, limit);
    return rows.map((row) => row.content);
  }

  public async updateSourceStatus(
    userId: string,
    projectId: string,
    sourceId: string,
    status: SourceStatus,
    parseSummary?: string
  ): Promise<SourceRecord> {
    await this.getProject(userId, projectId);

    await projectRepository.updateSourceStatus(userId, projectId, sourceId, status, parseSummary);

    const rows = await projectRepository.listSourcesByProject(userId, projectId);
    const target = rows.find((it) => it.source_uuid === sourceId);

    if (!target) {
      throw new AppError('source not found', 404);
    }

    return mapSource(target);
  }

  public async updateSourceStatusBySourceUuid(
    sourceId: string,
    status: SourceStatus,
    parseSummary?: string
  ): Promise<void> {
    await projectRepository.updateSourceStatusBySourceUuid(sourceId, status, parseSummary);
  }

  public async addChatMessage(
    userId: string,
    projectId: string,
    role: ChatMessageRecord['role'],
    content: string
  ): Promise<ChatMessageRecord> {
    await this.getProject(userId, projectId);

    const messageUuid = newId();
    await projectRepository.createChatMessage(userId, projectId, messageUuid, role, content);

    const rows = await projectRepository.listChatMessagesByProject(userId, projectId);
    const created = rows.find((it) => it.message_uuid === messageUuid);
    if (!created) {
      throw new Error('chat message create failed');
    }

    return mapChat(created);
  }

  public async listChatMessages(userId: string, projectId: string): Promise<ChatMessageRecord[]> {
    await this.getProject(userId, projectId);
    const rows = await projectRepository.listChatMessagesByProject(userId, projectId);
    return rows.map(mapChat);
  }

  public async deleteChatMessage(
    userId: string,
    projectId: string,
    messageId: string
  ): Promise<{ id: string; deleted: boolean }> {
    if (!messageId?.trim()) {
      throw new AppError('message id is required', 400);
    }

    await this.getProject(userId, projectId);
    const result = await projectRepository.deleteChatMessageByUser(userId, projectId, messageId.trim());
    if (!result.deleted) {
      throw new AppError('chat message not found', 404);
    }

    return { id: messageId.trim(), deleted: true };
  }

  public async clearChatMessages(
    userId: string,
    projectId: string
  ): Promise<{ projectId: string; deletedCount: number }> {
    await this.getProject(userId, projectId);
    const result = await projectRepository.clearChatMessagesByProject(userId, projectId);
    return { projectId, deletedCount: result.deletedCount };
  }

  public async listRecentUserChatContents(
    userId: string,
    projectId: string,
    limit = 8
  ): Promise<string[]> {
    await this.getProject(userId, projectId);
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 30) : 8;
    const rows = await projectRepository.listRecentUserChatContentsByProject(
      userId,
      projectId,
      safeLimit
    );
    return rows.map((line) => line.trim()).filter(Boolean);
  }

  public async getProjectAnalysisSummary(
    userId: string,
    projectId: string
  ): Promise<ProjectAnalysisSummary> {
    const project = await this.getProject(userId, projectId);
    const sources = await this.listSources(userId, projectId);

    const counts = {
      total: sources.length,
      success: sources.filter((item) => item.status === 'success').length,
      parsing: sources.filter((item) => item.status === 'parsing').length,
      failed: sources.filter((item) => item.status === 'failed').length
    };

    let state: ProjectAnalysisSummary['state'] = 'empty';
    if (counts.total === 0) {
      state = 'empty';
    } else if (counts.success === 0 && counts.parsing > 0 && counts.failed === 0) {
      state = 'parsing';
    } else if (counts.success > 0 && counts.failed === 0 && counts.parsing === 0) {
      state = 'ready';
    } else if (counts.success === 0 && counts.failed > 0 && counts.parsing === 0) {
      state = 'failed';
    } else {
      state = 'partial';
    }

    const sourceSignature = makeSourcesSignature(sources);
    const cacheKey = makeAnalysisCacheKey(userId, projectId);
    const cachedHighlight = analysisHighlightCache.get(cacheKey);
    const fallbackHighlight = buildHighlightParagraph(sources);
    const effectiveHighlight =
      cachedHighlight &&
      cachedHighlight.sourceSignature === sourceSignature &&
      cachedHighlight.highlight.trim()
        ? cachedHighlight.highlight.trim()
        : fallbackHighlight;
    const highlights: string[] = effectiveHighlight ? [effectiveHighlight] : [];

    let summary = '';
    if (state === 'empty') {
      summary = '当前项目还没有素材。你可以直接通过对话描述主题，系统也可以基于需求生成演示文稿。';
    } else if (state === 'parsing') {
      summary = `已上传 ${counts.total} 个素材，正在解析中，请稍后查看分析结果。`;
    } else if (state === 'ready') {
      summary = `素材已全部解析完成（${counts.success}/${counts.total}），可开始对话细化并生成演示文稿。`;
    } else if (state === 'failed') {
      summary = `素材解析失败（${counts.failed}/${counts.total}），建议检查文件内容后重试。`;
    } else {
      summary = `素材处理部分完成：成功 ${counts.success}，解析中 ${counts.parsing}，失败 ${counts.failed}。`;
    }

    let nextAction = '';
    if (state === 'empty') {
      nextAction = '可直接在对话框描述你要生成的主题，或先上传素材。';
    } else if (state === 'parsing') {
      nextAction = '等待解析完成，再进入对话调整。';
    } else if (state === 'ready') {
      nextAction = '可先对话补充要求，再点击整套生成。';
    } else if (state === 'failed') {
      nextAction = '对失败素材执行重试解析或删除后重新上传。';
    } else {
      nextAction = counts.parsing > 0 ? '等待剩余素材解析完成。' : '先处理失败素材后再生成。';
    }

    return {
      state,
      counts,
      summary,
      highlights,
      nextAction,
      updatedAt: project.updatedAt
    };
  }

  public async reanalyzeProjectAnalysisSummary(
    userId: string,
    projectId: string
  ): Promise<ProjectAnalysisSummary> {
    const modelConfig = await modelConfigService.getRawConfig(userId);
    if (!modelConfig.analysis.apiKey.trim()) {
      throw new AppError('请先在模型设置中配置分析模型 API Key，再执行重新分析。', 400);
    }

    const sources = await this.listSources(userId, projectId);
    const successSources = sources.filter((item) => item.status === 'success');
    const recentUserMessages = await this.listRecentUserChatContents(userId, projectId, 8);
    const sourceChunks =
      successSources.length > 0 ? await this.listSourceChunkContents(userId, projectId, 200) : [];
    const sourceExcerpt = sourceChunks.join('\n\n').slice(0, 14000).trim();
    const chatContext = recentUserMessages.join('\n').slice(0, 4000).trim();

    if (!sourceExcerpt && !chatContext) {
      throw new AppError('暂无可分析内容，请先上传素材或输入对话需求。', 400);
    }

    const prompt = [
      '请基于下面信息生成一段中文分析文本。',
      '要求：',
      '1) 只输出一段正文，不要标题，不要列表，不要 Markdown。',
      '2) 长度控制在 180-320 字。',
      '3) 语气自然，风格接近 NotebookLM 的来源总结。',
      '4) 不得编造事实；若缺少素材，请明确说明为“基于用户需求推导”。',
      '',
      sourceExcerpt ? '素材：' : '素材：无',
      sourceExcerpt || '（无）',
      '',
      chatContext ? '用户需求对话：' : '用户需求对话：无',
      chatContext || '（无）'
    ].join('\n');

    const answerRaw = await llmService.chat(
      modelConfig,
      [
        {
          role: 'system',
          content: '你是严谨的中文资料分析助手。输出必须是单段落正文。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      {
        temperature: 0.7,
        maxTokens: 900
      }
    );

    const aiHighlight = normalizeAiHighlight(answerRaw);
    if (!aiHighlight) {
      throw new AppError('AI 未返回有效分析内容，请重试。', 502);
    }

    const highlightForCache =
      aiHighlight ||
      (successSources.length === 0 ? buildChatOnlyHighlight(recentUserMessages) || '' : '');
    if (!highlightForCache) {
      throw new AppError('AI 未返回有效分析内容，请重试。', 502);
    }

    analysisHighlightCache.set(makeAnalysisCacheKey(userId, projectId), {
      sourceSignature: makeSourcesSignature(sources),
      highlight: highlightForCache,
      refreshedAt: new Date().toISOString()
    });

    return this.getProjectAnalysisSummary(userId, projectId);
  }

  public async saveDeckSpec(userId: string, projectId: string, deckSpec: DeckSpec): Promise<ProjectRecord> {
    await this.getProject(userId, projectId);

    await projectRepository.saveDeckSpec(userId, projectId, {
      deckUuid: newId(),
      deckTitle: deckSpec.deckTitle,
      audience: deckSpec.audience,
      tone: deckSpec.tone,
      slides: deckSpec.slides.map((slide) => ({
        slideUuid: slide.id,
        order: slide.order,
        title: slide.title,
        bullets: slide.bullets,
        speakerNotes: slide.speakerNotes,
        imagePrompt: slide.imagePrompt,
        imageAssetKey: slide.imageAssetKey
      }))
    });

    return this.getProject(userId, projectId);
  }

  public async getSlideByUuid(slideId: string): Promise<
    | {
        slideUuid: string;
        projectUuid: string;
        title: string;
        bullets: string[];
        speakerNotes: string;
        imagePrompt: string;
        imageAssetKey: string;
      }
    | undefined
  > {
    return projectRepository.getSlideByUuid(slideId);
  }

  public async updateSlideImageAssetBySlideUuid(
    slideId: string,
    imageAssetKey: string
  ): Promise<void> {
    await projectRepository.updateSlideImageAssetBySlideUuid(slideId, imageAssetKey);
  }

  public async getSlideByOrder(
    userId: string,
    projectId: string,
    order: number
  ): Promise<
    | {
        slideUuid: string;
        projectUuid: string;
        title: string;
        bullets: string[];
        speakerNotes: string;
        imagePrompt: string;
        imageAssetKey: string;
      }
    | undefined
  > {
    const project = await this.getProject(userId, projectId);
    const slide = project.deckSpec?.slides.find((item) => item.order === order);
    if (!slide) return undefined;
    return this.getSlideByUuid(slide.id);
  }

  public async updateSlide(
    userId: string,
    projectId: string,
    slideId: string,
    payload: Partial<{
      title: string;
      bullets: string[];
      speakerNotes: string;
      imagePrompt: string;
      imageAssetKey: string;
    }>
  ): Promise<DeckSpec> {
    const project = await this.getProject(userId, projectId);
    if (!project.deckSpec) {
      throw new AppError('deck not generated yet', 400);
    }

    const updated = await projectRepository.updateSlide(userId, projectId, slideId, payload);
    if (!updated) {
      throw new AppError('slide not found', 404);
    }

    const projectAfter = await this.getProject(userId, projectId);
    if (!projectAfter.deckSpec) {
      throw new AppError('deck not generated yet', 400);
    }

    return projectAfter.deckSpec;
  }
}

export const projectService = new ProjectService();
