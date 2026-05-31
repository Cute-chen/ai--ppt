import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  withApiBase,
} from '../lib/http'
import type {
  AnalysisModelConfig,
  AnalysisProvider,
  ChatMessageDTO,
  DeckDTO,
  ImageModelConfig,
  JobDTO,
  JobItem,
  JobStatus,
  ProjectAnalysisSummaryDTO,
  ProjectDTO,
  ProjectItem,
  ProjectStatus,
  PromptPreset,
  SlideItem,
  SourceDTO,
  SourceItem,
  SourceStatus,
  StyleTemplate,
} from '../types/app'

const promptPresets: PromptPreset[] = [
  { id: 'p1', text: '先基于已解析素材给我 10 页目录草案' },
  { id: 'p2', text: '提取 3 个核心结论和 2 个关键数据' },
  { id: 'p3', text: '压缩到 8 页，保留核心结论与风险页' },
  { id: 'p4', text: '重写第 3 页提示词，强调商业价值和落地收益' },
]

const acceptedFormats = [
  'pdf',
  'docx',
  'txt',
  'md',
  'json',
  'csv',
]

const ANALYSIS_PROVIDER_DEFAULTS: Record<AnalysisProvider, { baseUrl: string; model: string }> = {
  openai: {
    baseUrl: 'https://api.aicodemirror.com/api/codex/backend-api/codex/v1',
    model: 'gpt-5.5',
  },
  anthropic: {
    baseUrl: 'https://api.aicodemirror.com/api/claudecode',
    model: 'claude-sonnet-4-6',
  },
}

type CurrentUser = {
  id: string
  email: string
}

type LoginResponse = {
  accessToken: string
  user: CurrentUser
  issuedAt: string
}

type SendCodePurpose = 'register' | 'reset_password'

type JobsListResponse = {
  items: JobDTO[]
  total: number
  page: number
  pageSize: number
}

type UploadPresignResponse = {
  objectKey: string
  uploadUrl: string
  method: 'PUT'
  headers: Record<string, string>
  expiresIn: number
}

type UploadCompleteResponse = {
  source: SourceDTO
  job: JobDTO
}

type GenerateDeckResponse = {
  planJob: JobDTO
  job: JobDTO
}

type ExportStartResponse = {
  job: JobDTO
}

type ChatCreateResponse = {
  user: ChatMessageDTO
  assistant: ChatMessageDTO
}

type ModelConfigMaskedResponse = {
  analysis: {
    provider: 'gpt' | 'claude'
    baseUrl: string
    model: string
    apiKeyMasked: string
  }
  image: {
    _type: 'newapi_channel_conn'
    url: string
    model: 'gpt-image-2'
    keyMasked: string
  }
}

type ModelConfigValidateResponse = {
  analysis: { ok: boolean; message: string }
  image: { ok: boolean; message: string }
}

type SourceReparseResponse = {
  job: JobDTO
}

type JobRetryResponse = {
  job: JobDTO
}

