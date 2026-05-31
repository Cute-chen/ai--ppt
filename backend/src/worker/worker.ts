import { Worker } from 'bullmq';
import { JobType } from '../common/types/job';
import { queueConnection } from '../config/queue';
import { jobService } from '../services/job.service';
import { handleJobByType } from './job-handlers';

const QUEUE_NAME = 'ai-ppt-jobs';

export const createAppWorker = (): Worker => {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const payload = job.data as {
        localJobId: string;
        type: JobType;
        payload: Record<string, unknown>;
      };

      const started = await jobService.startJob(payload.localJobId, 20);
      if (!started) {
        return {
          skipped: true,
          reason: 'job status is not queued'
        };
      }

      const result = await handleJobByType(payload);

      await jobService.updateStatus(payload.localJobId, 'succeeded', 100, undefined, result);

      return result;
    },
    {
      connection: queueConnection
    }
  );

  worker.on('failed', async (job, err) => {
    const localJobId = (job?.data?.localJobId as string) || '';
    if (localJobId) {
      await jobService.updateStatus(localJobId, 'failed', 100, err.message);
    }
  });

  return worker;
};
