import { ResultSetHeader } from 'mysql2';
import { RowDataPacket } from 'mysql2/promise';
import { getDbPool } from '../config/database';
import { executeSql, one, queryRows } from '../common/db/sql';

type ProjectRow = {
  project_uuid: string;
  user_uuid: string;
  name: string;
  project_brief: string | null;
  custom_style: string | null;
  deck_title: string | null;
  audience: string | null;
  tone: string | null;
  created_at: Date;
  updated_at: Date;
};

type SourceRow = {
  source_uuid: string;
  project_uuid: string;
  filename: string;
  object_key: string;
  mime_type: string;
  file_size: number;
  status: 'parsing' | 'success' | 'failed';
  parse_summary: string | null;
  chunk_count: number;
  created_at: Date;
  updated_at: Date;
};

type SourceChunkRow = {
  chunk_uuid: string;
  chunk_index: number;
  content: string;
  token_estimate: number;
};

type ChatMessageRow = {
  message_uuid: string;
  project_uuid: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: Date;
};

type DeckRow = {
  deck_id: number;
  deck_uuid: string;
  deck_title: string;
  audience: string;
  tone: string;
  version_no: number;
};

type DeckSlideRow = {
  slide_uuid: string;
  slide_order: number;
  title: string;
  bullets_json: unknown;
  speaker_notes: string;
  image_prompt: string;
  image_asset_key: string | null;
};

type ExportRow = {
  export_uuid: string;
  project_uuid: string;
  format: 'pptx' | 'pdf';
  file_key: string;
  download_url: string;
  created_at: Date;
};

const parseJsonArray = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x));
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
    } catch {
      return [];
    }
  }

  return [];
};

export class ProjectRepository {
  public async listProjectsByUserUuid(userUuid: string): Promise<ProjectRow[]> {
    return queryRows<ProjectRow>(
      `SELECT
         p.project_uuid,
         u.user_uuid,
         p.name,
         p.project_brief,
         p.custom_style,
         p.deck_title,
         p.audience,
         p.tone,
         p.created_at,
         p.updated_at
       FROM projects p
       INNER JOIN users u ON u.id = p.user_id
       WHERE u.user_uuid = ?
       ORDER BY p.updated_at DESC`,
      [userUuid]
    );
  }

  public async createProject(userUuid: string, projectUuid: string, name: string): Promise<void> {
    const result = await executeSql(
      `INSERT INTO projects (project_uuid, user_id, name, project_brief)
       SELECT ?, u.id, ?, ''
       FROM users u
       WHERE u.user_uuid = ?`,
      [projectUuid, name, userUuid]
    );

    if (result.affectedRows === 0) {
      throw new Error('user not found when create project');
    }
  }

  public async getProjectByUserAndProjectUuid(
    userUuid: string,
    projectUuid: string
  ): Promise<ProjectRow | undefined> {
    return one<ProjectRow>(
      `SELECT
         p.project_uuid,
         u.user_uuid,
         p.name,
         p.project_brief,
         p.custom_style,
         p.deck_title,
         p.audience,
         p.tone,
         p.created_at,
         p.updated_at
       FROM projects p
       INNER JOIN users u ON u.id = p.user_id
       WHERE u.user_uuid = ? AND p.project_uuid = ?
       LIMIT 1`,
      [userUuid, projectUuid]
    );
  }

  public async updateProjectBrief(
    userUuid: string,
    projectUuid: string,
    brief: string
  ): Promise<void> {
    await executeSql(
      `UPDATE projects p
       INNER JOIN users u ON u.id = p.user_id
       SET p.project_brief = ?
       WHERE u.user_uuid = ? AND p.project_uuid = ?`,
      [brief, userUuid, projectUuid]
    );
  }

  public async updateProjectCustomStyle(
    userUuid: string,
    projectUuid: string,
    customStyle: string | null
  ): Promise<void> {
    await executeSql(
      `UPDATE projects p
       INNER JOIN users u ON u.id = p.user_id
       SET p.custom_style = ?,
           p.updated_at = CURRENT_TIMESTAMP(3)
       WHERE u.user_uuid = ? AND p.project_uuid = ?`,
      [customStyle, userUuid, projectUuid]
    );
  }

