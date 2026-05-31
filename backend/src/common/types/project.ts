import { DeckSpec } from './deck';

export type ProjectRecord = {
  id: string;
  userId: string;
  name: string;
  projectBrief: string;
  customStyle?: string;
  deckSpec?: DeckSpec;
  createdAt: string;
  updatedAt: string;
};

export type SourceStatus = 'parsing' | 'success' | 'failed';

export type SourceRecord = {
  id: string;
  projectId: string;
  filename: string;
  objectKey: string;
  mimeType: string;
  size: number;
  status: SourceStatus;
  parseSummary?: string;
  parsePreview?: string;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectAnalysisSummary = {
  state: 'empty' | 'parsing' | 'partial' | 'ready' | 'failed';
  counts: {
    total: number;
    success: number;
    parsing: number;
    failed: number;
  };
  summary: string;
  highlights: string[];
  nextAction: string;
  updatedAt: string;
};

export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessageRecord = {
  id: string;
  projectId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type ExportRecord = {
  id: string;
  projectId: string;
  format: 'pptx' | 'pdf';
  fileKey: string;
  downloadUrl: string;
  createdAt: string;
};

export type ProjectDTO = ProjectRecord;
export type SourceDTO = SourceRecord;
export type ChatMessageDTO = ChatMessageRecord;
export type ExportDTO = ExportRecord;
