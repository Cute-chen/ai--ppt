export type JobType =
  | 'source-parse'
  | 'deck-plan'
  | 'deck-generate'
  | 'slide-regenerate'
  | 'deck-export';

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type JobRecord = {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  errorMessage?: string;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type JobEvent = {
  id: string;
  jobId: string;
  event: string;
  message: string;
  timestamp: string;
};

export type JobDTO = JobRecord;
export type JobEventDTO = JobEvent;
