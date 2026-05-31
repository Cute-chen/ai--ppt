import {
  AppstoreOutlined,
  CloseOutlined,
  FolderOpenOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  SkinOutlined,
  SwapOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Avatar, Button, Layout, Modal, Space, Typography } from 'antd'
import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/AppStore'
import logoSvg from '../assets/lumislide-logo.svg'
import { withApiBase } from '../lib/http'

const { Sider, Content } = Layout

const coreNavItems = [
  { key: 'projects', label: '项目列表', path: '/projects', icon: <FolderOpenOutlined /> },
  { key: 'templates', label: '模板库', path: '/templates', icon: <SkinOutlined /> },
  { key: 'jobs', label: '任务中心', path: '/jobs', icon: <AppstoreOutlined /> },
  { key: 'model-settings', label: '模型设置', path: '/model-settings', icon: <SettingOutlined /> },
]

function initials(email: string): string {
  const name = email.split('@')[0] || 'U'
  return String(name[0] || 'U').toUpperCase()
}

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { activeProject, currentUser, logout, analysisConfig, imageConfig } = useAppStore()
  const [wechatOpen, setWechatOpen] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const inWorkspace = location.pathname.startsWith('/workspace')
  const inModelSettings = location.pathname.startsWith('/model-settings')

  // Configured = has a masked key from the server (non-empty), OR user has typed a new key
  const analysisConfigured = analysisConfig.apiKeyMasked.trim().length > 0 || analysisConfig.apiKey.trim().length > 0
  const imageConfigured = imageConfig.keyMasked.trim().length > 0 || imageConfig.key.trim().length > 0
  const isModelConfigured = analysisConfigured && imageConfigured
  const showSetupBanner = !isModelConfigured && !inModelSettings && !bannerDismissed

  const displayEmail = currentUser?.email || 'unknown@user.local'
  const contentClassName = inWorkspace
    ? 'aippt-page-content aippt-page-content-workspace'
    : inModelSettings
      ? 'aippt-page-content aippt-page-content-model-settings'
      : 'aippt-page-content'

  return (
    <Layout className="aippt-layout-root">
      <Sider width={228} className="aippt-sidebar" breakpoint="lg" collapsedWidth={0}>
        <div className="sidebar-logo-wrap">
          <button
            type="button"
            onClick={() => void navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            aria-label="返回首页"
          >
            <img src={logoSvg} alt="Lumislide logo" className="sidebar-logo-image" />
            <Typography.Text strong className="sidebar-logo-text">
              Lumislide
            </Typography.Text>
          </button>
        </div>

        <div className="sidebar-nav-block">
          {coreNavItems.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) =>
                isActive ? 'sidebar-nav-item sidebar-nav-item-active' : 'sidebar-nav-item'
              }
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="sidebar-bottom-area">
          <div className="sidebar-bottom-links">
            <button
              type="button"
              className="sidebar-mini-link sidebar-mini-link-btn"
              onClick={() => setWechatOpen(true)}
            >
              <QuestionCircleOutlined />
              <span>帮助中心</span>
            </button>
          </div>

          <div className="sidebar-user-card">
            <Avatar size={34} icon={<UserOutlined />}>
              {initials(displayEmail)}
            </Avatar>
            <div className="sidebar-user-meta">
              <Typography.Text strong style={{ fontSize: 13 }}>
                已登录用户
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                {displayEmail}
              </Typography.Text>
            </div>
          </div>

          <Button
            type="text"
            className="sidebar-logout-btn"
            icon={<LogoutOutlined />}
            onClick={() => {
              logout()
              void navigate('/login', { replace: true })
            }}
          >
            退出登录
          </Button>
        </div>
      </Sider>

      <Layout className="aippt-main-layout">
        {inWorkspace ? (
          <div className="aippt-topbar">
            <div className="topbar-path">
              <Typography.Text className="topbar-sep">/</Typography.Text>
              <Typography.Text className="topbar-crumb">工作台</Typography.Text>
              <Typography.Text className="topbar-sep">/</Typography.Text>
              <Typography.Text className="topbar-project-name">
                {activeProject?.name ?? '未选择项目'}
              </Typography.Text>
            </div>

            <Space size={6}>
              <Button
                size="small"
                className="topbar-switch-btn"
                icon={<SwapOutlined />}
                onClick={() => void navigate('/projects')}
              >
                切换项目
              </Button>
            </Space>
          </div>
        ) : null}

        <Content className={contentClassName}>
          {showSetupBanner && (
            <div
              style={{
                margin: '0 0 12px 0',
                padding: '12px 16px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #eeecff 0%, #e8f4ff 100%)',
                border: '1px solid #c4bfff',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #4f46e5, #6d63ff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SettingOutlined style={{ color: 'white', fontSize: 14 }} />
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Text strong style={{ fontSize: 13, color: '#1f2433', display: 'block' }}>
                  还差一步——配置 AI 模型
                </Typography.Text>
                <Typography.Text style={{ fontSize: 12, color: '#5d6377' }}>
                  {!analysisConfigured && !imageConfigured
                    ? '分析模型和生图模型均未配置，配置后才能正常使用 AI 功能'
                    : !analysisConfigured
                      ? '分析模型尚未配置，配置后才能解析素材和生成内容'
                      : '生图模型尚未配置，配置后才能为演示文稿生成配图'}
                </Typography.Text>
              </div>

              {/* CTA */}
              <Button
                type="primary"
                size="small"
                icon={<SettingOutlined />}
                onClick={() => void navigate('/model-settings')}
                style={{
                  background: 'linear-gradient(135deg, #4f46e5, #6d63ff)',
                  border: 'none',
                  borderRadius: 8,
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
                }}
              >
                立即配置
              </Button>

              {/* Dismiss */}
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  color: '#a0a8bc',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="关闭提示"
              >
                <CloseOutlined style={{ fontSize: 12 }} />
              </button>
            </div>
          )}
          <Outlet />
        </Content>
      </Layout>

      <Modal
        title="帮助中心（微信）"
        open={wechatOpen}
        footer={null}
        onCancel={() => setWechatOpen(false)}
        centered
      >
        <div className="wechat-help-wrap">
          <img src={withApiBase('/api/wechat/qrcode.png')} alt="微信二维码" className="wechat-help-image" />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            扫码添加微信获取帮助支持
          </Typography.Text>
        </div>
      </Modal>
    </Layout>
  )
}
