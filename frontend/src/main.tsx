import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App as AntApp, ConfigProvider, theme } from 'antd'
import 'antd/dist/reset.css'
import './index.css'
import App from './App'
import { AppStoreProvider } from './store/AppStore'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#4f46e5',
          colorInfo: '#4f46e5',
          colorSuccess: '#1eae67',
          colorWarning: '#dd9f16',
          colorError: '#db4f4f',
          borderRadius: 12,
          fontSize: 14,
          wireframe: false,
          controlHeight: 38,
        },
        components: {
          Layout: {
            headerBg: '#f9fafe',
            bodyBg: 'transparent',
          },
          Card: {
            borderRadiusLG: 14,
          },
          Button: {
            borderRadius: 10,
            primaryShadow: 'none',
          },
          Table: {
            headerBg: '#f4f6fd',
            borderColor: '#eaedf5',
          },
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <AppStoreProvider>
            <App />
          </AppStoreProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
)
