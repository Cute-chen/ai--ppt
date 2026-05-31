import {
  AppstoreOutlined,
  BorderOutlined,
  FolderOpenOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  SkinOutlined,
  SwapOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Avatar, Button, Layout, Space, Typography } from 'antd'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/AppStore'

const { Sider, Content } = Layout

const coreNavItems = [
  { key: 'projects', label: '项目列表', path: '/projects', icon: <FolderOpenOutlined /> },
  { key: 'workspace', label: '工作台', path: '/workspace', icon: <BorderOutlined /> },
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
  const { activeProject, currentUser, logout } = useAppStore()
  const inWorkspace = location.pathname.startsWith('/workspace')
  const inModelSettings = location.pathname.startsWith('/model-settings')

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
          <div className="sidebar-logo-icon">P</div>
          <Typography.Text strong className="sidebar-logo-text">
            AI PPT
          </Typography.Text>
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
            <div className="sidebar-mini-link">
              <QuestionCircleOutlined />
              <span>帮助中心</span>
            </div>
            <div className="sidebar-mini-link">
              <SettingOutlined />
              <span>设置</span>
            </div>
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
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
