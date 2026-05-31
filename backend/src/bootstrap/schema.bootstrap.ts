import { executeSql } from '../common/db/sql';

const isDuplicateColumnError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const anyErr = error as Error & { code?: string; message: string };
  return anyErr.code === 'ER_DUP_FIELDNAME' || /Duplicate column name/i.test(anyErr.message);
};

export const bootstrapSchema = async (): Promise<void> => {
  try {
    await executeSql(
      `ALTER TABLE projects
       ADD COLUMN custom_style VARCHAR(300) NULL AFTER project_brief`
    );
    console.log('[schema] added projects.custom_style');
  } catch (error) {
    if (!isDuplicateColumnError(error)) {
      throw error;
    }
  }

  try {
    await executeSql(
      `ALTER TABLE user_model_configs
       MODIFY COLUMN analysis_provider VARCHAR(16) NOT NULL`
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[schema] skip alter user_model_configs.analysis_provider: ${msg}`);
  }

  try {
    await executeSql(
      `ALTER TABLE jobs
       MODIFY COLUMN status ENUM('queued','running','succeeded','failed','canceled')
       NOT NULL DEFAULT 'queued'`
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[schema] skip alter jobs.status enum: ${msg}`);
  }

  // Migrate legacy provider values to the new naming used by frontend/backend.
  try {
    await executeSql(
      `UPDATE user_model_configs
       SET analysis_provider = CASE
         WHEN analysis_provider = 'gpt' THEN 'openai'
         WHEN analysis_provider = 'claude' THEN 'anthropic'
         ELSE analysis_provider
       END
       WHERE analysis_provider IN ('gpt', 'claude')`
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[schema] skip provider value migration: ${msg}`);
  }
};
