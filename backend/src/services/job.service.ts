import { Queue } from 'bullmq';
import { AppError } from '../common/errors/app-error';
import { JobEvent, JobRecord, JobStatus, JobType } from '../common/types/job';
import { newId } from '../common/utils/id';
import { env } from '../config/env';
import { queueConnection } from '../config/queue';
import { jobRepository } from '../repositories/job.repository';
import { handleJobByType } from '../worker/job-handlers';

const QUEUE_NAME = 'ai-ppt-jobs';

let queue: Queue | null = null;

const getQueue = (): Queue => {
  if (queue) return queue;

  queue = new Queue(QUEUE_NAME, {
    connection: queueConnection,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 1000
      },
      removeOnComplete: 100,
      removeOnFail: 100
    }
  });

  return queue;
};

const hasActiveQueueWorkers = async (q: Queue): Promise<boolean> => {
  try {
    const workers = await q.getWorkers();
    return workers.length > 0;
  } catch {
    // 查询 worker 失败时不阻塞正常入队流程，交由后续入队异常兜底。
    return true;
  }
};

const normalizeProjectUuid = (payload: Record<string, unknown>): string | undefined => {
  const fromProjectId = payload.projectId;
  if (typeof fromProjectId === 'string' && fromProjectId) return fromProjectId;
  return undefined;
};

/**
 * Run a job directly in the current process (no queue).
 * Used as fallback when Redis is unavailable or queue add times out.
 */
const runJobInProcess = (localJobId: string, type: JobType, payload: Record<string, unknown>): void => {
  void (async () => {
    try {
      const started = await jobService.startJob(localJobId, 20);
      if (!started) {
        return;
      }
      const result = await handleJobByType({ localJobId, type, payload });
      await jobService.updateStatus(localJobId, 'succeeded', 100, undefined, result as Record<string, unknown>);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'in-process job failed';
      await jobService.updateStatus(localJobId, 'failed', 100, msg);
    }
  })();
};

