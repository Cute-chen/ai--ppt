import {
  App,
  Button,
  Card,
  Empty,
  Input,
  Segmented,
  Skeleton,
  Space,
  Tag,
  Typography
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { apiGet, withApiBase } from '../lib/http'
import { useRequireAuth, useWorkspaceData } from '../store/AppStore'
import type { StyleCategory, StyleTemplate } from '../types/app'

type CategoryOption = {
  label: string
  value: 'all' | StyleCategory
}

const categoryOptions: CategoryOption[] = [
  { label: '全部', value: 'all' },
  { label: '科技', value: 'tech' },
  { label: '商业', value: 'business' },
  { label: '创意', value: 'creative' },
  { label: '教育', value: 'education' },
  { label: '健康', value: 'health' },
  { label: '通用', value: 'general' }
]

const categoryLabelMap: Record<StyleCategory, string> = {
  tech: '科技',
  business: '商业',
  creative: '创意',
  education: '教育',
  health: '健康',
  general: '通用'
}

const listContainsKeyword = (list: string[], keyword: string): boolean => {
  return list.some((item) => item.toLowerCase().includes(keyword))
}

export default function TemplatesPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const isLoggedIn = useRequireAuth()
  const { applyTemplateToActiveProject, activeProject } = useWorkspaceData()

  const [loading, setLoading] = useState(true)
  const [styles, setStyles] = useState<StyleTemplate[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<'all' | StyleCategory>('all')
  const [selectedId, setSelectedId] = useState('')
  const [errorText, setErrorText] = useState('')
  const [reloadTick, setReloadTick] = useState(0)

  const selectedTemplate = useMemo(
    () => styles.find((item) => item.id === selectedId) ?? styles[0] ?? null,
    [styles, selectedId]
  )

  const filteredStyles = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return styles.filter((item) => {
      if (category !== 'all' && item.category !== category) return false
      if (!keyword) return true
      return (
        item.name.toLowerCase().includes(keyword) ||
        item.id.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword) ||
        item.scene.toLowerCase().includes(keyword) ||
        listContainsKeyword(item.tags, keyword)
      )
    })
  }, [styles, search, category])

  useEffect(() => {
    let cancelled = false

    async function loadStyles() {
      setLoading(true)
      setErrorText('')
      try {
        const data = await apiGet<StyleTemplate[]>('/api/styles')
        if (cancelled) return
        setStyles(data)
        if (!selectedId && data.length) {
          setSelectedId(data[0].id)
        }
      } catch (error) {
        if (cancelled) return
        const text = error instanceof Error ? error.message : '加载模板库失败'
        setErrorText(text)
        void message.error(text)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadStyles()
    return () => {
      cancelled = true
    }
  }, [message, reloadTick])

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  function applyTemplateAndBack() {
    if (!selectedTemplate) {
      return
    }

    applyTemplateToActiveProject({
      id: selectedTemplate.id,
      name: selectedTemplate.name,
    })
    void message.success(`已应用模板：${selectedTemplate.name}`)
    void navigate('/workspace')
  }

  return (
    <div className="page-shell">
      <div className="templates-shell">
        <div className="templates-sticky-head">
          <div className="panel-header-row" style={{ marginBottom: 12 }}>
            <div>
              <Typography.Title className="panel-title" level={4}>
                模板库
              </Typography.Title>
            </div>

            <Space size={8}>
              <Tag style={{ borderRadius: 999, marginInlineEnd: 0 }}>共 {styles.length} 种</Tag>
              <Tag style={{ borderRadius: 999, marginInlineEnd: 0 }}>
                当前项目：{activeProject?.name ?? '未选择项目'}
              </Tag>
              <Button type="primary" disabled={!selectedTemplate} onClick={applyTemplateAndBack}>
                一键应用到当前项目
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setReloadTick((prev) => prev + 1)
                }}
              >
                刷新
              </Button>
            </Space>
          </div>

          <div className="template-toolbar">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索模板名称、风格ID、描述、标签"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <Segmented
              value={category}
              options={categoryOptions}
              onChange={(value) => setCategory(value as 'all' | StyleCategory)}
            />
          </div>
        </div>

        <div className="template-layout">
          <section className="template-grid-panel">
            {loading ? (
              <div className="template-grid">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <Card key={idx} className="template-card">
                    <Skeleton.Image style={{ width: '100%', height: 120 }} active />
                    <Skeleton active paragraph={{ rows: 2 }} title={{ width: '80%' }} />
                  </Card>
                ))}
              </div>
            ) : filteredStyles.length === 0 ? (
              <div className="template-empty-wrap">
                <Empty description={errorText || '未找到匹配模板'} />
              </div>
            ) : (
              <div className="template-grid">
                {filteredStyles.map((item) => {
                  const active = item.id === selectedTemplate?.id
                  const previewSrc = item.hasPreview && item.previewUrl ? withApiBase(item.previewUrl) : ''
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={active ? 'template-card template-card-active' : 'template-card'}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <div className="template-card-cover">
                        {previewSrc ? (
                          <img
                            src={previewSrc}
                            alt={item.name}
                            onError={(event) => {
                              event.currentTarget.src = withApiBase('/api/styles/preview/_default')
                            }}
                          />
                        ) : (
                          <div className="template-card-cover-fallback">NO PREVIEW</div>
                        )}
                      </div>
                      <div className="template-card-body">
                        <div className="template-card-title-row">
                          <Typography.Text strong>{item.name}</Typography.Text>
                          <Tag style={{ borderRadius: 999, marginInlineEnd: 0 }}>
                            {categoryLabelMap[item.category]}
                          </Tag>
                        </div>
                        <Typography.Text type="secondary" className="template-id">
                          {item.id}
                        </Typography.Text>
                        <Typography.Paragraph className="template-desc">
                          {item.description}
                        </Typography.Paragraph>
                        <div className="template-tag-row">
                          {item.tags.slice(0, 3).map((tag) => (
                            <Tag key={tag} style={{ marginInlineEnd: 0, borderRadius: 999 }}>
                              {tag}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <aside className="template-detail-panel">
            {selectedTemplate ? (
              <>
                <div className="template-detail-cover">
                  <img
                    src={
                      selectedTemplate.hasPreview && selectedTemplate.previewUrl
                        ? withApiBase(selectedTemplate.previewUrl)
                        : withApiBase('/api/styles/preview/_default')
                    }
                    alt={selectedTemplate.name}
                    onError={(event) => {
                      event.currentTarget.src = withApiBase('/api/styles/preview/_default')
                    }}
                  />
                </div>

                <Typography.Title level={5} style={{ margin: 0 }}>
                  {selectedTemplate.name}
                </Typography.Title>
                <Typography.Text type="secondary">{selectedTemplate.id}</Typography.Text>

                <div className="template-detail-meta">
                  <Tag color="blue" style={{ borderRadius: 999, marginInlineEnd: 0 }}>
                    {categoryLabelMap[selectedTemplate.category]}
                  </Tag>
                  {selectedTemplate.tags.map((tag) => (
                    <Tag key={tag} style={{ borderRadius: 999, marginInlineEnd: 0 }}>
                      {tag}
                    </Tag>
                  ))}
                </div>

                <Typography.Paragraph style={{ margin: 0, color: '#4d556b', lineHeight: 1.7 }}>
                  {selectedTemplate.description}
                </Typography.Paragraph>

                <div className="template-scene-card">
                  <Typography.Text strong>适用场景</Typography.Text>
                  <Typography.Paragraph style={{ margin: '6px 0 0', color: '#5d6478' }}>
                    {selectedTemplate.scene}
                  </Typography.Paragraph>
                </div>

                <Button type="primary" block onClick={applyTemplateAndBack}>
                  一键应用到当前项目
                </Button>
              </>
            ) : (
              <Empty description="请选择一个模板查看详情" />
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