type AppStoreValue = {
  isLoggedIn: boolean
  loginEmail: string
  loginPassword: string
  sessionKeep: boolean
  currentUser: CurrentUser | null
  projects: ProjectItem[]
  activeProjectId: string
  newProjectName: string
  projectModalOpen: boolean
  sources: SourceItem[]
  sourceFilters: SourceStatus[]
  jobs: JobItem[]
  showOnlyFailedJobs: boolean
  chatInput: string
  chatMessages: string[]
  slides: SlideItem[]
  selectedSlideId: string
  slideTone: 'business' | 'academic' | 'tech'
  selectedTemplateId: string
  selectedTemplateName: string
  isGeneratingDeck: boolean
  isExportingDeck: boolean
  analysisConfig: AnalysisModelConfig
  imageConfig: ImageModelConfig
  savingConfig: boolean
  configMessage: string
  selectedFileType: string
  projectCustomStyle: string
  projectAnalysisSummary: ProjectAnalysisSummaryDTO | null
  activeProject: ProjectItem | null
  selectedSlide: SlideItem | null
  displayedSources: SourceItem[]
  displayedJobs: JobItem[]
  acceptedFormats: string[]
  promptPresets: PromptPreset[]
  statusText: (status: SourceStatus | JobStatus | ProjectStatus) => string
  setLoginEmail: (value: string) => void
  setLoginPassword: (value: string) => void
  setSessionKeep: (value: boolean) => void
  setNewProjectName: (value: string) => void
  setProjectModalOpen: (value: boolean) => void
  setSourceFilters: (value: SourceStatus[]) => void
  setShowOnlyFailedJobs: (value: boolean) => void
  setChatInput: (value: string) => void
  setSelectedSlideId: (value: string) => void
  setSlideTone: (value: 'business' | 'academic' | 'tech') => void
  applyTemplateToActiveProject: (template: Pick<StyleTemplate, 'id' | 'name'>) => void
  setSelectedFileType: (value: string) => void
  setAnalysisConfig: (updater: (prev: AnalysisModelConfig) => AnalysisModelConfig) => void
  setImageConfig: (updater: (prev: ImageModelConfig) => ImageModelConfig) => void
  sendCode: (purpose: SendCodePurpose, emailOverride?: string) => Promise<void>
  login: () => Promise<boolean>
  loginWithCredentials: (emailRaw: string, passwordRaw: string) => Promise<boolean>
  refreshCurrentUser: () => Promise<void>
  logout: () => void
  createProject: () => Promise<void>
  openProject: (projectId: string) => void
  uploadSource: (file: File) => Promise<void>
  retrySource: (sourceId: string) => Promise<void>
  removeSource: (sourceId: string) => Promise<void>
  retryJob: (jobId: string) => Promise<void>
  sendChatMessage: () => Promise<void>
  generateDeck: () => Promise<void>
  regenerateSlideImage: (slideId: string) => Promise<void>
  updateSlideText: (slideId: string, text: string) => Promise<void>
  exportDeck: (format: 'pptx' | 'pdf') => Promise<void>
  saveProjectCustomStyle: (customStyle: string) => Promise<void>
  validateAndSaveConfig: () => Promise<void>
}

const AppStoreContext = createContext<AppStoreValue | null>(null)

function nowTime() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

function formatTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return nowTime()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

function getExt(name: string) {
  const idx = name.lastIndexOf('.')
  if (idx < 0) return ''
  return name.slice(idx + 1).toLowerCase()
}

function toAnalysisProvider(provider: 'gpt' | 'claude'): AnalysisProvider {
  return provider === 'claude' ? 'anthropic' : 'openai'
}

function toBackendAnalysisProvider(provider: AnalysisProvider): 'gpt' | 'claude' {
  return provider === 'anthropic' ? 'claude' : 'gpt'
}

function normalizeProgress(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 100) return 100
  return Math.round(value)
}

function parseProjectIdFromPayload(payload: Record<string, unknown>): string | undefined {
  const candidates = [payload.projectId, payload.project_id, payload.projectUuid]
  for (const item of candidates) {
    if (typeof item === 'string' && item.trim()) return item
  }
  return undefined
}

function statusText(status: SourceStatus | JobStatus | ProjectStatus) {
  switch (status) {
    case 'parsing':
      return '解析中'
    case 'success':
      return '成功'
    case 'succeeded':
      return '成功'
    case 'failed':
      return '失败'
    case 'queued':
      return '排队中'
    case 'running':
      return '运行中'
    case 'draft':
      return '草稿'
    case 'generating':
      return '生成中'
    case 'ready':
      return '可导出'
    default:
      return status
  }
}

function deriveProjectStatus(project: ProjectDTO, projectJobs: JobDTO[]): ProjectStatus {
  const isGenerating = projectJobs.some(
    (job) =>
      (job.type === 'deck-plan' || job.type === 'deck-generate' || job.type === 'slide-regenerate') &&
      (job.status === 'queued' || job.status === 'running')
  )
  if (isGenerating) return 'generating'

  if (project.deckSpec?.slides?.length) return 'ready'
  return 'draft'
}

function toSlideItems(deck: DeckDTO | undefined): SlideItem[] {
  if (!deck?.slides?.length) return []

  return [...deck.slides]
    .sort((a, b) => a.order - b.order)
    .map((slide) => ({
      id: slide.id,
      title: slide.title,
      bullets: slide.bullets,
      imageState: slide.imageAssetKey ? 'done' : 'queued',
    }))
}

