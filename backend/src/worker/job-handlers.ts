import fs from 'fs';
import path from 'path';
import { JobType } from '../common/types/job';
import { env } from '../config/env';
import { storageService } from '../config/storage';
import { newId } from '../common/utils/id';
import { deckPlanService } from '../services/deck-plan.service';
import { jobService } from '../services/job.service';
import { modelConfigService } from '../services/model-config.service';
import { projectService } from '../services/project.service';
import { sourceParseService } from '../services/parser/source-parse.service';
import { AppError } from '../common/errors/app-error';
import { exportService } from '../services/export.service';
import { SkillPlan, SkillPlanSlide, skillPptService } from '../services/skill/skill-ppt.service';
import { stylesService } from '../services/styles.service';
import { pdfExportService } from '../services/export/pdf-export.service';
import { pptxExportService } from '../services/export/pptx-export.service';

type WorkerPayload = {
  localJobId: string;
  type: JobType;
  payload: Record<string, unknown>;
};

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');
const asNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
};

const getRequired = (payload: Record<string, unknown>, key: string): string => {
  const value = asString(payload[key]);
  if (!value) {
    throw new AppError(`payload.${key} is required`, 400);
  }
  return value;
};

const toDataUrl = (buffer: Buffer): string => `data:image/png;base64,${buffer.toString('base64')}`;

const getDeckGenerateMode = (payload: Record<string, unknown>): 'mock' | 'skill' => {
  const mode = asString(payload.mode).toLowerCase();
  if (mode === 'mock') return 'mock';
  return 'skill';
};

const sanitizeUserInstruction = (text: string): string => {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 200);
};

const buildAdditionalInstructions = async (input: {
  userId: string;
  projectId: string;
  customStyle?: string;
}): Promise<string> => {
  const lines: string[] = [];
  const style = (input.customStyle || '').trim();
  if (style) {
    lines.push(`风格要求：${style}`);
  }

  const recentUserMessages = await projectService.listRecentUserChatContents(
    input.userId,
    input.projectId,
    8
  );

  recentUserMessages.forEach((msg, index) => {
    const normalized = sanitizeUserInstruction(msg);
    if (!normalized) return;
    lines.push(`用户指令${index + 1}：${normalized}`);
  });

  return lines.join('\n');
};

const normalizePlanSlides = (plan: SkillPlan, fallbackCount: number): SkillPlanSlide[] => {
  const sorted = plan.slides
    .slice()
    .sort((a, b) => Number(a.slide_number || 0) - Number(b.slide_number || 0));

  if (sorted.length) return sorted;

  return Array.from({ length: Math.max(1, fallbackCount) }).map((_, idx) => ({
    slide_number: idx + 1,
    page_type: idx === 0 ? 'cover' : idx === fallbackCount - 1 ? 'data' : 'content',
    content: `第${idx + 1}页`
  }));
};

const injectPageTypeHints = (slides: SkillPlanSlide[]): SkillPlanSlide[] => {
  const sorted = slides.slice().sort((a, b) => Number(a.slide_number || 0) - Number(b.slide_number || 0));
  const total = sorted.length;
  return sorted.map((slide, idx) => {
    if (slide.page_type) return slide;
    if (idx === 0) return { ...slide, page_type: 'cover' };
    if (idx === total - 1) return { ...slide, page_type: 'data' };
    return { ...slide, page_type: 'content' };
  });
};

const copySkillImagesToStorage = async (input: {
  projectId: string;
  runId: string;
  slideOrders: number[];
  outputDir: string;
}): Promise<Map<number, string>> => {
  const mapping = new Map<number, string>();

  for (const order of input.slideOrders) {
    const src = skillPptService.getSlideImageAbsolutePath(input.outputDir, order);
    if (!fs.existsSync(src)) continue;

    const key = `skill-assets/${input.projectId}/${input.runId}/slide-${String(order).padStart(2, '0')}.png`;
    const buf = await fs.promises.readFile(src);
    await storageService.writeObjectBuffer(key, buf);
    mapping.set(order, key);
  }

  return mapping;
};

