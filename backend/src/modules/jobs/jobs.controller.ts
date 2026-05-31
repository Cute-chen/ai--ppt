import { Request, Response } from 'express';
import { ok } from '../../common/http/response';
import { AppError } from '../../common/errors/app-error';
import { jobService } from '../../services/job.service';
import { JobStatus, JobType } from '../../common/types/job';

const ALLOWED_JOB_STATUS: JobStatus[] = ['queued', 'running', 'succeeded', 'failed', 'canceled'];
const ALLOWED_JOB_TYPE: JobType[] = [
  'source-parse',
  'deck-plan',
  'deck-generate',
  'slide-regenerate',
  'deck-export'
];

const pickSingleQueryString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
};

const parsePositiveInt = (
  raw: unknown,
  fieldName: string,
  fallback: number,
  max?: number
): number => {
  const text = pickSingleQueryString(raw);
  if (!text) return fallback;
  const value = Number.parseInt(text, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new AppError(`${fieldName} must be a positive integer`, 400);
  }
  return max ? Math.min(value, max) : value;
};

const parseOptionalEnum = <T extends string>(
  raw: unknown,
  fieldName: string,
  allowed: T[]
): T | undefined => {
  const value = pickSingleQueryString(raw);
  if (!value) return undefined;
  if (!allowed.includes(value as T)) {
    throw new AppError(`${fieldName} is invalid`, 400);
  }
  return value as T;
};

export const getJobs = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;

  const page = parsePositiveInt(req.query.page, 'page', 1);
  const pageSize = parsePositiveInt(req.query.pageSize, 'pageSize', 20, 100);
  const projectId = pickSingleQueryString(req.query.projectId);
  const status = parseOptionalEnum<JobStatus>(req.query.status, 'status', ALLOWED_JOB_STATUS);
  const type = parseOptionalEnum<JobType>(req.query.type, 'type', ALLOWED_JOB_TYPE);

  const data = await jobService.listJobs(userId, {
    projectId,
    status,
    type,
    page,
    pageSize
  });

  ok(res, data);
};

export const getJob = async (req: Request, res: Response): Promise<void> => {
  const jobId = String(req.params.jobId || '');
  const userId = req.userId!;
  const data = await jobService.getJob(jobId, userId);
  if (!data) {
    throw new AppError('job not found', 404);
  }
  ok(res, data);
};

export const getJobEvents = async (req: Request, res: Response): Promise<void> => {
  const jobId = String(req.params.jobId || '');
  const userId = req.userId!;
  const events = await jobService.getEvents(jobId, userId);
  ok(res, events);
};

export const retryJob = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const jobId = String(req.params.jobId || '');
  const job = await jobService.retryJob(jobId, userId);
  ok(res, { job }, 'job retry queued');
};

export const cancelJob = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const jobId = String(req.params.jobId || '');
  const job = await jobService.cancelJob(jobId, userId);
  ok(res, { job }, 'job canceled');
};

export const deleteJob = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const jobId = String(req.params.jobId || '');
  await jobService.deleteJob(jobId, userId);
  ok(res, { id: jobId, deleted: true }, 'job removed');
};
