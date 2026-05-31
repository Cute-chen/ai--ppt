import { executeSql, one, queryRows } from '../common/db/sql';
import { JobStatus, JobType } from '../common/types/job';

type JobRow = {
  job_uuid: string;
  job_type: JobType;
  status: JobStatus;
  progress: number;
  payload_json: unknown;
  result_json: unknown;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
};

type JobEventRow = {
  event_uuid: string;
  event_name: string;
  message: string;
  created_at: Date;
};

type JobCountRow = {
  total: number | string;
};

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback;

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return value as T;
};

export class JobRepository {
  public async createJob(input: {
    jobUuid: string;
    userUuid: string;
    projectUuid?: string;
    jobType: JobType;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const result = await executeSql(
      `INSERT INTO jobs (
         job_uuid,
         user_id,
         project_id,
         job_type,
         status,
         progress,
         payload_json
       )
       SELECT
         ?,
         u.id,
         p.id,
         ?,
         'queued',
         0,
         CAST(? AS JSON)
       FROM users u
       LEFT JOIN projects p ON p.project_uuid = ?
       WHERE u.user_uuid = ?`,
      [
        input.jobUuid,
        input.jobType,
        JSON.stringify(input.payload),
        input.projectUuid || null,
        input.userUuid
      ]
    );

    if (result.affectedRows === 0) {
      throw new Error('user not found when create job');
    }
  }

  public async updateJobStatus(input: {
    jobUuid: string;
    status: JobStatus;
    progress: number;
    errorMessage?: string;
    result?: Record<string, unknown>;
  }): Promise<void> {
    await executeSql(
      `UPDATE jobs
       SET status = ?,
           progress = ?,
           error_message = ?,
           result_json = ?,
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE job_uuid = ?`,
      [
        input.status,
        input.progress,
        input.errorMessage || null,
        input.result ? JSON.stringify(input.result) : null,
        input.jobUuid
      ]
    );
  }

  public async getJobByUser(jobUuid: string, userUuid: string): Promise<JobRow | undefined> {
    return one<JobRow>(
      `SELECT
         j.job_uuid,
         j.job_type,
         j.status,
         j.progress,
         j.payload_json,
         j.result_json,
         j.error_message,
         j.created_at,
         j.updated_at
       FROM jobs j
       INNER JOIN users u ON u.id = j.user_id
       WHERE j.job_uuid = ? AND u.user_uuid = ?
       LIMIT 1`,
      [jobUuid, userUuid]
    );
  }

  public async getJobByUuid(jobUuid: string): Promise<JobRow | undefined> {
    return one<JobRow>(
      `SELECT
         job_uuid,
         job_type,
         status,
         progress,
         payload_json,
         result_json,
         error_message,
         created_at,
         updated_at
       FROM jobs
       WHERE job_uuid = ?
       LIMIT 1`,
      [jobUuid]
    );
  }

  public async findLatestByType(
    userUuid: string,
    projectUuid: string,
    jobType: JobType
  ): Promise<JobRow | undefined> {
    return one<JobRow>(
      `SELECT
         j.job_uuid,
         j.job_type,
         j.status,
         j.progress,
         j.payload_json,
         j.result_json,
         j.error_message,
         j.created_at,
         j.updated_at
       FROM jobs j
       INNER JOIN users u ON u.id = j.user_id
       INNER JOIN projects p ON p.id = j.project_id
       WHERE u.user_uuid = ?
         AND p.project_uuid = ?
         AND j.job_type = ?
       ORDER BY j.created_at DESC
       LIMIT 1`,
      [userUuid, projectUuid, jobType]
    );
  }

  public async listJobsByUser(input: {
    userUuid: string;
    projectUuid?: string;
    status?: JobStatus;
    jobType?: JobType;
    offset: number;
    limit: number;
  }): Promise<{ rows: JobRow[]; total: number }> {
    const whereClauses = ['u.user_uuid = ?'];
    const whereParams: Array<string | number> = [input.userUuid];

    if (input.projectUuid) {
      whereClauses.push('p.project_uuid = ?');
      whereParams.push(input.projectUuid);
    }

    if (input.status) {
      whereClauses.push('j.status = ?');
      whereParams.push(input.status);
    }

    if (input.jobType) {
      whereClauses.push('j.job_type = ?');
      whereParams.push(input.jobType);
    }

    const whereSql = whereClauses.join(' AND ');

    const rows = await queryRows<JobRow>(
      `SELECT
         j.job_uuid,
         j.job_type,
         j.status,
         j.progress,
         j.payload_json,
         j.result_json,
         j.error_message,
         j.created_at,
         j.updated_at
       FROM jobs j
       INNER JOIN users u ON u.id = j.user_id
       LEFT JOIN projects p ON p.id = j.project_id
       WHERE ${whereSql}
       ORDER BY j.created_at DESC
       LIMIT ?
       OFFSET ?`,
      [...whereParams, input.limit, input.offset]
    );

    const countRow = await one<JobCountRow>(
      `SELECT COUNT(*) AS total
       FROM jobs j
       INNER JOIN users u ON u.id = j.user_id
       LEFT JOIN projects p ON p.id = j.project_id
       WHERE ${whereSql}`,
      whereParams
    );

    return {
      rows,
      total: Number(countRow?.total || 0)
    };
  }

  public async addEvent(input: {
    eventUuid: string;
    jobUuid: string;
    eventName: string;
    message: string;
  }): Promise<void> {
    const result = await executeSql(
      `INSERT INTO job_events (event_uuid, job_id, event_name, message)
       SELECT ?, j.id, ?, ?
       FROM jobs j
       WHERE j.job_uuid = ?`,
      [input.eventUuid, input.eventName, input.message, input.jobUuid]
    );

    if (result.affectedRows === 0) {
      throw new Error('job not found when add event');
    }
  }

  public async listEventsByUser(jobUuid: string, userUuid: string): Promise<JobEventRow[]> {
    return queryRows<JobEventRow>(
      `SELECT
         e.event_uuid,
         e.event_name,
         e.message,
         e.created_at
       FROM job_events e
       INNER JOIN jobs j ON j.id = e.job_id
       INNER JOIN users u ON u.id = j.user_id
       WHERE j.job_uuid = ? AND u.user_uuid = ?
       ORDER BY e.created_at ASC`,
      [jobUuid, userUuid]
    );
  }

  public mapJobRow(row: JobRow): {
    id: string;
    type: JobType;
    status: JobStatus;
    progress: number;
    errorMessage?: string;
    payload: Record<string, unknown>;
    result?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  } {
    return {
      id: row.job_uuid,
      type: row.job_type,
      status: row.status,
      progress: Number(row.progress),
      errorMessage: row.error_message || undefined,
      payload: parseJson<Record<string, unknown>>(row.payload_json, {}),
      result: row.result_json
        ? parseJson<Record<string, unknown>>(row.result_json, {})
        : undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString()
    };
  }
}

export const jobRepository = new JobRepository();