export class JobService {
  public async enqueueJob(
    userId: string,
    type: JobType,
    payload: Record<string, unknown>
  ): Promise<JobRecord> {
    const localJobId = newId();

    await jobRepository.createJob({
      jobUuid: localJobId,
      userUuid: userId,
      projectUuid: normalizeProjectUuid(payload),
      jobType: type,
      payload
    });

    await this.addEvent(localJobId, 'queued', `${type} queued`);

    if (!env.queue.enabled) {
      // Queue disabled — run directly in this process
      runJobInProcess(localJobId, type, payload);

      const row = await jobRepository.getJobByUuid(localJobId);
      if (!row) {
        throw new AppError('job not found after enqueue', 500);
      }

      return jobRepository.mapJobRow(row);
    }

    const q = getQueue();

    // queue 开启但没有任何 worker 时，避免任务永久停留在 queued。
    if (!(await hasActiveQueueWorkers(q))) {
      await this.addEvent(localJobId, 'queued', 'queue has no active worker, running in-process');
      runJobInProcess(localJobId, type, payload);

      const row = await jobRepository.getJobByUuid(localJobId);
      if (!row) {
        throw new AppError('job not found after enqueue', 500);
      }

      return jobRepository.mapJobRow(row);
    }

    try {
      await Promise.race([
        q.add(
          type,
          {
            localJobId,
            type,
            payload
          },
          {
            jobId: localJobId
          }
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('queue add timeout')), env.queue.addTimeoutMs)
        )
      ]);
    } catch (error) {
      // Queue unavailable or timed out — fall back to in-process execution
      const errMsg = error instanceof Error ? error.message : 'unknown queue error';
      await this.addEvent(localJobId, 'queued', `queue unavailable (${errMsg}), running in-process`);
      runJobInProcess(localJobId, type, payload);
    }

    const row = await jobRepository.getJobByUuid(localJobId);
    if (!row) {
      throw new AppError('job not found after enqueue', 500);
    }

    return jobRepository.mapJobRow(row);
  }

  public async getJob(jobId: string, userId: string): Promise<JobRecord | undefined> {
    const row = await jobRepository.getJobByUser(jobId, userId);
    if (!row) return undefined;
    return jobRepository.mapJobRow(row);
  }

  public async getJobById(jobId: string): Promise<JobRecord | undefined> {
    const row = await jobRepository.getJobByUuid(jobId);
    if (!row) return undefined;
    return jobRepository.mapJobRow(row);
  }

  public async getEvents(jobId: string, userId: string): Promise<JobEvent[]> {
    const rows = await jobRepository.listEventsByUser(jobId, userId);
    return rows.map((row) => ({
      id: row.event_uuid,
      jobId,
      event: row.event_name,
      message: row.message,
      timestamp: new Date(row.created_at).toISOString()
    }));
  }

  public async listJobs(
    userId: string,
    query: {
      projectId?: string;
      status?: JobStatus;
      type?: JobType;
      page: number;
      pageSize: number;
    }
  ): Promise<{
    items: JobRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const offset = (query.page - 1) * query.pageSize;
    const listed = await jobRepository.listJobsByUser({
      userUuid: userId,
      projectUuid: query.projectId,
      status: query.status,
      jobType: query.type,
      offset,
      limit: query.pageSize
    });

    return {
      items: listed.rows.map((row) => jobRepository.mapJobRow(row)),
      total: listed.total,
      page: query.page,
      pageSize: query.pageSize
    };
  }

  public async findLatestJob(
    userId: string,
    projectId: string,
    type: JobType
  ): Promise<JobRecord | undefined> {
    const row = await jobRepository.findLatestByType(userId, projectId, type);
    if (!row) return undefined;
    return jobRepository.mapJobRow(row);
  }

  public async retryJob(jobId: string, userId: string): Promise<JobRecord> {
    const job = await this.getJob(jobId, userId);
    if (!job) {
      throw new AppError('job not found', 404);
    }

    if (job.status !== 'failed') {
      throw new AppError('only failed jobs can be retried', 400);
    }

    const payload: Record<string, unknown> = {
      ...job.payload,
      userId
    };

    const retried = await this.enqueueJob(userId, job.type, payload);
    await this.addEvent(jobId, 'retried', `retry queued as ${retried.id}`);
    return retried;
  }

  public async startJob(jobId: string, progress = 20): Promise<boolean> {
    return jobRepository.updateJobStatusIfCurrent({
      jobUuid: jobId,
      expectedStatus: 'queued',
      status: 'running',
      progress
    });
  }

  public async cancelJob(jobId: string, userId: string): Promise<JobRecord> {
    const job = await this.getJob(jobId, userId);
    if (!job) {
      throw new AppError('job not found', 404);
    }

    const moved = await jobRepository.updateJobStatusIfCurrent({
      jobUuid: jobId,
      expectedStatus: 'queued',
      status: 'canceled',
      progress: job.progress
    });

    if (!moved) {
      throw new AppError('only queued jobs can be canceled', 409);
    }

    await this.addEvent(jobId, 'canceled', 'job canceled by user');

    if (env.queue.enabled) {
      try {
        await getQueue().remove(jobId);
      } catch {
        // best effort only
      }
    }

    const canceled = await this.getJob(jobId, userId);
    if (!canceled) {
      throw new AppError('job not found after cancel', 500);
    }
    return canceled;
  }

  public async deleteJob(jobId: string, userId: string): Promise<void> {
    const job = await this.getJob(jobId, userId);
    if (!job) {
      throw new AppError('job not found', 404);
    }

    if (job.status !== 'succeeded' && job.status !== 'failed' && job.status !== 'canceled') {
      throw new AppError('only terminal jobs can be deleted', 409);
    }

    const removed = await jobRepository.deleteJobByUser(jobId, userId);
    if (!removed.deleted) {
      throw new AppError('job not found', 404);
    }
  }

  public async updateStatus(
    jobId: string,
    status: JobStatus,
    progress: number,
    errorMessage?: string,
    result?: Record<string, unknown>
  ): Promise<void> {
    await jobRepository.updateJobStatus({
      jobUuid: jobId,
      status,
      progress,
      errorMessage,
      result
    });

    if (status !== 'running') {
      await this.addEvent(jobId, status, `job ${status}`);
    }
  }

  public async addEvent(jobId: string, event: string, message: string): Promise<JobEvent> {
    const eventId = newId();

    await jobRepository.addEvent({
      eventUuid: eventId,
      jobUuid: jobId,
      eventName: event,
      message
    });

    return {
      id: eventId,
      jobId,
      event,
      message,
      timestamp: new Date().toISOString()
    };
  }
}

export const jobService = new JobService();
