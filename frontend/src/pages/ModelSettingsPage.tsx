import { ApiOutlined, CheckCircleOutlined, CloudServerOutlined } from '@ant-design/icons'
import { Alert, Button, Image, Input, Select, Space, Spin, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { apiGet, withApiBase } from '../lib/http'
import { useModelSettingsData, useRequireAuth } from '../store/AppStore'

const ANALYSIS_PROVIDER_PRESETS = {
  openai: {
    baseUrl: 'https://api.aicodemirror.com/api/codex/backend-api/codex/v1',
    model: 'gpt-5.5',
  },
  anthropic: {
    baseUrl: 'https://api.aicodemirror.com/api/claudecode',
    model: 'claude-sonnet-4-6',
  },
} as const

type TutorialStep = {
  id: string
  title: string
  description: string
  imageUrl: string
}

type TutorialSection = {
  key: 'analysis' | 'image'
  title: string
  linkText: string
  linkUrl: string
  steps: TutorialStep[]
}

type ModelConfigTutorialPayload = {
  sections: TutorialSection[]
}

export default function ModelSettingsPage() {
  const isLoggedIn = useRequireAuth()
  const [tutorialSections, setTutorialSections] = useState<TutorialSection[]>([])
  const [tutorialLoading, setTutorialLoading] = useState(true)
  const [tutorialError, setTutorialError] = useState('')

  const {
    analysisConfig,
    imageConfig,
    savingConfig,
    configMessage,
    setAnalysisConfig,
    setImageConfig,
    validateAndSaveConfig,
  } = useModelSettingsData()

  useEffect(() => {
    let canceled = false

    async function loadTutorial() {
      setTutorialLoading(true)
      setTutorialError('')
      try {
        const data = await apiGet<ModelConfigTutorialPayload>('/api/model-config/tutorial')
        if (!canceled) {
          setTutorialSections(data.sections || [])
        }
      } catch (error) {
        if (!canceled) {
          const message = error instanceof Error ? error.message : '加载教程失败'
          setTutorialError(message || '加载教程失败')
        }
      } finally {
        if (!canceled) {
          setTutorialLoading(false)
        }
      }
    }

    void loadTutorial()

    return () => {
      canceled = true
    }
  }, [])

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="page-shell">
      <div className="settings-shell">
        <div>
          <Typography.Title className="panel-title" level={4}>
            模型设置
          </Typography.Title>
        </div>

        <div className="settings-grid">
          <section className="settings-card settings-card-analysis">
            <Space align="center" className="settings-card-head" style={{ marginBottom: 10 }}>
              <span className="settings-card-icon settings-card-icon-analysis">
                <ApiOutlined />
              </span>
              <Typography.Text strong className="settings-card-title">分析模型设置</Typography.Text>
            </Space>

            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <div className="setting-row">
                <span className="setting-row-label">提供商</span>
                <Select
                  value={analysisConfig.provider}
                  options={[
                    { label: 'OpenAI', value: 'openai' },
                    { label: 'Anthropic', value: 'anthropic' },
                  ]}
                  onChange={(provider) =>
                    setAnalysisConfig((prev) => {
                      const selected = ANALYSIS_PROVIDER_PRESETS[provider]
                      return {
                        ...prev,
                        provider,
                        baseUrl: selected.baseUrl,
                        model: selected.model,
                      }
                    })
                  }
                />
              </div>

              <div className="setting-row">
                <span className="setting-row-label">API 地址</span>
                <Input
                  placeholder={ANALYSIS_PROVIDER_PRESETS[analysisConfig.provider].baseUrl}
                  value={analysisConfig.baseUrl}
                  onChange={(event) => setAnalysisConfig((prev) => ({ ...prev, baseUrl: event.target.value }))}
                />
              </div>

              <div className="setting-row">
                <span className="setting-row-label">API Key</span>
                <Input.Password
                  placeholder={analysisConfig.apiKeyMasked || '请输入真实 API Key（不会显示明文）'}
                  value={analysisConfig.apiKey}
                  onChange={(event) => setAnalysisConfig((prev) => ({ ...prev, apiKey: event.target.value }))}
                />
              </div>

              <div className="setting-row">
                <span className="setting-row-label">模型</span>
                <Input
                  placeholder={ANALYSIS_PROVIDER_PRESETS[analysisConfig.provider].model}
                  value={analysisConfig.model}
                  onChange={(event) => setAnalysisConfig((prev) => ({ ...prev, model: event.target.value }))}
                />
              </div>
            </Space>
          </section>

          <section className="settings-card settings-card-image">
            <Space align="center" className="settings-card-head" style={{ marginBottom: 10 }}>
              <span className="settings-card-icon settings-card-icon-image">
                <CloudServerOutlined />
              </span>
              <Typography.Text strong className="settings-card-title">生图模型设置</Typography.Text>
            </Space>

            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Tag className="settings-protocol-tag" color="blue" style={{ borderRadius: 99, marginInlineEnd: 0, width: 'fit-content' }}>
                固定协议：newapi_channel_conn
              </Tag>

              <div className="setting-row">
                <span className="setting-row-label">API 地址</span>
                <Input
                  placeholder="https://www.aiartmirror.com/register?aff=WmAg"
                  value={imageConfig.url}
                  onChange={(event) => setImageConfig((prev) => ({ ...prev, url: event.target.value }))}
                />
              </div>

              <div className="setting-row">
                <span className="setting-row-label">API Key</span>
                <Input.Password
                  placeholder={imageConfig.keyMasked || '请输入真实 API Key（不会显示明文）'}
                  value={imageConfig.key}
                  onChange={(event) => setImageConfig((prev) => ({ ...prev, key: event.target.value }))}
                />
              </div>

              <div className="setting-row">
                <span className="setting-row-label">模型</span>
                <Input
                  placeholder="gpt-image-2"
                  value={imageConfig.model}
                  onChange={(event) => setImageConfig((prev) => ({ ...prev, model: event.target.value }))}
                />
              </div>
            </Space>
          </section>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <Tag
            color={configMessage.includes('正常') ? 'success' : 'default'}
            icon={<CheckCircleOutlined />}
            style={{ borderRadius: 999, marginInlineEnd: 0 }}
          >
            {configMessage}
          </Tag>

          <Button type="primary" loading={savingConfig} onClick={validateAndSaveConfig}>
            测试连接并保存
          </Button>
        </div>


        <section className="settings-card tutorial-card">
          <Typography.Text strong>配置教程</Typography.Text>
          <div className="tutorial-scroll-wrap" style={{ marginTop: 12 }}>
            {tutorialLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                <Spin />
              </div>
            ) : tutorialError ? (
              <Alert
                type="error"
                showIcon
                message="教程加载失败"
                description={tutorialError}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {tutorialSections.map((section) => (
                  <div key={section.key} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Typography.Text strong>{section.title}</Typography.Text>
                      <Typography.Link href={section.linkUrl} target="_blank">
                        {section.linkText}：{section.linkUrl}
                      </Typography.Link>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: 12,
                      }}
                    >
                      {section.steps.map((step, index) => (
                        <div
                          key={step.id}
                          style={{
                            border: '1px solid #e6eaf3',
                            borderRadius: 12,
                            padding: 10,
                            background: '#fff',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                          }}
                        >
                          <Typography.Text strong>
                            步骤 {index + 1}：{step.title}
                          </Typography.Text>
                          <Typography.Text type="secondary">{step.description}</Typography.Text>
                          <Image
                            src={withApiBase(step.imageUrl)}
                            alt={step.title}
                            style={{ width: '100%', borderRadius: 8 }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