const mapSlidesWithContent = (
  planSlides: ReturnType<typeof skillPptService.toDeckSlidesFromPlan>,
  normalizedPlanSlides: SkillPlanSlide[],
  mapping: Map<number, string>,
  projectId: string,
  runId: string
): Array<{
  order: number;
  title: string;
  bullets: string[];
  speakerNotes: string;
  imagePrompt: string;
  imageAssetKey: string;
}> => {
  return planSlides
    .map((slide) => {
      const planSlide = normalizedPlanSlides.find((p) => Number(p.slide_number) === slide.order);
      const content = asString(planSlide?.content);
      const lines = content
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const title = slide.title || lines[0] || `第${slide.order}页`;
      const bullets =
        slide.bullets.length > 0
          ? slide.bullets
          : lines
              .slice(1)
              .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
              .filter(Boolean)
              .slice(0, 6);
      const imageAssetKey =
        mapping.get(slide.order) ||
        `skill-assets/${projectId}/${runId}/slide-${String(slide.order).padStart(2, '0')}.png`;

      return {
        ...slide,
        title,
        bullets,
        speakerNotes: content || slide.speakerNotes,
        imagePrompt: content || slide.imagePrompt,
        imageAssetKey
      };
    })
    .sort((a, b) => a.order - b.order);
};

const saveDeckBySlides = async (input: {
  userId: string;
  projectId: string;
  deckTitle: string;
  audience?: string;
  tone?: string;
  slides: Array<{
    order: number;
    title: string;
    bullets: string[];
    speakerNotes: string;
    imagePrompt: string;
    imageAssetKey: string;
  }>;
}): Promise<void> => {
  await projectService.saveDeckSpec(input.userId, input.projectId, {
    deckTitle: input.deckTitle,
    audience: input.audience || '通用受众',
    tone: input.tone || '专业清晰',
    slides: input.slides
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((slide) => ({
        id: newId(),
        title: slide.title,
        bullets: slide.bullets,
        speakerNotes: slide.speakerNotes,
        imagePrompt: slide.imagePrompt,
        imageAssetKey: slide.imageAssetKey,
        order: slide.order
      }))
  });
};

const ensureSkillRunDir = (projectId: string, runId: string): string => {
  return path.join(env.skill.outputRootDir, projectId, runId);
};

const makeRunPaths = (projectId: string, runId: string): { runDir: string; markdownPath: string; planPath: string } => {
  const runDir = ensureSkillRunDir(projectId, runId);
  return {
    runDir,
    markdownPath: path.join(runDir, 'slides_plan.md'),
    planPath: path.join(runDir, 'slides_plan.json')
  };
};

const choosePlanContext = async (input: {
  userId: string;
  projectId: string;
  pageCount: number;
  additionalInstructions?: string;
}): Promise<{
  deckTitle: string;
  audience: string;
  tone: string;
  markdown: string;
}> => {
  const project = await projectService.getProject(input.userId, input.projectId);

  if (project.deckSpec?.slides?.length) {
    const instructionBlock = (input.additionalInstructions || '').trim();
    const markdown = [
      '---',
      `title: ${project.deckSpec.deckTitle || project.name}`,
      '---',
      '',
      ...(instructionBlock
        ? ['> 用户补充要求（最近消息优先）', `> ${instructionBlock.slice(0, 240)}`, '']
        : []),
      ...project.deckSpec.slides
        .slice()
        .sort((a, b) => a.order - b.order)
        .flatMap((slide, idx, all) => {
          const pageType = idx === 0 ? 'cover' : idx === all.length - 1 ? 'data' : 'content';
          const lines: string[] = [];
          lines.push(`## ${slide.order}. [${pageType}] ${slide.title}`);
          if (slide.bullets.length) {
            for (const bullet of slide.bullets) {
              lines.push(`- ${bullet}`);
            }
          } else if (slide.speakerNotes) {
            lines.push(slide.speakerNotes);
          } else {
            lines.push('- 待补充内容');
          }
          lines.push('');
          return lines;
        })
    ].join('\n');

    return {
      deckTitle: project.deckSpec.deckTitle || project.name,
      audience: project.deckSpec.audience || '通用受众',
      tone: project.deckSpec.tone || '专业清晰',
      markdown
    };
  }

  const modelConfig = await modelConfigService.getRawConfig(input.userId);
  const sourceChunks = await projectService.listSourceChunkContents(input.userId, input.projectId, 160);
  const markdown = await deckPlanService.generateSlidesPlanMarkdown({
    modelConfig,
    projectName: project.name,
    projectBrief: project.projectBrief,
    sourceChunks,
    pageCount: input.pageCount,
    additionalInstructions: input.additionalInstructions
  });

  return {
    deckTitle: project.name,
    audience: '通用受众',
    tone: '专业清晰',
    markdown
  };
};

const findLatestDeckGenerateRunId = async (
  userId: string,
  projectId: string
): Promise<string | undefined> => {
  const job = await jobService.findLatestJob(userId, projectId, 'deck-generate');
  if (!job || job.status !== 'succeeded') return undefined;
  const dir = asString(job.result?.outputDir);
  if (!dir) return job.id;
  return path.basename(dir);
};

