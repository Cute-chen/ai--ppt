import { Request, Response } from 'express';
import { created, ok } from '../../common/http/response';
import { AppError } from '../../common/errors/app-error';
import { storageService } from '../../config/storage';
import { jobService } from '../../services/job.service';
import { projectService } from '../../services/project.service';

const pickObjectKeyParam = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join('/');
  return '';
};

const assertUploadObjectKey = (value: string): string => {
  const objectKey = value.trim();
  if (!objectKey) {
    throw new AppError('objectKey is required', 400);
  }
  if (!objectKey.startsWith('uploads/')) {
    throw new AppError('objectKey is invalid', 400);
  }
  return objectKey;
};

export const createUploadPresign = async (req: Request, res: Response): Promise<void> => {
  const { filename, contentType } = req.body as { filename?: string; contentType?: string };
  const data = await storageService.createPresignedUpload({
    filename: filename || 'file.bin',
    contentType: contentType || 'application/octet-stream'
  });

  created(res, data, 'presign created');
};

export const directUploadObject = async (req: Request, res: Response): Promise<void> => {
  const objectKey = assertUploadObjectKey(pickObjectKeyParam(req.params.objectKey));
  const rawBody = req.body;

  if (!Buffer.isBuffer(rawBody)) {
    throw new AppError('upload body must be binary', 400);
  }

  await storageService.writeObjectBuffer(objectKey, rawBody);

  ok(
    res,
    {
      objectKey,
      size: rawBody.length
    },
    'upload stored'
  );
};

export const completeSourceUpload = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const body = req.body as {
    filename: string;
    objectKey: string;
    mimeType: string;
    size: number;
  };

  if (!body.filename?.trim()) {
    throw new AppError('filename is required', 400);
  }

  if (!body.mimeType?.trim()) {
    throw new AppError('mimeType is required', 400);
  }

  const objectKey = assertUploadObjectKey(body.objectKey || '');

  const size = Number(body.size);
  if (!Number.isFinite(size) || size < 0) {
    throw new AppError('size must be a non-negative number', 400);
  }

  const source = await projectService.createSource(userId, projectId, {
    filename: body.filename.trim(),
    objectKey,
    mimeType: body.mimeType.trim(),
    size,
    status: 'parsing'
  });

  const job = await jobService.enqueueJob(userId, 'source-parse', {
    userId,
    projectId,
    sourceId: source.id,
    objectKey,
    filename: body.filename.trim()
  });

  created(
    res,
    {
      source,
      job
    },
    'source accepted'
  );
};

export const listProjectSources = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const data = await projectService.listSources(userId, projectId);
  ok(res, data);
};

export const removeProjectSource = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const sourceId = String(req.params.sourceId || '');

  const removed = await projectService.deleteSource(userId, projectId, sourceId);
  await storageService.deleteObjectIfExists(removed.objectKey);

  ok(res, { id: sourceId, deleted: true }, 'source removed');
};

export const reparseProjectSource = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const sourceId = String(req.params.sourceId || '');

  const source = await projectService.getSourceForUser(userId, projectId, sourceId);
  if (!source) {
    throw new AppError('source not found', 404);
  }

  await projectService.updateSourceStatus(userId, projectId, sourceId, 'parsing');

  const job = await jobService.enqueueJob(userId, 'source-parse', {
    userId,
    projectId,
    sourceId
  });

  created(res, { job }, 'source reparse queued');
};