  public async createSource(
    userUuid: string,
    projectUuid: string,
    sourceUuid: string,
    input: {
      filename: string;
      objectKey: string;
      mimeType: string;
      size: number;
      status: 'parsing' | 'success' | 'failed';
    }
  ): Promise<void> {
    const result = await executeSql(
      `INSERT INTO sources (
         source_uuid,
         project_id,
         filename,
         object_key,
         mime_type,
         file_size,
         status
       )
       SELECT ?, p.id, ?, ?, ?, ?, ?
       FROM projects p
       INNER JOIN users u ON u.id = p.user_id
       WHERE p.project_uuid = ? AND u.user_uuid = ?`,
      [
        sourceUuid,
        input.filename,
        input.objectKey,
        input.mimeType,
        input.size,
        input.status,
        projectUuid,
        userUuid
      ]
    );

    if (result.affectedRows === 0) {
      throw new Error('project not found when create source');
    }

    await executeSql(
      `UPDATE projects p
       INNER JOIN users u ON u.id = p.user_id
       SET p.updated_at = CURRENT_TIMESTAMP(3)
       WHERE p.project_uuid = ? AND u.user_uuid = ?`,
      [projectUuid, userUuid]
    );
  }

  public async listSourcesByProject(userUuid: string, projectUuid: string): Promise<SourceRow[]> {
    return queryRows<SourceRow>(
      `SELECT
         s.source_uuid,
         p.project_uuid,
         s.filename,
         s.object_key,
         s.mime_type,
         s.file_size,
         s.status,
         s.parse_summary,
         COALESCE(sc.chunk_count, 0) AS chunk_count,
         s.created_at,
         s.updated_at
       FROM sources s
       LEFT JOIN (
         SELECT source_id, COUNT(*) AS chunk_count
         FROM source_chunks
         GROUP BY source_id
       ) sc ON sc.source_id = s.id
       INNER JOIN projects p ON p.id = s.project_id
       INNER JOIN users u ON u.id = p.user_id
       WHERE u.user_uuid = ? AND p.project_uuid = ?
       ORDER BY s.created_at ASC`,
      [userUuid, projectUuid]
    );
  }

  public async getSourceForUser(
    userUuid: string,
    projectUuid: string,
    sourceUuid: string
  ): Promise<
    | {
        sourceId: number;
        sourceUuid: string;
        objectKey: string;
        mimeType: string;
      }
    | undefined
  > {
    const row = await one<{
      source_id: number;
      source_uuid: string;
      object_key: string;
      mime_type: string;
    }>(
      `SELECT
         s.id AS source_id,
         s.source_uuid,
         s.object_key,
         s.mime_type
       FROM sources s
       INNER JOIN projects p ON p.id = s.project_id
       INNER JOIN users u ON u.id = p.user_id
       WHERE u.user_uuid = ?
         AND p.project_uuid = ?
         AND s.source_uuid = ?
       LIMIT 1`,
      [userUuid, projectUuid, sourceUuid]
    );

    if (!row) return undefined;

    return {
      sourceId: Number(row.source_id),
      sourceUuid: row.source_uuid,
      objectKey: row.object_key,
      mimeType: row.mime_type
    };
  }