const handleSourceParse = async (input: WorkerPayload): Promise<Record<string, unknown>> => {
  const projectId = getRequired(input.payload, 'projectId');
  const sourceId = getRequired(input.payload, 'sourceId');
  const userId = getRequired(input.payload, 'userId');

  const source = await projectService.getSourceForUser(userId, projectId, sourceId);
  if (!source) {
    throw new AppError('source not found for parse', 404);
  }

  if (!env.feature.realSourceParse) {
    await projectService.updateSourceStatusBySourceUuid(sourceId, 'success', 'mock parse success');
    await jobService.addEvent(input.localJobId, 'source-parse', 'source parsed (mock)');
    return {
      projectId,
      sourceId,
      summary: 'source parsed successfully (mock)'
    };
  }

  const buffer = await storageService.readObjectAsBuffer(source.objectKey);
  const parsed = await sourceParseService.parseBuffer({
    filename: source.objectKey.split('/').pop() || source.objectKey,
    mimeType: source.mimeType,
    buffer
  });

  await projectService.replaceSourceChunks(
    source.sourceId,
    parsed.chunks.map((chunk, idx) => ({
      chunkUuid: newId(),
      index: idx,
      content: chunk.content,
      tokenEstimate: chunk.tokenEstimate
    }))
  );

  await projectService.updateSourceStatusBySourceUuid(sourceId, 'success', parsed.summary);

  await jobService.addEvent(input.localJobId, 'source-parse', 'source parsed');

  return {
    projectId,
    sourceId,
    summary: parsed.summary,
    chunkCount: parsed.chunks.length
  };
};

const handleDeckPlan = async (input: WorkerPayload): Promise<Record<string, unknown>> => {
  const userId = getRequired(input.payload, 'userId');
  const projectId = getRequired(input.payload, 'projectId');
  const pageCount = asNumber(input.payload.pageCount) || 10;

  if (!env.feature.realDeckPlan) {
    await jobService.addEvent(input.localJobId, 'deck-plan', 'deck spec generated (mock off)');
    return {
      projectId,
      pageCount,
      slideCount: pageCount,
      mode: 'mock'
    };
  }

  const project = await projectService.getProject(userId, projectId);
  const additionalInstructions = await buildAdditionalInstructions({
    userId,
    projectId,
    customStyle: project.customStyle
  });
  const modelConfig = await modelConfigService.getRawConfig(userId);
  const sourceChunks = await projectService.listSourceChunkContents(userId, projectId, 160);

  const deckSpec = await deckPlanService.generateDeckSpec({
    modelConfig,
    projectName: project.name,
    projectBrief: project.projectBrief,
    sourceChunks,
    pageCount,
    additionalInstructions
  });

  await projectService.saveDeckSpec(userId, projectId, deckSpec);
  await jobService.addEvent(input.localJobId, 'deck-plan', 'deck spec generated');

  return {
    projectId,
    pageCount,
    slideCount: deckSpec.slides.length
  };
};

