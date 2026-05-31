import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { AppError } from '../../common/errors/app-error';
import { env } from '../../config/env';
import { UserModelConfig } from '../../common/types/model-config';

export type SkillPlanSlide = {
  slide_number: number;
  page_type?: string;
  content?: string;
  layout_id?: string;
};

export type SkillPlan = {
  title: string;
  total_slides: number;
  slides: SkillPlanSlide[];
};

export type SkillMetadataSlideVersion = {
  version: number;
  spec?: {
    elements?: Record<string, unknown>;
  };
  image_snapshot?: string;
};

export type SkillMetadataSlide = {
  slide_number: number;
  page_type?: string;
  current_version?: number;
  versions?: SkillMetadataSlideVersion[];
};

export type SkillMetadata = {
  title?: string;
  style?: string;
  model?: string;
  slide_order?: number[];
  slides?: Record<string, SkillMetadataSlide>;
};

export type SkillGenerateResult = {
  outputDir: string;
  metadataPath: string;
  pptxPath: string;
  metadata: SkillMetadata;
};

export type SkillSlideInfo = {
  order: number;
  title: string;
  bullets: string[];
  speakerNotes: string;
  imagePrompt: string;
  imageAssetKey: string;
};

type RunCmdInput = {
  scriptPath: string;
  args: string[];
  extraEnv?: Record<string, string>;
};

const ensureDir = async (dirPath: string): Promise<void> => {
  await fs.promises.mkdir(dirPath, { recursive: true });
};

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const splitBullets = (content: string): string[] => {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) return [];

  return lines
    .slice(1)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 6);
};

export class SkillPptService {
  public resolvePaths(): {
    skillRoot: string;
    scriptsDir: string;
    mdToPlanScript: string;
    generateScript: string;
  } {
    const skillRoot = env.skill.rootDir;
    const scriptsDir = path.join(skillRoot, 'scripts');
    const mdToPlanScript = path.join(scriptsDir, 'md_to_plan.py');
    const generateScript = path.join(scriptsDir, 'generate_ppt.py');

    if (!fs.existsSync(mdToPlanScript) || !fs.existsSync(generateScript)) {
      throw new AppError(`skill scripts not found under ${scriptsDir}`, 500);
    }

    return {
      skillRoot,
      scriptsDir,
      mdToPlanScript,
      generateScript
    };
  }

  public async convertMarkdownToPlan(input: {
    markdownPath: string;
    outputPlanPath: string;
    modelConfig: UserModelConfig;
  }): Promise<SkillPlan> {
    const paths = this.resolvePaths();

    await this.runPythonScript({
      scriptPath: paths.mdToPlanScript,
      args: [input.markdownPath, '-o', input.outputPlanPath],
      extraEnv: this.buildSkillEnv(input.modelConfig)
    });

    const raw = await fs.promises.readFile(input.outputPlanPath, 'utf8');
    const parsed = JSON.parse(raw) as SkillPlan;

    if (!Array.isArray(parsed.slides) || !parsed.slides.length) {
      throw new AppError('skill plan conversion returned empty slides', 500);
    }

    return parsed;
  }

  public async generateDeck(input: {
    planJsonPath: string;
    stylePath: string;
    outputDir: string;
    modelConfig: UserModelConfig;
  }): Promise<SkillGenerateResult> {
    const paths = this.resolvePaths();

    await ensureDir(input.outputDir);

    await this.runPythonScript({
      scriptPath: paths.generateScript,
      args: [
        '--plan',
        input.planJsonPath,
        '--style',
        input.stylePath,
        '--output',
        input.outputDir,
        '--concurrency',
        String(Math.max(1, env.skill.generateConcurrency))
      ],
      extraEnv: this.buildSkillEnv(input.modelConfig)
    });

    return this.readOutput(input.outputDir);
  }

  public async regenerateSingleSlide(input: {
    sessionDir: string;
    slideNumber: number;
    modelConfig: UserModelConfig;
    instruction: string;
  }): Promise<SkillGenerateResult> {
    const paths = this.resolvePaths();
    const elementUpdates = JSON.stringify({
      title: {
        content: input.instruction
      },
      subtitle: {
        content: input.instruction
      },
      content: {
        content: input.instruction
      },
      body: {
        content: input.instruction
      }
    });

    await this.runPythonScript({
      scriptPath: paths.generateScript,
      args: [
        '--edit',
        String(input.slideNumber),
        '--session',
        input.sessionDir,
        '--element-updates',
        elementUpdates
      ],
      extraEnv: this.buildSkillEnv(input.modelConfig)
    });

    return this.readOutput(input.sessionDir);
  }