  public async deleteSourceByUser(
    userUuid: string,
    projectUuid: string,
    sourceUuid: string
  ): Promise<{ deleted: boolean }> {
    const conn = await getDbPool().getConnection();

    try {
      await conn.beginTransaction();

      const [sourceRows] = await conn.query<RowDataPacket[]>(
        `SELECT s.id AS source_id
         FROM sources s
         INNER JOIN projects p ON p.id = s.project_id
         INNER JOIN users u ON u.id = p.user_id
         WHERE u.user_uuid = ?
           AND p.project_uuid = ?
           AND s.source_uuid = ?
         LIMIT 1
         FOR UPDATE`,
        [userUuid, projectUuid, sourceUuid]
      );

      const sourceId = Number(sourceRows[0]?.source_id || 0);
      if (!sourceId) {
        await conn.rollback();
        return { deleted: false };
      }

      await conn.execute('DELETE FROM source_chunks WHERE source_id = ?', [sourceId]);
      await conn.execute('DELETE FROM sources WHERE id = ?', [sourceId]);
      await conn.execute(
        `UPDATE projects p
         INNER JOIN users u ON u.id = p.user_id
         SET p.updated_at = CURRENT_TIMESTAMP(3)
         WHERE p.project_uuid = ? AND u.user_uuid = ?`,
        [projectUuid, userUuid]
      );

      await conn.commit();
      return { deleted: true };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  public async replaceSourceChunks(
    sourceId: number,
    chunks: Array<{ chunkUuid: string; index: number; content: string; tokenEstimate: number }>
  ): Promise<void> {
    const conn = await getDbPool().getConnection();

    try {
      await conn.beginTransaction();
      await conn.execute('DELETE FROM source_chunks WHERE source_id = ?', [sourceId]);

      for (const chunk of chunks) {
        await conn.execute(
          `INSERT INTO source_chunks (chunk_uuid, source_id, chunk_index, content, token_estimate)
           VALUES (?, ?, ?, ?, ?)`,
          [chunk.chunkUuid, sourceId, chunk.index, chunk.content, chunk.tokenEstimate]
        );
      }

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  public async listSourceChunksByProject(
    userUuid: string,
    projectUuid: string,
    limit = 120
  ): Promise<SourceChunkRow[]> {
    return queryRows<SourceChunkRow>(
      `SELECT
         c.chunk_uuid,
         c.chunk_index,
         c.content,
         c.token_estimate
       FROM source_chunks c
       INNER JOIN sources s ON s.id = c.source_id
       INNER JOIN projects p ON p.id = s.project_id
       INNER JOIN users u ON u.id = p.user_id
       WHERE u.user_uuid = ?
         AND p.project_uuid = ?
       ORDER BY c.chunk_index ASC
       LIMIT ?`,
      [userUuid, projectUuid, limit]
    );
  }

  public async updateSourceStatus(
    userUuid: string,
    projectUuid: string,
    sourceUuid: string,
    status: 'parsing' | 'success' | 'failed',
    parseSummary?: string
  ): Promise<void> {
    await executeSql(
      `UPDATE sources s
       INNER JOIN projects p ON p.id = s.project_id
       INNER JOIN users u ON u.id = p.user_id
       SET s.status = ?,
           s.parse_summary = ?,
           s.updated_at = CURRENT_TIMESTAMP(3)
       WHERE u.user_uuid = ?
         AND p.project_uuid = ?
         AND s.source_uuid = ?`,
      [status, parseSummary || null, userUuid, projectUuid, sourceUuid]
    );
  }

  public async updateSourceStatusBySourceUuid(
    sourceUuid: string,
    status: 'parsing' | 'success' | 'failed',
    parseSummary?: string
  ): Promise<void> {
    await executeSql(
      `UPDATE sources
       SET status = ?,
           parse_summary = ?,
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE source_uuid = ?`,
      [status, parseSummary || null, sourceUuid]
    );
  }

  public async createChatMessage(
    userUuid: string,
    projectUuid: string,
    messageUuid: string,
    role: 'user' | 'assistant' | 'system',
    content: string
  ): Promise<void> {
    const result = await executeSql(
      `INSERT INTO chat_messages (message_uuid, project_id, role, content)
       SELECT ?, p.id, ?, ?
       FROM projects p
       INNER JOIN users u ON u.id = p.user_id
       WHERE p.project_uuid = ? AND u.user_uuid = ?`,
      [messageUuid, role, content, projectUuid, userUuid]
    );

    if (result.affectedRows === 0) {
      throw new Error('project not found when create chat message');
    }
  }

  public async listChatMessagesByProject(
    userUuid: string,
    projectUuid: string
  ): Promise<ChatMessageRow[]> {
    return queryRows<ChatMessageRow>(
      `SELECT
         m.message_uuid,
         p.project_uuid,
         m.role,
         m.content,
         m.created_at
       FROM chat_messages m
       INNER JOIN projects p ON p.id = m.project_id
       INNER JOIN users u ON u.id = p.user_id
       WHERE u.user_uuid = ? AND p.project_uuid = ?
       ORDER BY m.created_at ASC`,
      [userUuid, projectUuid]
    );
  }

  public async listRecentUserChatContentsByProject(
    userUuid: string,
    projectUuid: string,
    limit: number
  ): Promise<string[]> {
    const rows = await queryRows<{ content: string }>(
      `SELECT m.content
       FROM chat_messages m
       INNER JOIN projects p ON p.id = m.project_id
       INNER JOIN users u ON u.id = p.user_id
       WHERE u.user_uuid = ?
         AND p.project_uuid = ?
         AND m.role = 'user'
       ORDER BY m.created_at DESC
       LIMIT ?`,
      [userUuid, projectUuid, limit]
    );

    return rows.map((row) => row.content).reverse();
  }

  public async saveDeckSpec(
    userUuid: string,
    projectUuid: string,
    input: {
      deckUuid: string;
      deckTitle: string;
      audience: string;
      tone: string;
      slides: Array<{
        slideUuid: string;
        order: number;
        title: string;
        bullets: string[];
        speakerNotes: string;
        imagePrompt: string;
        imageAssetKey: string;
      }>;
    }
  ): Promise<void> {
    const conn = await getDbPool().getConnection();

    try {
      await conn.beginTransaction();

      const [projectRows] = await conn.query<RowDataPacket[]>(
        `SELECT p.id
         FROM projects p
         INNER JOIN users u ON u.id = p.user_id
         WHERE u.user_uuid = ? AND p.project_uuid = ?
         LIMIT 1`,
        [userUuid, projectUuid]
      );

      const projectId = Number(projectRows[0]?.id || 0);
      if (!projectId) {
        throw new Error('project not found for deck save');
      }

      const [existingDeckRows] = await conn.query<RowDataPacket[]>(
        `SELECT id, deck_uuid
         FROM decks
         WHERE project_id = ?
         ORDER BY updated_at DESC
         LIMIT 1`,
        [projectId]
      );

      let deckId = 0;

      if (existingDeckRows[0]?.id) {
        deckId = Number(existingDeckRows[0].id);

        await conn.execute(
          `UPDATE decks
           SET deck_title = ?,
               audience = ?,
               tone = ?,
               updated_at = CURRENT_TIMESTAMP(3)
           WHERE id = ?`,
          [input.deckTitle, input.audience, input.tone, deckId]
        );
      } else {
        const [insertDeckResult] = await conn.execute<ResultSetHeader>(
          `INSERT INTO decks (deck_uuid, project_id, deck_title, audience, tone, version_no)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [input.deckUuid, projectId, input.deckTitle, input.audience, input.tone]
        );

        deckId = Number(insertDeckResult.insertId || 0);
      }

      if (!deckId) {
        throw new Error('deck id not found');
      }

      await conn.execute('DELETE FROM deck_slides WHERE deck_id = ?', [deckId]);

      for (const slide of input.slides) {
        await conn.execute(
          `INSERT INTO deck_slides (
             slide_uuid,
             deck_id,
             slide_order,
             title,
             bullets_json,
             speaker_notes,
             image_prompt,
             image_asset_key
           )
           VALUES (?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?)`,
          [
            slide.slideUuid,
            deckId,
            slide.order,
            slide.title,
            JSON.stringify(slide.bullets),
            slide.speakerNotes,
            slide.imagePrompt,
            slide.imageAssetKey || null
          ]
        );
      }

      await conn.execute(
        `UPDATE projects
         SET deck_title = ?, audience = ?, tone = ?, updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ?`,
        [input.deckTitle, input.audience, input.tone, projectId]
      );

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  public async getDeckByProject(
    userUuid: string,
    projectUuid: string
  ): Promise<
    | {
        deckUuid: string;
        deckTitle: string;
        audience: string;
        tone: string;
        slides: Array<{
          slideUuid: string;
          order: number;
          title: string;
          bullets: string[];
          speakerNotes: string;
          imagePrompt: string;
          imageAssetKey: string;
        }>;
      }
    | undefined
  > {
    const deckRow = await one<DeckRow>(
      `SELECT
         d.id AS deck_id,
         d.deck_uuid,
         d.deck_title,
         d.audience,
         d.tone,
         d.version_no
       FROM decks d
       INNER JOIN projects p ON p.id = d.project_id
       INNER JOIN users u ON u.id = p.user_id
       WHERE u.user_uuid = ? AND p.project_uuid = ?
       ORDER BY d.updated_at DESC
       LIMIT 1`,
      [userUuid, projectUuid]
    );

    if (!deckRow) return undefined;

    const slideRows = await queryRows<DeckSlideRow>(
      `SELECT
         slide_uuid,
         slide_order,
         title,
         bullets_json,
         speaker_notes,
         image_prompt,
         image_asset_key
       FROM deck_slides
       WHERE deck_id = ?
       ORDER BY slide_order ASC`,
      [deckRow.deck_id]
    );

    return {
      deckUuid: deckRow.deck_uuid,
      deckTitle: deckRow.deck_title,
      audience: deckRow.audience,
      tone: deckRow.tone,
      slides: slideRows.map((row) => ({
        slideUuid: row.slide_uuid,
        order: row.slide_order,
        title: row.title,
        bullets: parseJsonArray(row.bullets_json),
        speakerNotes: row.speaker_notes,
        imagePrompt: row.image_prompt,
        imageAssetKey: row.image_asset_key || ''
      }))
    };
  }

  public async getSlideByUuid(
    slideUuid: string
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
    const row = await one<{
      slide_uuid: string;
      project_uuid: string;
      title: string;
      bullets_json: unknown;
      speaker_notes: string;
      image_prompt: string;
      image_asset_key: string | null;
    }>(
      `SELECT
         ds.slide_uuid,
         p.project_uuid,
         ds.title,
         ds.bullets_json,
         ds.speaker_notes,
         ds.image_prompt,
         ds.image_asset_key
       FROM deck_slides ds
       INNER JOIN decks d ON d.id = ds.deck_id
       INNER JOIN projects p ON p.id = d.project_id
       WHERE ds.slide_uuid = ?
       LIMIT 1`,
      [slideUuid]
    );

    if (!row) return undefined;

    return {
      slideUuid: row.slide_uuid,
      projectUuid: row.project_uuid,
      title: row.title,
      bullets: parseJsonArray(row.bullets_json),
      speakerNotes: row.speaker_notes,
      imagePrompt: row.image_prompt,
      imageAssetKey: row.image_asset_key || ''
    };
  }

  public async updateSlide(
    userUuid: string,
    projectUuid: string,
    slideUuid: string,
    payload: Partial<{
      title: string;
      bullets: string[];
      speakerNotes: string;
      imagePrompt: string;
      imageAssetKey: string;
    }>
  ): Promise<boolean> {
    const existing = await one<{
      ds_id: number;
      title: string;
      bullets_json: unknown;
      speaker_notes: string;
      image_prompt: string;
      image_asset_key: string | null;
    }>(
      `SELECT
         ds.id AS ds_id,
         ds.title,
         ds.bullets_json,
         ds.speaker_notes,
         ds.image_prompt,
         ds.image_asset_key
       FROM deck_slides ds
       INNER JOIN decks d ON d.id = ds.deck_id
       INNER JOIN projects p ON p.id = d.project_id
       INNER JOIN users u ON u.id = p.user_id
       WHERE u.user_uuid = ?
         AND p.project_uuid = ?
         AND ds.slide_uuid = ?
       LIMIT 1`,
      [userUuid, projectUuid, slideUuid]
    );

    if (!existing) {
      return false;
    }

    const nextTitle = payload.title ?? String(existing.title);
    const nextBullets = payload.bullets ?? parseJsonArray(existing.bullets_json);
    const nextSpeakerNotes = payload.speakerNotes ?? String(existing.speaker_notes);
    const nextImagePrompt = payload.imagePrompt ?? String(existing.image_prompt);
    const nextImageAssetKey = payload.imageAssetKey ?? (existing.image_asset_key || '');

    await executeSql(
      `UPDATE deck_slides
       SET title = ?,
           bullets_json = CAST(? AS JSON),
           speaker_notes = ?,
           image_prompt = ?,
           image_asset_key = ?,
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE slide_uuid = ?`,
      [
        nextTitle,
        JSON.stringify(nextBullets),
        nextSpeakerNotes,
        nextImagePrompt,
        nextImageAssetKey || null,
        slideUuid
      ]
    );

    return true;
  }

  public async updateSlideImageAssetBySlideUuid(
    slideUuid: string,
    imageAssetKey: string
  ): Promise<void> {
    await executeSql(
      `UPDATE deck_slides
       SET image_asset_key = ?,
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE slide_uuid = ?`,
      [imageAssetKey, slideUuid]
    );
  }

  public async createExport(
    userUuid: string,
    projectUuid: string,
    exportUuid: string,
    format: 'pptx' | 'pdf',
    fileKey: string,
    downloadUrl: string
  ): Promise<void> {
    const result = await executeSql(
      `INSERT INTO exports (export_uuid, project_id, format, file_key, download_url)
       SELECT ?, p.id, ?, ?, ?
       FROM projects p
       INNER JOIN users u ON u.id = p.user_id
       WHERE p.project_uuid = ? AND u.user_uuid = ?`,
      [exportUuid, format, fileKey, downloadUrl, projectUuid, userUuid]
    );

    if (result.affectedRows === 0) {
      throw new Error('project not found when create export');
    }
  }

  public async listExportsByProject(userUuid: string, projectUuid: string): Promise<ExportRow[]> {
    return queryRows<ExportRow>(
      `SELECT
         e.export_uuid,
         p.project_uuid,
         e.format,
         e.file_key,
         e.download_url,
         e.created_at
       FROM exports e
       INNER JOIN projects p ON p.id = e.project_id
       INNER JOIN users u ON u.id = p.user_id
       WHERE u.user_uuid = ? AND p.project_uuid = ?
       ORDER BY e.created_at DESC`,
      [userUuid, projectUuid]
    );
  }
}

export const projectRepository = new ProjectRepository();
