import { AppError } from '../common/errors/app-error';
import { ExportRecord } from '../common/types/project';
import { newId } from '../common/utils/id';
import { storageService } from '../config/storage';
import { projectRepository } from '../repositories/project.repository';

export class ExportService {
  public async createExport(
    userId: string,
    projectId: string,
    format: 'pptx' | 'pdf'
  ): Promise<ExportRecord> {
    const exportUuid = newId();
    const fileKey = `exports/${projectId}/${Date.now()}.${format}`;
    const downloadUrl = storageService.createDownloadUrl(fileKey);

    await projectRepository.createExport(
      userId,
      projectId,
      exportUuid,
      format,
      fileKey,
      downloadUrl
    );

    const records = await this.listExports(userId, projectId);
    const item = records.find((it) => it.id === exportUuid);
    if (!item) {
      throw new AppError('export create failed', 500);
    }

    return item;
  }

  public async createExportWithFile(
    userId: string,
    projectId: string,
    format: 'pptx' | 'pdf',
    fileBuffer: Buffer
  ): Promise<ExportRecord> {
    const file = await this.createExport(userId, projectId, format);
    await storageService.writeObjectBuffer(file.fileKey, fileBuffer);
    return file;
  }

  public async listExports(userId: string, projectId: string): Promise<ExportRecord[]> {
    const rows = await projectRepository.listExportsByProject(userId, projectId);
    return rows.map((row) => ({
      id: row.export_uuid,
      projectId: row.project_uuid,
      format: row.format,
      fileKey: row.file_key,
      downloadUrl: row.download_url,
      createdAt: new Date(row.created_at).toISOString()
    }));
  }
}

export const exportService = new ExportService();
