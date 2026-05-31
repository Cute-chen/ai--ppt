export type AppPage = 'projects' | 'workspace' | 'model-settings' | 'jobs'

export type SourceStatus = 'parsing' | 'success' | 'failed'
export type JobType =
  | 'source-parse'
  | 'deck-plan'
  | 'deck-generate'
  | 'slide-regenerate'
  | 'deck-export'
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export type SourceItem = {
  id: string
  name: string
  ext: string
  status: SourceStatus
  chunks: number
  updatedAt: string
  projectName?: string
  sourceGuide: string
  parsePreview: string
}

export type JobItem = {
  id: string
  type: JobType
  projectName: string
  status: JobStatus
  progress: number
  reason?: string
  retryable: boolean
  createdAt: string
}

export type ProjectStatus = 'draft' | 'generating' | 'ready'

export type ProjectItem = {
  id: string
  name: string
  slideCount: number
  status: ProjectStatus
  updatedAt: string
}

export type SlideImageState = 'queued' | 'done' | 'failed'

export type SlideItem = {
  id: string
  title: string
  bullets: string[]
  imageState: SlideImageState
}

export type AnalysisProvider = 'openai' | 'anthropic'

export type AnalysisModelConfig = {
  provider: AnalysisProvider
  baseUrl: string
  apiKey: string
  model: string
}

export type ImageModelConfig = {
  _type: 'newapi_channel_conn'
  url: string
  key: string
  model: string
}

export type PromptPreset = {
  id: string
  text: string
}

export type StyleCategory = 'tech' | 'business' | 'creative' | 'education' | 'health' | 'general'

export type StyleTemplate = {
  id: string
  name: string
  description: string
  scene: string
  tags: string[]
  category: StyleCategory
  previewUrl: string
  hasPreview: boolean
  filePath: string
}

export type DeckSlideDTO = {
  id: string
  title: string
  bullets: string[]
  speakerNotes: string
  imagePrompt: string
  imageAssetKey: string
  order: number
}

export type DeckDTO = {
  deckTitle: string
  audience: string
  tone: string
  slides: DeckSlideDTO[]
}

export type ProjectDTO = {
  id: string
  userId: string
  name: string
  projectBrief: string
  customStyle?: string
  deckSpec?: DeckDTO
  createdAt: string
  updatedAt: string
}

export type SourceDTO = {
  id: string
  projectId: string
  filename: string
  objectKey: string
  mimeType: string
  size: number
  status: SourceStatus
  parseSummary?: string
  chunkCount: number
  createdAt: string
  updatedAt: string
}

export type ProjectAnalysisSummaryDTO = {
  state: 'empty' | 'parsing' | 'partial' | 'ready' | 'failed'
  counts: {
    total: number
    success: number
    parsing: number
    failed: number
  }
  summary: string
  highlights: string[]
  nextAction: string
  updatedAt: string
}

export type ChatMessageDTO = {
  id: string
  projectId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

export type JobDTO = {
  id: string
  type: JobType
  status: JobStatus
  progress: number
  errorMessage?: string
  payload: Record<string, unknown>
  result?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type JobEventDTO = {
  id: string
  jobId: string
  event: string
  message: string
  timestamp: string
}

export type ExportDTO = {
  id: string
  projectId: string
  format: 'pptx' | 'pdf'
  fileKey: string
  downloadUrl: string
  createdAt: string
}