const handleDeckGenerate = async (input: WorkerPayload): Promise<Record<string, unknown>> => {
  const userId = getRequired(input.payload, 'userId');
  const projectId = getRequired(input.payload, 'projectId');
  const styleId = asString(input.payload.styleId) || 'clean-tech-blue';
  const pageCount = asNumber(input.payload.pageCount) || 10;
  const mode = getDeckGenerateMode(input.payload);

  await jobService.addEvent(input.localJobId, 'deck-generate', `start deck-generate mode=${mode}`);
  await jobService.updateStatus(input.localJobId, 'running', 30);

  if (mode === 'mock' || !env.feature.realDeckGenerate) {
    const project = await projectService.getProject(userId, projectId);
    const additionalInstructions = await buildAdditionalInstructions({
      userId,
      projectId,
      customStyle: project.customStyle
    });
    const modelConfig = await modelConfigService.getRawConfig(userId);
    const sourceChunks = await projectService.listSourceChunkContents(userId, projectId, 160);
    const deckSpec = await deckPlanService.generateDeckSpec({
      modelConfig,
      projectName: project.name,
      projectBrief: project.projectBrief,
      sourceChunks,
      pageCount,
      additionalInstructions
    });
    await projectService.saveDeckSpec(userId, projectId, deckSpec);
    return {
      projectId,
      mode: 'mock',
      slideCount: deckSpec.slides.length
    };
  }

  const runPaths = makeRunPaths(projectId, input.localJobId);
  await fs.promises.mkdir(runPaths.runDir, { recursive: true });

  const project = await projectService.getProject(userId, projectId);
  const additionalInstructions = await buildAdditionalInstructions({
    userId,
    projectId,
    customStyle: project.customStyle
  });
  const modelConfig = await modelConfigService.getRawConfig(userId);
  const planContext = await choosePlanContext({
    userId,
    projectId,
    pageCount,
    additionalInstructions
  });
  const slidesPlanMarkdown = planContext.markdown;

  await fs.promises.writeFile(runPaths.markdownPath, slidesPlanMarkdown, 'utf8');
  await jobService.addEvent(input.localJobId, 'deck-generate', 'slides_plan.md generated');
  await jobService.updateStatus(input.localJobId, 'running', 45);

  const skillPlan = await skillPptService.convertMarkdownToPlan({
    markdownPath: runPaths.markdownPath,
    outputPlanPath: runPaths.planPath,
    modelConfig
  });
  const normalizedPlanSlides = injectPageTypeHints(normalizePlanSlides(skillPlan, pageCount));
  const normalizedPlan: SkillPlan = {
    ...skillPlan,
    slides: normalizedPlanSlides,
    total_slides: normalizedPlanSlides.length
  };
  await fs.promises.writeFile(runPaths.planPath, JSON.stringify(normalizedPlan, null, 2), 'utf8');
  await jobService.addEvent(input.localJobId, 'deck-generate', 'slides_plan.json generated');
  await jobService.updateStatus(input.localJobId, 'running', 55);

  const stylePath = stylesService.resolveStylePath(styleId);
  const generated = await skillPptService.generateDeck({
    planJsonPath: runPaths.planPath,
    stylePath,
    outputDir: runPaths.runDir,
    modelConfig
  });
  await jobService.addEvent(input.localJobId, 'deck-generate', 'skill generate_ppt.py completed');
  await jobService.updateStatus(input.localJobId, 'running', 85);

  const planSlides = skillPptService.toDeckSlidesFromPlan(normalizedPlan);
  const slideOrders = planSlides.map((slide) => slide.order);
  const mapping = await copySkillImagesToStorage({
    projectId,
    runId: input.localJobId,
    slideOrders,
    outputDir: generated.outputDir
  });

  const finalSlides = mapSlidesWithContent(
    planSlides,
    normalizedPlanSlides,
    mapping,
    projectId,
    input.localJobId
  );

  await saveDeckBySlides({
    userId,
    projectId,
    deckTitle: generated.metadata.title || planContext.deckTitle || project.name,
    audience: planContext.audience,
    tone: planContext.tone,
    slides: finalSlides
  });
  await jobService.updateStatus(input.localJobId, 'running', 95);

  return {
    projectId,
    mode: 'skill',
    styleId,
    slideCount: finalSlides.length,
    outputDir: generated.outputDir,
    metadataPath: generated.metadataPath
  };
};

const handleSlideRegenerate = async (input: WorkerPayload): Promise<Record<string, unknown>> => {
  const userId = getRequired(input.payload, 'userId');
  const projectId = getRequired(input.payload, 'projectId');
  const slideId = getRequired(input.payload, 'slideId');
  const slideOrder = asNumber(input.payload.slideOrder);
  const instruction = asString(input.payload.instruction);
  const parentJobId = asString(input.payload.parentJobId);
  await jobService.updateStatus(input.localJobId, 'running', 30);

  const slide = await projectService.getSlideByUuid(slideId);
  if (!slide) {
    throw new AppError('slide not found', 404);
  }

  if (!env.feature.realSlideRegenerate) {
    await jobService.addEvent(input.localJobId, 'slide-regenerate', 'slide image regenerate skipped');
    return {
      projectId,
      slideId,
      imageAssetKey: slide.imageAssetKey || ''
    };
  }

  if (!slideOrder) {
    throw new AppError('payload.slideOrder is required', 400);
  }

  let runId = parentJobId;
  let sessionDir = ensureSkillRunDir(projectId, runId);
  if (!runId || !fs.existsSync(sessionDir)) {
    const latestRunId = await findLatestDeckGenerateRunId(userId, projectId);
    if (latestRunId) {
      runId = latestRunId;
      sessionDir = ensureSkillRunDir(projectId, runId);
    }
  }

  if (!fs.existsSync(sessionDir)) {
    throw new AppError('skill session dir not found for slide-regenerate', 400);
  }

  const modelConfig = await modelConfigService.getRawConfig(userId);

  const generated = await skillPptService.regenerateSingleSlide({
    sessionDir,
    slideNumber: slideOrder,
    modelConfig,
    instruction: instruction || slide.imagePrompt || slide.title
  });
  await jobService.updateStatus(input.localJobId, 'running', 70);

  const src = skillPptService.getSlideImageAbsolutePath(generated.outputDir, slideOrder);
  const nextKey = `skill-assets/${projectId}/${runId}/slide-${String(
    slideOrder
  ).padStart(2, '0')}.png`;

  if (!fs.existsSync(src)) {
    throw new AppError(`regenerated slide image not found: ${src}`, 500);
  }

  const buf = await fs.promises.readFile(src);
  await storageService.writeObjectBuffer(nextKey, buf);
  await projectService.updateSlideImageAssetBySlideUuid(slideId, nextKey);

  // Keep DB text fields in sync with latest metadata for this slide.
  const regeneratedSlides = skillPptService.toDeckSlidesFromMetadata({
    metadata: generated.metadata,
    outputDir: generated.outputDir,
    projectId,
    runId
  });
  const hit = regeneratedSlides.find((s) => s.order === slideOrder);
  if (hit) {
    await projectService.updateSlide(userId, projectId, slideId, {
      title: hit.title,
      bullets: hit.bullets,
      speakerNotes: hit.speakerNotes,
      imagePrompt: hit.imagePrompt,
      imageAssetKey: nextKey
    });
  }
  await jobService.updateStatus(input.localJobId, 'running', 95);

  await jobService.addEvent(input.localJobId, 'slide-regenerate', 'slide image regenerated');

  return {
    projectId,
    slideId,
    slideOrder,
    imageAssetKey: nextKey
  };
};

