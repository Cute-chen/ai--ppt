import LiquidGlass from 'liquid-glass-react'
import {
  AppstoreOutlined,
  FolderOpenOutlined,
  FundProjectionScreenOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { Space, Typography } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import type { CSSProperties } from 'react'

const navItems = [
  { key: 'projects', label: '项目页', path: '/projects', icon: FolderOpenOutlined },
  { key: 'workspace', label: '工作台', path: '/workspace', icon: FundProjectionScreenOutlined },
  { key: 'model-settings', label: '模型设置', path: '/model-settings', icon: SettingOutlined },
  { key: 'jobs', label: '任务中心', path: '/jobs', icon: AppstoreOutlined },
]

function resolveActivePath(pathname: string) {
  const found = navItems.find((item) => pathname.startsWith(item.path))
  return found?.path ?? '/workspace'
}

const containerStyle: CSSProperties = {
  position: 'fixed',
  left: '50%',
  bottom: 26,
  transform: 'translateX(-50%)',
  zIndex: 90,
  pointerEvents: 'auto',
}

export function BottomGlassNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const activePath = resolveActivePath(location.pathname)

  return (
    <div style={containerStyle}>
      <LiquidGlass
        cornerRadius={40}
        padding="8px"
        blurAmount={0.16}
        saturation={150}
        displacementScale={58}
        aberrationIntensity={1.8}
        elasticity={0.26}
        style={{ position: 'relative', top: 0, left: 0 }}
      >
        <Space size={8} wrap>
          {navItems.map((item) => {
            const Icon = item.icon
            const active = item.path === activePath
            return (
              <div
                key={item.key}
                onClick={() => {
                  if (item.path !== activePath) {
                    void navigate(item.path)
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 16,
                  cursor: 'pointer',
                  transition: 'all .22s ease',
                  color: active ? '#08233f' : 'rgba(8, 35, 63, 0.72)',
                  background: active ? 'rgba(255,255,255,0.66)' : 'rgba(255,255,255,0.18)',
                  border: active
                    ? '1px solid rgba(255,255,255,0.75)'
                    : '1px solid rgba(255,255,255,0.28)',
                  boxShadow: active ? 'inset 0 1px 2px rgba(255,255,255,0.72)' : 'none',
                }}
                role="button"
                aria-label={item.label}
              >
                <Icon />
                <Typography.Text
                  style={{
                    color: 'inherit',
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    margin: 0,
                  }}
                >
                  {item.label}
                </Typography.Text>
              </div>
            )
          })}
        </Space>
      </LiquidGlass>
    </div>
  )
}