function toSourceItems(sourceRows: SourceDTO[], projectName: string): SourceItem[] {
  return sourceRows.map((source) => ({
    id: source.id,
    name: source.filename,
    ext: getExt(source.filename),
    status: source.status,
    chunks: Number(source.chunkCount || 0),
    updatedAt: formatTime(source.updatedAt),
    projectName,
    sourceGuide:
      source.parseSummary ||
      (source.status === 'failed'
        ? '来源解析失败，请检查文件后重试。'
        : source.status === 'parsing'
          ? '来源正在解析中，稍后会更新解析结果。'
          : '来源解析成功，可用于对话与生成。'),
    parsePreview: source.parseSummary || '暂无结构化摘要。',
  }))
}

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getAccessToken()))
  const [loginEmail, setLoginEmail] = useState('admin@test.com')
  const [loginPassword, setLoginPassword] = useState('admin123')
  const [sessionKeep, setSessionKeep] = useState(true)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [activeProjectId, setActiveProjectId] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [projectModalOpen, setProjectModalOpen] = useState(false)

  const [sources, setSources] = useState<SourceItem[]>([])
  const [sourceFilters, setSourceFilters] = useState<SourceStatus[]>(['parsing', 'success', 'failed'])

  const [jobs, setJobs] = useState<JobItem[]>([])
  const [showOnlyFailedJobs, setShowOnlyFailedJobs] = useState(false)

  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<string[]>([
    '系统：解析内容已就绪，可基于当前素材继续提问或创作内容。',
  ])

  const [slides, setSlides] = useState<SlideItem[]>([])
  const [selectedSlideId, setSelectedSlideId] = useState('')
  const [slideTone, setSlideTone] = useState<'business' | 'academic' | 'tech'>('business')
  const [selectedTemplateId, setSelectedTemplateId] = useState('vector-illustration')
  const [selectedTemplateName, setSelectedTemplateName] = useState('科技现代')
  const [isGeneratingDeck, setIsGeneratingDeck] = useState(false)
  const [isExportingDeck, setIsExportingDeck] = useState(false)

  const [analysisConfig, setAnalysisConfigState] = useState<AnalysisModelConfig>({
    provider: 'openai',
    baseUrl: ANALYSIS_PROVIDER_DEFAULTS.openai.baseUrl,
    apiKey: '',
    model: ANALYSIS_PROVIDER_DEFAULTS.openai.model,
  })

  const [imageConfig, setImageConfigState] = useState<ImageModelConfig>({
    _type: 'newapi_channel_conn',
    url: 'https://www.aiartmirror.com',
    key: '',
    model: 'gpt-image-2',
  })

  const [savingConfig, setSavingConfig] = useState(false)
  const [configMessage, setConfigMessage] = useState('未验证')
  const [selectedFileType, setSelectedFileType] = useState('pdf')
  const [projectCustomStyle, setProjectCustomStyle] = useState('')
  const [projectAnalysisSummary, setProjectAnalysisSummary] = useState<ProjectAnalysisSummaryDTO | null>(null)

  const activeProject = useMemo(
    () => projects.find((item) => item.id === activeProjectId) ?? projects[0] ?? null,
    [projects, activeProjectId]
  )

  const selectedSlide = useMemo(
    () => slides.find((slide) => slide.id === selectedSlideId) ?? slides[0] ?? null,
    [slides, selectedSlideId]
  )

  const displayedSources = useMemo(() => {
    if (sourceFilters.length === 0) {
      return sources
    }
    return sources.filter((item) => sourceFilters.includes(item.status))
  }, [sources, sourceFilters])

  const displayedJobs = useMemo(() => {
    if (!showOnlyFailedJobs) {
      return jobs
    }
    return jobs.filter((job) => job.status === 'failed')
  }, [jobs, showOnlyFailedJobs])

  const mapJobs = useCallback(
    (jobRows: JobDTO[], projectRows: ProjectDTO[]): JobItem[] => {
      const projectNameMap = new Map(projectRows.map((p) => [p.id, p.name]))

      return jobRows.map((job) => {
        const payload = job.payload || {}
        const projectIdFromPayload = parseProjectIdFromPayload(payload)
        const projectName =
          (projectIdFromPayload ? projectNameMap.get(projectIdFromPayload) : undefined) ||
          '未命名项目'

        return {
          id: job.id,
          type: job.type,
          projectName,
          status: job.status,
          progress: normalizeProgress(job.progress),
          reason: job.errorMessage,
          retryable: job.status === 'failed',
          createdAt: formatTime(job.createdAt),
        }
      })
    },
    []
  )

  const fetchAllJobs = useCallback(async (): Promise<JobDTO[]> => {
    const pageSize = 100
    let page = 1

    const first = await apiGet<JobsListResponse>(`/api/jobs?page=${page}&pageSize=${pageSize}`)
    const items = [...first.items]

    while (items.length < first.total) {
      page += 1
      const next = await apiGet<JobsListResponse>(`/api/jobs?page=${page}&pageSize=${pageSize}`)
      items.push(...next.items)
      if (next.items.length === 0) break
    }

    return items
  }, [])

  const reloadJobs = useCallback(async () => {
    if (!isLoggedIn) return

    const [projectRows, jobRows] = await Promise.all([
      apiGet<ProjectDTO[]>('/api/projects'),
      fetchAllJobs(),
    ])

    setJobs(mapJobs(jobRows, projectRows))
    setProjects((prev) => {
      const next = projectRows.map((project) => {
        const projectJobs = jobRows.filter((job) => parseProjectIdFromPayload(job.payload) === project.id)
        const status = deriveProjectStatus(project, projectJobs)
        const existed = prev.find((p) => p.id === project.id)
        return {
          id: project.id,
          name: project.name,
          slideCount: project.deckSpec?.slides?.length || 0,
          status,
          updatedAt: formatTime(project.updatedAt),
          ...(existed ? { updatedAt: formatTime(project.updatedAt) } : {}),
        } as ProjectItem
      })
      return next
    })
  }, [fetchAllJobs, isLoggedIn, mapJobs])

  const loadProjectRelated = useCallback(async (projectId: string) => {
    if (!projectId) {
      setSources([])
      setSlides([])
      setChatMessages(['系统：解析内容已就绪，可基于当前素材继续提问或创作内容。'])
      setProjectCustomStyle('')
      setProjectAnalysisSummary(null)
      return
    }

    const [project, sourceRows, chatRows, analysisSummary] = await Promise.all([
      apiGet<ProjectDTO>(`/api/projects/${projectId}`),
      apiGet<SourceDTO[]>(`/api/projects/${projectId}/sources`),
      apiGet<ChatMessageDTO[]>(`/api/projects/${projectId}/chat/messages`),
      apiGet<ProjectAnalysisSummaryDTO>(`/api/projects/${projectId}/analysis-summary`).catch(() => null),
    ])

    const mappedSources = toSourceItems(sourceRows, project.name)

    const mappedSlides = toSlideItems(project.deckSpec)
    const mappedMessages = chatRows.length
      ? chatRows.map((msg) => {
          const roleLabel = msg.role === 'user' ? '你' : msg.role === 'assistant' ? '助手' : '系统'
          return `${roleLabel}：${msg.content}`
        })
      : ['系统：解析内容已就绪，可基于当前素材继续提问或创作内容。']

    setSources(mappedSources)
    setSlides(mappedSlides)
    setProjectCustomStyle(project.customStyle || '')
    setProjectAnalysisSummary(analysisSummary)
    setSelectedSlideId((prev) => prev || mappedSlides[0]?.id || '')
    setChatMessages(mappedMessages)
  }, [])

  const refreshProjectRuntime = useCallback(
    async (projectId: string) => {
      if (!projectId) return

      const [project, sourceRows, analysisSummary] = await Promise.all([
        apiGet<ProjectDTO>(`/api/projects/${projectId}`),
        apiGet<SourceDTO[]>(`/api/projects/${projectId}/sources`),
        apiGet<ProjectAnalysisSummaryDTO>(`/api/projects/${projectId}/analysis-summary`).catch(() => null),
      ])

      const mappedSources = toSourceItems(sourceRows, project.name)
      const mappedSlides = toSlideItems(project.deckSpec)

      setSources(mappedSources)
      setSlides(mappedSlides)
      setProjectCustomStyle(project.customStyle || '')
      setProjectAnalysisSummary(analysisSummary)
      setSelectedSlideId((prev) =>
        mappedSlides.some((slide) => slide.id === prev) ? prev : mappedSlides[0]?.id || '',
      )
    },
    [],
  )

  const loadModelConfig = useCallback(async () => {
    if (!isLoggedIn) return

    const data = await apiGet<ModelConfigMaskedResponse>('/api/me/model-config')
    setAnalysisConfigState((prev) => ({
      ...prev,
      provider: toAnalysisProvider(data.analysis.provider),
      baseUrl: data.analysis.baseUrl,
      apiKey: data.analysis.apiKeyMasked || prev.apiKey,
      model: data.analysis.model,
    }))
    setImageConfigState((prev) => ({
      ...prev,
      _type: data.image._type,
      url: data.image.url,
      key: data.image.keyMasked || prev.key,
      model: data.image.model,
    }))
  }, [isLoggedIn])

  const sendCode = useCallback(
    async (purpose: SendCodePurpose, emailOverride?: string) => {
      const email = (emailOverride || loginEmail).trim().toLowerCase()
      if (!email) {
        throw new Error('邮箱不能为空')
      }

      await apiPost<{ expiresAt: string }>('/api/auth/send-code', {
        email,
        purpose,
      })
    },
    [loginEmail]
  )

  const refreshCurrentUser = useCallback(async () => {
    if (!getAccessToken()) {
      setCurrentUser(null)
      return
    }

    const profile = await apiGet<CurrentUser>('/api/me')
    setCurrentUser(profile)
    setLoginEmail(profile.email)
  }, [])

  const login = useCallback(async (): Promise<boolean> => {
    const email = loginEmail.trim().toLowerCase()
    const password = loginPassword.trim()
    if (!email || !password) {
      return false
    }

    const data = await apiPost<LoginResponse>('/api/auth/login', {
      email,
      password,
    })

    setAccessToken(data.accessToken)
    setIsLoggedIn(true)
    setCurrentUser(data.user)
    setLoginEmail(data.user.email)

    return true
  }, [loginEmail, loginPassword])

  const loginWithCredentials = useCallback(async (emailRaw: string, passwordRaw: string): Promise<boolean> => {
    const email = emailRaw.trim().toLowerCase()
    const password = passwordRaw.trim()
    if (!email || !password) {
      return false
    }

    const data = await apiPost<LoginResponse>('/api/auth/login', {
      email,
      password,
    })

    setAccessToken(data.accessToken)
    setIsLoggedIn(true)
    setCurrentUser(data.user)
    setLoginEmail(data.user.email)
    setLoginPassword(passwordRaw)

    return true
  }, [])

  const logout = useCallback(() => {
    clearAccessToken()
    setIsLoggedIn(false)
    setCurrentUser(null)
    setProjects([])
    setActiveProjectId('')
    setSources([])
    setJobs([])
    setSlides([])
    setChatMessages(['系统：解析内容已就绪，可基于当前素材继续提问或创作内容。'])
    setProjectCustomStyle('')
    setProjectAnalysisSummary(null)
  }, [])

  async function createProject(): Promise<void> {
    const name = newProjectName.trim()
    if (!name) {
      return
    }

    await apiPost<ProjectDTO>('/api/projects', { name })
    const rows = await apiGet<ProjectDTO[]>('/api/projects')
    const jobRows = await fetchAllJobs()
    const nextProjects: ProjectItem[] = rows.map((project) => {
      const projectJobs = jobRows.filter((job) => parseProjectIdFromPayload(job.payload) === project.id)
      return {
        id: project.id,
        name: project.name,
        slideCount: project.deckSpec?.slides?.length || 0,
        status: deriveProjectStatus(project, projectJobs),
        updatedAt: formatTime(project.updatedAt),
      }
    })
    setProjects(nextProjects)
    setJobs(mapJobs(jobRows, rows))

    const created = rows.find((p) => p.name === name)
    if (created) {
      setActiveProjectId(created.id)
    }
    setNewProjectName('')
    setProjectModalOpen(false)
  }

  function openProject(projectId: string) {
    setActiveProjectId(projectId)
  }

  async function uploadSource(file: File): Promise<void> {
    if (!activeProject?.id) {
      throw new Error('请先选择项目')
    }

    const presign = await apiPost<UploadPresignResponse>('/api/uploads/presign', {
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
    })

    const uploadUrl = withApiBase(presign.uploadUrl)
    const uploadResp = await fetch(uploadUrl, {
      method: presign.method || 'PUT',
      headers: presign.headers || { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    })
    if (!uploadResp.ok) {
      throw new Error(`upload failed: ${uploadResp.status}`)
    }

    await apiPost<UploadCompleteResponse>(`/api/projects/${activeProject.id}/sources/complete`, {
      filename: file.name,
      objectKey: presign.objectKey,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
    })

    await Promise.all([loadProjectRelated(activeProject.id), reloadJobs()])
  }

  async function retrySource(sourceId: string): Promise<void> {
    if (!activeProject?.id) {
      throw new Error('请先选择项目')
    }

    await apiPost<SourceReparseResponse>(`/api/projects/${activeProject.id}/sources/${sourceId}/reparse`, {})
    await Promise.all([loadProjectRelated(activeProject.id), reloadJobs()])
  }

  async function removeSource(sourceId: string): Promise<void> {
    if (!activeProject?.id) {
      throw new Error('请先选择项目')
    }

    await apiDelete<{ id: string; deleted: boolean }>(`/api/projects/${activeProject.id}/sources/${sourceId}`)
    await Promise.all([loadProjectRelated(activeProject.id), reloadJobs()])
  }

  async function retryJob(jobId: string): Promise<void> {
    await apiPost<JobRetryResponse>(`/api/jobs/${jobId}/retry`, {})
    await reloadJobs()
    if (activeProject?.id) {
      await refreshProjectRuntime(activeProject.id)
    }
  }

  async function sendChatMessage(): Promise<void> {
    const text = chatInput.trim()
    if (!text || !activeProject?.id) {
      return
    }

    setChatInput('')
    const data = await apiPost<ChatCreateResponse>(`/api/projects/${activeProject.id}/chat/messages`, {
      content: text,
    })

    setChatMessages((prev) => [
      ...prev,
      `你：${data.user.content}`,
      `助手：${data.assistant.content}`,
    ])
  }

  function applyTemplateToActiveProject(template: Pick<StyleTemplate, 'id' | 'name'>) {
    setSelectedTemplateId(template.id)
    setSelectedTemplateName(template.name)
    setChatMessages((prev) => [...prev, `系统：已将模板「${template.name}」应用到当前项目。`])
  }

  async function generateDeck(): Promise<void> {
    if (!activeProject?.id) {
      return
    }

    setIsGeneratingDeck(true)
    try {
      await apiPost<GenerateDeckResponse>(`/api/projects/${activeProject.id}/deck/generate`, {
        pageCount: 10,
        styleId: selectedTemplateId,
      })
      await reloadJobs()
    } finally {
      setIsGeneratingDeck(false)
    }
  }

  async function regenerateSlideImage(slideId: string): Promise<void> {
    if (!activeProject?.id) {
      return
    }

    setSlides((prev) =>
      prev.map((slide) => (slide.id === slideId ? { ...slide, imageState: 'queued' } : slide))
    )
    try {
      await apiPost<{ job: JobDTO }>(`/api/projects/${activeProject.id}/slides/${slideId}/regenerate-image`, {
        instruction: '',
      })
      await reloadJobs()
    } catch (error) {
      setSlides((prev) =>
        prev.map((slide) => (slide.id === slideId ? { ...slide, imageState: 'failed' } : slide))
      )
      throw error
    }
  }

  async function updateSlideText(slideId: string, text: string): Promise<void> {
    if (!activeProject?.id) {
      return
    }

    const bullets = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    setSlides((prev) =>
      prev.map((slide) =>
        slide.id === slideId
          ? {
              ...slide,
              bullets,
            }
          : slide
      )
    )

    await apiPatch(`/api/projects/${activeProject.id}/slides/${slideId}/spec`, {
      bullets,
    }).catch(() => {
      // 页面层不抛出，避免影响编辑流畅性。
    })
  }

  async function exportDeck(format: 'pptx' | 'pdf'): Promise<void> {
    if (!activeProject?.id) {
      return
    }

    setIsExportingDeck(true)
    setSelectedFileType(format)
    try {
      await apiPost<ExportStartResponse>(`/api/projects/${activeProject.id}/export/${format}`, {})
      await reloadJobs()
      setChatMessages((prev) => [...prev, `系统：${format.toUpperCase()} 导出任务已创建。`])
    } finally {
      setIsExportingDeck(false)
    }
  }

  async function saveProjectCustomStyle(customStyle: string): Promise<void> {
    if (!activeProject?.id) {
      throw new Error('请先选择项目')
    }

    const trimmed = customStyle.trim()
    const project = await apiPatch<ProjectDTO>(`/api/projects/${activeProject.id}/custom-style`, {
      customStyle: trimmed,
    })

    setProjectCustomStyle(project.customStyle || '')
  }

  async function validateAndSaveConfig(): Promise<void> {
    setSavingConfig(true)
    setConfigMessage('校验中...')

    try {
      const payload = {
        analysis: {
          provider: toBackendAnalysisProvider(analysisConfig.provider),
          baseUrl: analysisConfig.baseUrl,
          apiKey: analysisConfig.apiKey,
          model: analysisConfig.model,
        },
        image: {
          _type: imageConfig._type,
          url: imageConfig.url,
          key: imageConfig.key,
          model: imageConfig.model,
        },
      }

      const validate = await apiPost<ModelConfigValidateResponse>('/api/me/model-config/validate', payload)
      if (!validate.analysis.ok || !validate.image.ok) {
        setConfigMessage(`${validate.analysis.message}; ${validate.image.message}`)
        return
      }

      const saved = await apiPut<ModelConfigMaskedResponse>('/api/me/model-config', payload)
      setAnalysisConfigState((prev) => ({
        ...prev,
        provider: toAnalysisProvider(saved.analysis.provider),
        baseUrl: saved.analysis.baseUrl,
        apiKey: saved.analysis.apiKeyMasked,
        model: saved.analysis.model,
      }))
      setImageConfigState((prev) => ({
        ...prev,
        _type: saved.image._type,
        url: saved.image.url,
        key: saved.image.keyMasked,
        model: saved.image.model,
      }))

      setConfigMessage('连接正常，配置已保存')
    } catch (error) {
      const msg = error instanceof Error ? error.message : '配置保存失败'
      setConfigMessage(msg)
    } finally {
      setSavingConfig(false)
    }
  }

  useEffect(() => {
    if (!isLoggedIn || !getAccessToken()) {
      return
    }

    let canceled = false

    void (async () => {
      try {
        const [projectRows, jobRows] = await Promise.all([apiGet<ProjectDTO[]>('/api/projects'), fetchAllJobs()])

        if (canceled) return

        const nextProjects: ProjectItem[] = projectRows.map((project) => {
          const projectJobs = jobRows.filter((job) => parseProjectIdFromPayload(job.payload) === project.id)
          return {
            id: project.id,
            name: project.name,
            slideCount: project.deckSpec?.slides?.length || 0,
            status: deriveProjectStatus(project, projectJobs),
            updatedAt: formatTime(project.updatedAt),
          }
        })

        setProjects(nextProjects)
        setJobs(mapJobs(jobRows, projectRows))

        if (!activeProjectId && nextProjects[0]) {
          setActiveProjectId(nextProjects[0].id)
        }
      } catch {
        if (!canceled) {
          setProjects([])
          setJobs([])
        }
      }
    })()

    return () => {
      canceled = true
    }
  }, [isLoggedIn, fetchAllJobs, mapJobs, activeProjectId])

  useEffect(() => {
    if (!isLoggedIn || !activeProjectId) {
      return
    }

    let canceled = false

    void loadProjectRelated(activeProjectId).catch(() => {
      if (!canceled) {
        setSources([])
      }
    })

    return () => {
      canceled = true
    }
  }, [activeProjectId, isLoggedIn, loadProjectRelated])

  useEffect(() => {
    if (!isLoggedIn) return

    void loadModelConfig().catch(() => {
      // keep local defaults on load failure
    })
  }, [isLoggedIn, loadModelConfig])

  useEffect(() => {
    if (!isLoggedIn) return

    const timer = window.setInterval(() => {
      void (async () => {
        await reloadJobs()
        if (activeProjectId) {
          await refreshProjectRuntime(activeProjectId)
        }
      })().catch(() => {
        // ignore poll errors
      })
    }, 4000)

    return () => {
      window.clearInterval(timer)
    }
  }, [isLoggedIn, reloadJobs, activeProjectId, refreshProjectRuntime])

  const value = useMemo<AppStoreValue>(
    () => ({
      isLoggedIn,
      loginEmail,
      loginPassword,
      sessionKeep,
      currentUser,
      projects,
      activeProjectId,
      newProjectName,
      projectModalOpen,
      sources,
      sourceFilters,
      jobs,
      showOnlyFailedJobs,
      chatInput,
      chatMessages,
      slides,
      selectedSlideId,
      slideTone,
      selectedTemplateId,
      selectedTemplateName,
      isGeneratingDeck,
      isExportingDeck,
      analysisConfig,
      imageConfig,
      savingConfig,
      configMessage,
      selectedFileType,
      projectCustomStyle,
      projectAnalysisSummary,
      activeProject,
      selectedSlide,
      displayedSources,
      displayedJobs,
      acceptedFormats,
      promptPresets,
      statusText,
      setLoginEmail,
      setLoginPassword,
      setSessionKeep,
      setNewProjectName,
      setProjectModalOpen,
      setSourceFilters,
      setShowOnlyFailedJobs,
      setChatInput,
      setSelectedSlideId,
      setSlideTone,
      applyTemplateToActiveProject,
      setSelectedFileType,
      setAnalysisConfig: (updater) => setAnalysisConfigState(updater),
      setImageConfig: (updater) => setImageConfigState(updater),
      sendCode,
      login,
      loginWithCredentials,
      refreshCurrentUser,
      logout,
      createProject,
      openProject,
      uploadSource,
      retrySource,
      removeSource,
      retryJob,
      sendChatMessage,
      generateDeck,
      regenerateSlideImage,
      updateSlideText,
      exportDeck,
      saveProjectCustomStyle,
      validateAndSaveConfig,
    }),
    [
      isLoggedIn,
      loginEmail,
      loginPassword,
      sessionKeep,
      currentUser,
      projects,
      activeProjectId,
      newProjectName,
      projectModalOpen,
      sources,
      sourceFilters,
      jobs,
      showOnlyFailedJobs,
      chatInput,
      chatMessages,
      slides,
      selectedSlideId,
      slideTone,
      selectedTemplateId,
      selectedTemplateName,
      isGeneratingDeck,
      isExportingDeck,
      analysisConfig,
      imageConfig,
      savingConfig,
      configMessage,
      selectedFileType,
      projectCustomStyle,
      projectAnalysisSummary,
      activeProject,
      selectedSlide,
      displayedSources,
      displayedJobs,
      sendCode,
      login,
      loginWithCredentials,
      refreshCurrentUser,
      logout,
      createProject,
      openProject,
      uploadSource,
      retrySource,
      removeSource,
      retryJob,
      sendChatMessage,
      generateDeck,
      regenerateSlideImage,
      updateSlideText,
      exportDeck,
      saveProjectCustomStyle,
      validateAndSaveConfig,
    ]
  )

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore() {
  const context = useContext(AppStoreContext)
  if (!context) {
    throw new Error('useAppStore must be used within AppStoreProvider')
  }
  return context
}

export function useRequireAuth() {
  const { isLoggedIn } = useAppStore()
  return isLoggedIn
}

export function useAuthActions() {
  const {
    sendCode,
    login,
    loginWithCredentials,
    logout,
    refreshCurrentUser,
    setLoginEmail,
    setLoginPassword,
    setSessionKeep,
    loginEmail,
    loginPassword,
    sessionKeep,
    currentUser,
  } = useAppStore()

  return {
    sendCode,
    login,
    loginWithCredentials,
    logout,
    refreshCurrentUser,
    setLoginEmail,
    setLoginPassword,
    setSessionKeep,
    loginEmail,
    loginPassword,
    sessionKeep,
    currentUser,
  }
}

export function useWorkspaceData() {
  return useAppStore()
}

export function useModelSettingsData() {
  return useAppStore()
}

export function useProjectsData() {
  return useAppStore()
}

export function useJobsData() {
  return useAppStore()
}

export function usePromptPresets() {
  return promptPresets
}

export function useAcceptedFormats() {
  return acceptedFormats
}

export function setAnalysisProvider(provider: AnalysisProvider) {
  return provider
}
