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
};