const handleDeckExport = async (input: WorkerPayload): Promise<Record<string, unknown>> => {
  const userId = getRequired(input.payload, 'userId');
  const projectId = getRequired(input.payload, 'projectId');
  const format = (asString(input.payload.format) || 'pptx').toLowerCase() as 'pptx' | 'pdf';
  await jobService.updateStatus(input.localJobId, 'running', 30);

  const project = await projectService.getProject(userId, projectId);
  if (!project.deckSpec) {
    throw new AppError('deck not generated yet', 400);
  }

  if (!env.feature.realDeckExport) {
    await jobService.addEvent(input.localJobId, 'deck-export', 'deck exported (mock)');
    return {
      projectId,
      format,
      mode: 'mock'
    };
  }

  if (format === 'pdf') {
    const imagePaths: string[] = [];
    for (const slide of project.deckSpec.slides.slice().sort((a, b) => a.order - b.order)) {
      if (!slide.imageAssetKey) continue;
      const p = storageService.getLocalAbsolutePath(slide.imageAssetKey);
      if (fs.existsSync(p)) {
        imagePaths.push(p);
      }
    }

    if (!imagePaths.length) {
      throw new AppError('no slide images for pdf export', 400);
    }

    const pdfBuffer = await pdfExportService.imagesToPdfBuffer(imagePaths);
    await jobService.updateStatus(input.localJobId, 'running', 75);
    const fileRecord = await exportService.createExportWithFile(userId, projectId, 'pdf', pdfBuffer);
    await jobService.addEvent(input.localJobId, 'deck-export', 'deck exported as pdf');

    return {
      projectId,
      format: 'pdf',
      fileKey: fileRecord.fileKey,
      downloadUrl: fileRecord.downloadUrl
    };
  }

  const pptBuffer = await pptxExportService.renderPptxBuffer({
    deckSpec: project.deckSpec,
    imageResolver: async (imageAssetKey: string) => {
      if (!imageAssetKey) return undefined;

      try {
        const buf = await storageService.readObjectAsBuffer(imageAssetKey);
        return toDataUrl(buf);
      } catch {
        return undefined;
      }
    }
  });
  await jobService.updateStatus(input.localJobId, 'running', 75);

  const fileRecord = await exportService.createExportWithFile(userId, projectId, 'pptx', pptBuffer);
  await jobService.addEvent(input.localJobId, 'deck-export', 'deck exported as pptx');

  return {
    projectId,
    format: 'pptx',
    fileKey: fileRecord.fileKey,
    downloadUrl: fileRecord.downloadUrl
  };
};

export const handleJobByType = async (input: WorkerPayload): Promise<Record<string, unknown>> => {
  switch (input.type) {
    case 'source-parse':
      return handleSourceParse(input);
    case 'deck-plan':
      return handleDeckPlan(input);
    case 'deck-generate':
      return handleDeckGenerate(input);
    case 'slide-regenerate':
      return handleSlideRegenerate(input);
    case 'deck-export':
      return handleDeckExport(input);
    default:
      throw new Error(`unsupported job type: ${input.type}`);
  }
};
