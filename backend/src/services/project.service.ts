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
    return rows.map(mapSource);
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

    const highlights: string[] = [];
    for (const source of sources) {
      if (source.status !== 'success') continue;
      const raw = (source.parseSummary || '').trim();
      if (!raw) continue;
      highlights.push(raw.length > 120 ? `${raw.slice(0, 120)}...` : raw);
      if (highlights.length >= 3) break;
    }

    let summary = '';
    if (state === 'empty') {
      summary = '当前项目还没有素材，请先上传 PDF/DOCX/TXT/MD/JSON/CSV 文件。';
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
      nextAction = '上传素材后继续。';
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