  public toDeckSlidesFromPlan(plan: SkillPlan): SkillSlideInfo[] {
    return plan.slides
      .slice()
      .sort((a, b) => Number(a.slide_number || 0) - Number(b.slide_number || 0))
      .map((slide, idx) => {
        const order = Number(slide.slide_number || idx + 1);
        const content = asText(slide.content || '');
        const lines = content
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);
        const title = lines[0] || `第${order}页`;
        const bullets = splitBullets(content);

        return {
          order,
          title,
          bullets,
          speakerNotes: '',
          imagePrompt: content || title,
          imageAssetKey: ''
        };
      });
  }

  public toDeckSlidesFromMetadata(input: {
    metadata: SkillMetadata;
    outputDir: string;
    projectId: string;
    runId: string;
  }): SkillSlideInfo[] {
    const slideOrder = (input.metadata.slide_order || [])
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n > 0);

    const result: SkillSlideInfo[] = [];

    for (const order of slideOrder) {
      const key = String(order);
      const slide = input.metadata.slides?.[key];
      const latestVersion = this.findLatestVersion(slide);
      const specElements = latestVersion?.spec?.elements || {};
      const title = this.getElementContent(specElements, ['title', 'heading']) || `第${order}页`;
      const contentText =
        this.getElementContent(specElements, ['content', 'body']) ||
        this.getElementContent(specElements, ['subtitle']) ||
        '';

      const bullets = contentText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 6);

      const imageRel =
        latestVersion?.image_snapshot ||
        slide?.versions?.[0]?.image_snapshot ||
        `images/slide-${String(order).padStart(2, '0')}.png`;
      const imageAbs = path.resolve(input.outputDir, imageRel);
      const imageAssetKey = `skill-assets/${input.projectId}/${input.runId}/${path.basename(imageAbs)}`;

      result.push({
        order,
        title,
        bullets,
        speakerNotes: contentText,
        imagePrompt: contentText || title,
        imageAssetKey
      });
    }

    return result.sort((a, b) => a.order - b.order);
  }

  public getSlideImageAbsolutePath(outputDir: string, slideOrder: number): string {
    const filename = `slide-${String(slideOrder).padStart(2, '0')}.png`;
    return path.join(outputDir, 'images', filename);
  }

  private findLatestVersion(slide?: SkillMetadataSlide): SkillMetadataSlideVersion | undefined {
    if (!slide?.versions?.length) return undefined;
    const current = Number(slide.current_version || 0);
    return (
      slide.versions.find((item) => Number(item.version) === current) ||
      slide.versions[slide.versions.length - 1]
    );
  }

  private getElementContent(
    elements: Record<string, unknown>,
    preferredKeys: string[]
  ): string {
    for (const key of preferredKeys) {
      const node = elements[key] as { content?: unknown } | undefined;
      if (node?.content) {
        const text = asText(node.content).trim();
        if (text) return text;
      }
    }

    for (const value of Object.values(elements)) {
      const node = value as { content?: unknown } | undefined;
      if (node?.content) {
        const text = asText(node.content).trim();
        if (text) return text;
      }
    }

    return '';
  }

  private readOutput(outputDir: string): SkillGenerateResult {
    const metadataPath = path.join(outputDir, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      throw new AppError(`skill output metadata not found: ${metadataPath}`, 500);
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8')) as SkillMetadata;

    const pptx = this.findPptxFile(outputDir);
    if (!pptx) {
      throw new AppError(`skill output pptx not found under ${outputDir}`, 500);
    }

    return {
      outputDir,
      metadataPath,
      pptxPath: pptx,
      metadata
    };
  }

  private findPptxFile(outputDir: string): string | undefined {
    const files = fs.readdirSync(outputDir);
    const hit = files.find((name) => name.toLowerCase().endsWith('.pptx'));
    if (!hit) return undefined;
    return path.join(outputDir, hit);
  }

  private buildSkillEnv(modelConfig: UserModelConfig): Record<string, string> {
    return {
      OPENAI_BASE_URL: modelConfig.image.url || modelConfig.analysis.baseUrl,
      OPENAI_API_KEY: modelConfig.image.key || modelConfig.analysis.apiKey,
      GPT_IMAGE_MODEL_NAME: modelConfig.image.model || 'gpt-image-2',
      GPT_IMAGE_QUALITY: env.skill.quality
    };
  }

  private async runPythonScript(input: RunCmdInput): Promise<void> {
    const fullArgs = [input.scriptPath, ...input.args];
    const childEnv = {
      ...process.env,
      ...(input.extraEnv || {})
    };

    await new Promise<void>((resolve, reject) => {
      const child = spawn(env.skill.pythonBin, fullArgs, {
        env: childEnv,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
      }, env.skill.commandTimeoutMs);

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(new AppError(`skill process start failed: ${error.message}`, 500));
      });

      child.on('close', (code, signal) => {
        clearTimeout(timeout);

        if (signal) {
          reject(
            new AppError(
              `skill command terminated by signal=${signal}; stderr=${stderr.slice(-1200)}`,
              500
            )
          );
          return;
        }

        if (code !== 0) {
          reject(
            new AppError(
              `skill command failed (code=${code}). stderr=${stderr.slice(
                -1500
              )}; stdout=${stdout.slice(-800)}`,
              500
            )
          );
          return;
        }

        resolve();
      });
    });
  }

}

export const skillPptService = new SkillPptService();
