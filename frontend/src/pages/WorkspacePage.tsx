import {
  ArrowLeftOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileImageOutlined,
  InboxOutlined,
  ReloadOutlined,
  SendOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { App, Button, Dropdown, Input, Modal, Progress, Space, Tag, Typography, Upload } from 'antd'
import { Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRequireAuth, useWorkspaceData } from '../store/AppStore'
import type { ProjectAnalysisSummaryDTO, SlideItem, SourceStatus } from '../types/app'
import type { MenuProps, UploadFile, UploadProps } from 'antd'

function fileAvatarClass(ext: string) {
  if (['doc', 'docx'].includes(ext)) return 'file-avatar file-avatar-doc'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'file-avatar file-avatar-xls'
  if (['ppt', 'pptx'].includes(ext)) return 'file-avatar file-avatar-ppt'
  if (['pdf'].includes(ext)) return 'file-avatar file-avatar-pdf'
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif', 'heic', 'heif'].includes(ext)) return 'file-avatar file-avatar-img'
  return 'file-avatar file-avatar-other'
}

function statusDotClass(status: SourceStatus) {
  if (status === 'success') return 'dot-ok'
  if (status === 'parsing') return 'dot-run'
  return 'dot-fail'
}

function mapSlideStateLabel(item: SlideItem) {
  if (item.imageState === 'done') return '已完成'
  if (item.imageState === 'queued') return '生成中'
  return '失败'
}

function formatClock(date: Date) {
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function mapAnalysisStateTag(
  state: ProjectAnalysisSummaryDTO['state'] | undefined,
): { color: string; label: string } {
  if (state === 'ready') return { color: 'success', label: '已就绪' }
  if (state === 'parsing') return { color: 'processing', label: '解析中' }
  if (state === 'partial') return { color: 'warning', label: '部分就绪' }
  if (state === 'failed') return { color: 'error', label: '失败' }
  return { color: 'default', label: '待上传' }
}

export default function WorkspacePage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const isLoggedIn = useRequireAuth()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [sourceView, setSourceView] = useState<'list' | 'detail'>('list')
  const [customStyleText, setCustomStyleText] = useState('')
  const [assistantTyping, setAssistantTyping] = useState(false)
  const [messageTimes, setMessageTimes] = useState<string[]>([])
  const pendingAssistantRef = useRef(false)
  const chatScrollRef = useRef<HTMLDivElement | null>(null)

  const {
    projects,
    activeProject,
    acceptedFormats,
    displayedSources,
    retrySource,
    removeSource,
    uploadSource,
    statusText,
    promptPresets,
    chatMessages,
    chatInput,
    setChatInput,
    sendChatMessage,
    slides,
    selectedSlide,
    selectedSlideId,
    setSelectedSlideId,
    updateSlideText,
    regenerateSlideImage,
    isGeneratingDeck,
    generateDeck,
    exportDeck,
    isExportingDeck,
    selectedTemplateName,
    projectCustomStyle,
    projectAnalysisSummary,
    saveProjectCustomStyle,
    setProjectModalOpen,
  } = useWorkspaceData()

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  const currentSources = useMemo(
    () =>
      displayedSources.filter(
        (item) => !item.projectName || item.projectName === activeProject?.name,
      ),
    [displayedSources, activeProject?.name],
  )

  const selectedSource = useMemo(
    () => currentSources.find((item) => item.id === selectedSourceId) ?? currentSources[0] ?? null,
    [currentSources, selectedSourceId],
  )

  useEffect(() => {
    if (!currentSources.length) {
      setSelectedSourceId('')
      setSourceView('list')
      return
    }
    if (!selectedSourceId || !currentSources.some((item) => item.id === selectedSourceId)) {
      setSelectedSourceId(currentSources[0].id)
      setSourceView('list')
    }
  }, [currentSources, selectedSourceId])

  useEffect(() => {
    setCustomStyleText(projectCustomStyle || '')
  }, [projectCustomStyle, activeProject?.id])

  useEffect(() => {
    setMessageTimes((prev) => {
      if (chatMessages.length === prev.length) {
        return prev
      }
      if (chatMessages.length < prev.length) {
        return prev.slice(0, chatMessages.length)
      }

      const next = [...prev]
      while (next.length < chatMessages.length) {
        next.push(formatClock(new Date()))
      }
      return next
    })

    const latest = chatMessages[chatMessages.length - 1]
    if (!latest) {
      setAssistantTyping(false)
      return
    }

    if (latest.startsWith('助手：') || latest.startsWith('系统：')) {
      pendingAssistantRef.current = false
      setAssistantTyping(false)
      return
    }

    if (latest.startsWith('你：') && pendingAssistantRef.current) {
      setAssistantTyping(true)
    }
  }, [chatMessages])

  useEffect(() => {
    if (!chatScrollRef.current) {
      return
    }
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
  }, [chatMessages, assistantTyping])

  const sourceSuccessCount = currentSources.filter((item) => item.status === 'success').length
  const sourceParsingCount = currentSources.filter((item) => item.status === 'parsing').length
  const sourceFailedCount = currentSources.filter((item) => item.status === 'failed').length
  const resolvedAnalysisSummary = useMemo(() => {
    if (projectAnalysisSummary) {
      return projectAnalysisSummary
    }

    const total = currentSources.length
    const success = sourceSuccessCount
    const parsing = sourceParsingCount
    const failed = sourceFailedCount

    let state: ProjectAnalysisSummaryDTO['state'] = 'empty'
    if (total === 0) state = 'empty'
    else if (success === 0 && parsing > 0 && failed === 0) state = 'parsing'
    else if (success > 0 && parsing === 0 && failed === 0) state = 'ready'
    else if (success === 0 && failed > 0 && parsing === 0) state = 'failed'
    else state = 'partial'

    return {
      state,
      counts: { total, success, parsing, failed },
      summary:
        state === 'empty'
          ? '当前项目还没有素材，请先上传 PDF/DOCX/TXT/MD/JSON/CSV 文件。'
          : state === 'parsing'
            ? `已上传 ${total} 个素材，正在解析中，请稍后查看分析结果。`
            : state === 'ready'
              ? `素材已全部解析完成（${success}/${total}），可开始对话细化并生成演示文稿。`
              : state === 'failed'
                ? `素材解析失败（${failed}/${total}），建议检查文件内容后重试。`
                : `素材处理部分完成：成功 ${success}，解析中 ${parsing}，失败 ${failed}。`,
      highlights: [],
      nextAction:
        state === 'empty'
          ? '上传素材后继续。'
          : state === 'parsing'
            ? '等待解析完成，再进入对话调整。'
            : state === 'ready'
              ? '可先对话补充要求，再点击整套生成。'
              : state === 'failed'
                ? '对失败素材执行重试解析或删除后重新上传。'
                : parsing > 0
                  ? '等待剩余素材解析完成。'
                  : '先处理失败素材后再生成。',
      updatedAt: '',
    } satisfies ProjectAnalysisSummaryDTO
  }, [projectAnalysisSummary, currentSources, sourceSuccessCount, sourceParsingCount, sourceFailedCount])
  const analysisStateTag = mapAnalysisStateTag(resolvedAnalysisSummary.state)
  const templateDisplayName = projectCustomStyle ? '自定义' : selectedTemplateName

  const doneSlideCount = slides.filter((item) => item.imageState === 'done').length
  const deckProgress = slides.length ? Math.round((doneSlideCount / slides.length) * 100) : 0
  const acceptAttr = acceptedFormats.map((ext) => `.${ext}`).join(',')

  const uploadProps: UploadProps = {
    multiple: true,
    accept: acceptAttr,
    fileList: uploadFiles,
    beforeUpload: () => false,
    onChange: (info) => {
      setUploadFiles(info.fileList)
    },
    onRemove: (file) => {
      setUploadFiles((prev) => prev.filter((item) => item.uid !== file.uid))
      return true
    },
  }

  const exportMenuItems: MenuProps['items'] = [
    { key: 'pptx', label: '导出 PPTX' },
    { key: 'pdf', label: '导出 PDF' },
  ]

  const onExportMenuClick: MenuProps['onClick'] = ({ key }) => {
    const format = String(key).toLowerCase() === 'pdf' ? 'pdf' : 'pptx'
    void (async () => {
      try {
        await exportDeck(format)
        void message.success(`已创建 ${format.toUpperCase()} 导出任务`)
      } catch (error) {
        const msg = error instanceof Error ? error.message : '创建导出任务失败'
        void message.error(msg)
      }
    })()
  }

  function uploadSelectedFiles() {
    void (async () => {
      if (uploadFiles.length === 0) {
        void message.warning('请先选择文件')
        return
      }

      let uploaded = 0
      let failed = 0

      for (const file of uploadFiles) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
        if (!acceptedFormats.includes(ext)) {
          continue
        }

        const rawFile = file.originFileObj
        if (!(rawFile instanceof File)) {
          failed += 1
          continue
        }

        try {
          await uploadSource(rawFile)
          uploaded += 1
        } catch {
          failed += 1
        }
      }

      if (uploaded === 0 && failed === 0) {
        void message.error('没有可上传的支持文件类型')
        return
      }

      setUploadFiles([])
      setUploadModalOpen(false)

      if (failed > 0) {
        void message.warning(`上传完成：成功 ${uploaded} 个，失败 ${failed} 个`)
        return
      }

      void message.success(`已上传 ${uploaded} 个文件`)
    })()
  }

  function handleSendMessage() {
    if (!chatInput.trim()) {
      return
    }
    pendingAssistantRef.current = true
    setAssistantTyping(true)
    void sendChatMessage().catch((error) => {
      pendingAssistantRef.current = false
      setAssistantTyping(false)
      const msg = error instanceof Error ? error.message : '发送失败'
      void message.error(msg)
    })
  }

  function handleGenerateDeck() {
    void generateDeck()
      .then(() => {
        void message.success('已创建整套生成任务')
      })
      .catch((error) => {
        const msg = error instanceof Error ? error.message : '创建整套生成任务失败'
        void message.error(msg)
      })
  }

  function handleRetrySource(sourceId: string) {
    void retrySource(sourceId)
      .then(() => {
        void message.success('已创建来源重试解析任务')
      })
      .catch((error) => {
        const msg = error instanceof Error ? error.message : '来源重试失败'
        void message.warning(msg)
      })
  }

  function handleRemoveSource(sourceId: string) {
    void removeSource(sourceId)
      .then(() => {
        void message.success('素材已删除')
      })
      .catch((error) => {
        const msg = error instanceof Error ? error.message : '来源删除失败'
        void message.warning(msg)
      })
  }

  function handleRegenerateSlideImage(slideId: string) {
    void regenerateSlideImage(slideId)
      .then(() => {
        void message.success('已创建单页重生成任务')
      })
      .catch((error) => {
        const msg = error instanceof Error ? error.message : '单页重生成失败'
        void message.error(msg)
      })
  }

  function saveCustomStyle() {
    void saveProjectCustomStyle(customStyleText)
      .then(() => {
        const text = customStyleText.trim()
        void message.success(text ? '自定义风格已保存' : '已清空自定义风格')
      })
      .catch((error) => {
        const msg = error instanceof Error ? error.message : '保存自定义风格失败'
        void message.error(msg)
      })
  }

  function goCreateProject() {
    setProjectModalOpen(true)
    void navigate('/projects')
  }

  if (!activeProject?.id) {
    return (
      <div className="page-shell">
        <div className="workspace-access-guard">
          <div className="workspace-access-card">
            <Typography.Text className="workspace-access-badge">工作台入口</Typography.Text>
            <Typography.Title level={4} className="workspace-access-title">
              暂无可用项目
            </Typography.Title>
            <Typography.Paragraph className="workspace-access-desc">
              {projects.length === 0
                ? '当前还没有项目，请先新建项目后再进入工作台。'
                : '请先从项目列表选择一个项目，再进入工作台。'}
            </Typography.Paragraph>
            <Space size={10} className="workspace-access-actions">
              <Button onClick={() => void navigate('/projects')}>去项目列表选择项目</Button>
              <Button type="primary" onClick={goCreateProject}>
                新建项目
              </Button>
            </Space>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="workspace-layout">
        <section className="ws-panel">
          <div className="panel-header-row ws-panel-header-row">
            <div className="ws-panel-title-wrap">
              <Typography.Title className="panel-title" level={5}>
                素材来源
              </Typography.Title>
            </div>
            <div className="ws-top-actions">
              <Button type="primary" icon={<CloudUploadOutlined />} onClick={() => setUploadModalOpen(true)}>
                上传素材
              </Button>
            </div>
          </div>

          <div className="ws-panel-body">
            <div className="ws-top-actions" style={{ flexWrap: 'wrap' }}>
              <Tag style={{ borderRadius: 999, marginInlineEnd: 0, background: '#fff', color: '#697089' }}>
                共 {currentSources.length} 个素材
              </Tag>
              <Tag style={{ borderRadius: 999, marginInlineEnd: 0 }}>成功 {sourceSuccessCount}</Tag>
              <Tag color="processing" style={{ borderRadius: 999, marginInlineEnd: 0 }}>
                解析中 {sourceParsingCount}
              </Tag>
              <Tag color="error" style={{ borderRadius: 999, marginInlineEnd: 0 }}>
                失败 {sourceFailedCount}
              </Tag>
            </div>

            {sourceView === 'list' ? (
              <div className="source-list-wrap">
                {currentSources.length === 0 ? (
                  <div className="source-empty">当前项目暂无素材，请先上传。</div>
                ) : (
                  currentSources.map((item) => (
                    <div
                      key={item.id}
                      className={item.id === selectedSource?.id ? 'source-item source-item-active' : 'source-item'}
                      onClick={() => {
                        setSelectedSourceId(item.id)
                        setSourceView('detail')
                      }}
                    >
                      <div className="source-item-main">
                        <div className={fileAvatarClass(item.ext)}>{item.ext.slice(0, 1).toUpperCase()}</div>
                        <div className="source-item-text">
                          <div className="source-name">{item.name}</div>
                          <div className="source-meta">
                            <span>{item.ext.toUpperCase()}</span>
                            <span>· {item.chunks ? `${item.chunks}块` : '处理中'}</span>
                            <span className={statusDotClass(item.status)}>● {statusText(item.status)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="source-actions">
                        {item.status === 'failed' ? (
                          <Button
                            size="small"
                            type="text"
                            icon={<ReloadOutlined />}
                            onClick={(event) => {
                              event.stopPropagation()
                              handleRetrySource(item.id)
                            }}
                          />
                        ) : null}
                        <Button
                          size="small"
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(event) => {
                            event.stopPropagation()
                            handleRemoveSource(item.id)
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="source-detail-card source-detail-page">
                <div className="source-detail-header">
                  <Button icon={<ArrowLeftOutlined />} onClick={() => setSourceView('list')}>
                    返回素材列表
                  </Button>
                  {selectedSource ? <Typography.Text strong>{selectedSource.name}</Typography.Text> : null}
                </div>

                {selectedSource ? (
                  <>
                    <Typography.Text strong style={{ fontSize: 13 }}>
                      来源指南
                    </Typography.Text>
                    <Typography.Paragraph style={{ marginTop: 8, marginBottom: 10, color: '#4d556b' }}>
                      {selectedSource.sourceGuide}
                    </Typography.Paragraph>

                    <Typography.Text strong style={{ fontSize: 13 }}>
                      解析预览
                    </Typography.Text>
                    <pre className="source-preview-block">{selectedSource.parsePreview}</pre>
                  </>
                ) : (
                  <div className="source-empty">暂无可展示的来源详情。</div>
                )}
              </div>
            )}

            <div className="ws-progress-card">
              <Typography.Text strong style={{ fontSize: 13 }}>
                解析进度
              </Typography.Text>
              <Progress
                style={{ marginTop: 8, marginBottom: 4 }}
                percent={Math.round(
                  (currentSources.filter((item) => item.status === 'success').length /
                    (currentSources.length || 1)) *
                    100,
                )}
                size="small"
              />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {currentSources.filter((item) => item.status === 'success').length} / {currentSources.length}{' '}
                个文件已可用
              </Typography.Text>
            </div>
          </div>
        </section>

        <section className="ws-panel">
          <div className="panel-header-row ws-panel-header-row">
            <div className="ws-panel-title-wrap">
              <Typography.Title className="panel-title" level={5}>
                AI 分析与提示词助手
              </Typography.Title>
            </div>
          </div>

          <div className="ws-panel-body">
            <div className="ai-analysis-card">
              <div className="ai-analysis-head">
                <Typography.Text strong style={{ fontSize: 13 }}>
                  素材整体分析
                </Typography.Text>
                <Tag color={analysisStateTag.color} style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                  {analysisStateTag.label}
                </Tag>
              </div>
              <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0, color: '#4d556b' }}>
                {resolvedAnalysisSummary.summary}
              </Typography.Paragraph>
              <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0, color: '#697089', fontSize: 12 }}>
                素材统计：共 {resolvedAnalysisSummary.counts.total}，成功 {resolvedAnalysisSummary.counts.success}，解析中{' '}
                {resolvedAnalysisSummary.counts.parsing}，失败 {resolvedAnalysisSummary.counts.failed}
              </Typography.Paragraph>
              {resolvedAnalysisSummary.highlights.length ? (
                <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0, color: '#4d556b' }}>
                  关键要点：{resolvedAnalysisSummary.highlights.join('；')}
                </Typography.Paragraph>
              ) : null}
              <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0, color: '#4d556b' }}>
                下一步：{resolvedAnalysisSummary.nextAction}
              </Typography.Paragraph>
            </div>

            <div className="ai-dialog-shell">
              <div className="chat-scroll" ref={chatScrollRef}>
                {chatMessages.map((item, index) => {
                  const isUser = item.startsWith('你：')
                  const role = item.startsWith('系统：') ? '系统' : isUser ? '你' : 'AI'
                  const content = item.replace(/^(你|助手|系统)：/, '')
                  const timeText = messageTimes[index] ?? ''
                  return (
                    <div key={`${item}-${index}`} className={isUser ? 'chat-row chat-row-user' : 'chat-row'}>
                      <div className={isUser ? 'chat-role chat-role-user' : 'chat-role'}>{role}</div>
                      <div className={isUser ? 'chat-bubble-wrap chat-bubble-wrap-user' : 'chat-bubble-wrap'}>
                        <div className={isUser ? 'chat-msg chat-msg-user' : 'chat-msg'}>{content}</div>
                        <div className={isUser ? 'chat-time chat-time-user' : 'chat-time'}>{timeText}</div>
                      </div>
                    </div>
                  )
                })}
                {assistantTyping ? (
                  <div className="chat-row">
                    <div className="chat-role">AI</div>
                    <div className="chat-typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="ai-action-card">
              <Typography.Text className="ai-action-label">快捷提问</Typography.Text>
              <div className="ws-preset-row">
                {promptPresets.map((item) => (
                  <Button key={item.id} className="ws-preset-btn" onClick={() => setChatInput(item.text)}>
                    {item.text}
                  </Button>
                ))}
              </div>

              <div className="ws-chat-input-row">
                <Input
                  value={chatInput}
                  placeholder="提问或创作内容"
                  onChange={(event) => setChatInput(event.target.value)}
                  onPressEnter={handleSendMessage}
                />
                <Button type="primary" className="ws-chat-send" icon={<SendOutlined />} onClick={handleSendMessage} />
              </div>
            </div>
          </div>
        </section>

        <section className="ws-panel">
          <div className="panel-header-row ws-panel-header-row">
            <div className="ws-panel-title-wrap">
              <Typography.Title className="panel-title" level={5}>
                幻灯片生成
              </Typography.Title>
            </div>
            <Space size={8}>
              <Button type="primary" icon={<ThunderboltOutlined />} loading={isGeneratingDeck} onClick={handleGenerateDeck}>
                整套生成
              </Button>
              <Dropdown
                menu={{ items: exportMenuItems, onClick: onExportMenuClick }}
                trigger={['click']}
                disabled={isExportingDeck}
              >
                <Button icon={<DownloadOutlined />} loading={isExportingDeck}>
                  导出
                </Button>
              </Dropdown>
            </Space>
          </div>

          <div className="ws-panel-body">
            <div className="ws-progress-card">
              <Typography.Text style={{ fontSize: 13, fontWeight: 600 }}>
                当前项目 {activeProject?.name ?? '未命名项目'} 进度 {deckProgress}%
              </Typography.Text>
              <Progress
                style={{ marginTop: 10, marginBottom: 4 }}
                percent={deckProgress}
                size="small"
                strokeColor="#574bf3"
              />
            </div>

            <div className="style-config-card">
              <div className="style-current-row">
                <Typography.Text className="style-current-template">
                  当前模板：{templateDisplayName}
                </Typography.Text>
                <Button
                  type="link"
                  size="small"
                  className="style-change-link"
                  onClick={() => void navigate('/templates')}
                >
                  （可更换）
                </Button>
              </div>
              <div className="style-custom-row">
                <Typography.Text className="ai-action-label">自定义风格</Typography.Text>
                <div className="style-custom-input-row">
                  <Input
                    value={customStyleText}
                    placeholder="输入自定义风格，例如：科技蓝白、极简留白"
                    onChange={(event) => setCustomStyleText(event.target.value)}
                    onPressEnter={saveCustomStyle}
                  />
                  <Button type="primary" onClick={saveCustomStyle}>
                    保存
                  </Button>
                </div>
              </div>
            </div>

            <div className="slide-grid">
              {slides.map((item, index) => {
                const active = item.id === selectedSlideId
                return (
                  <div
                    key={item.id}
                    className={active ? 'slide-thumb active' : 'slide-thumb'}
                    onClick={() => setSelectedSlideId(item.id)}
                  >
                    <div className={index % 2 === 0 ? 'slide-cover' : 'slide-cover light'}>
                      <div className="slide-index">{String(index + 1).padStart(2, '0')}</div>
                      <div className="slide-title">{item.title}</div>
                      <div className="slide-desc">{item.bullets.slice(0, 2).join(' · ')}</div>
                    </div>
                    <div className="slide-footer">
                      <Tag
                        color={
                          item.imageState === 'done'
                            ? 'success'
                            : item.imageState === 'queued'
                              ? 'processing'
                              : 'error'
                        }
                        style={{ marginInlineEnd: 0 }}
                      >
                        {mapSlideStateLabel(item)}
                      </Tag>
                      <FileImageOutlined style={{ color: '#9aa3b8' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {selectedSlide ? (
              <div className="mini-edit-card">
                <Typography.Text strong>{selectedSlide.title}</Typography.Text>
                <Input.TextArea
                  rows={4}
                  style={{ marginTop: 8 }}
                  value={selectedSlide.bullets.join('\n')}
                  onChange={(event) => {
                    void updateSlideText(selectedSlide.id, event.target.value)
                  }}
                />
                <Space style={{ marginTop: 10 }}>
                  <Button icon={<ReloadOutlined />} onClick={() => handleRegenerateSlideImage(selectedSlide.id)}>
                    单页重生成
                  </Button>
                </Space>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <Modal
        title="上传素材"
        open={uploadModalOpen}
        onCancel={() => {
          setUploadModalOpen(false)
          setUploadFiles([])
        }}
        onOk={uploadSelectedFiles}
        okText="开始上传"
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Upload.Dragger {...uploadProps} style={{ background: '#fafbff' }}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">支持批量选择文件</p>
          </Upload.Dragger>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
            支持的文件类型：
            {acceptedFormats.join(', ')}
          </Typography.Text>
        </Space>
      </Modal>
    </div>
  )
}
