import {
  CheckCircleFilled,
  ClockCircleFilled,
  CompassOutlined,
  FolderAddOutlined,
  RightOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { App, Button, Modal, Space, Typography } from 'antd'
import { Navigate, useNavigate } from 'react-router-dom'
import { useProjectsData, useRequireAuth, useWorkspaceData } from '../store/AppStore'
import type { ProjectItem, SourceItem, JobItem } from '../types/app'

type ProjectMetrics = {
  sourceTotal: number
  jobTotal: number
  runningJobs: number
}

function metricsForProject(project: ProjectItem, sources: SourceItem[], jobs: JobItem[]): ProjectMetrics {
  const targetSources = sources.filter((item) => item.projectName === project.name)
  const targetJobs = jobs.filter((item) => item.projectName === project.name)

  return {
    sourceTotal: targetSources.length,
    jobTotal: targetJobs.length,
    runningJobs: targetJobs.filter((item) => item.status === 'running' || item.status === 'queued').length,
  }
}

function shortTime(updatedAt: string) {
  return updatedAt.replace(/^\d{4}-/, '')
}

function statusIcon(status: ProjectItem['status']) {
  if (status === 'ready') {
    return <CheckCircleFilled />
  }

  if (status === 'generating') {
    return <SyncOutlined spin />
  }

  return <ClockCircleFilled />
}

export default function ProjectsPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const isLoggedIn = useRequireAuth()

  const {
    projects,
    projectModalOpen,
    newProjectName,
    setProjectModalOpen,
    setNewProjectName,
    createProject,
    openProject,
    statusText,
  } = useProjectsData()

  const { sources, jobs, activeProjectId } = useWorkspaceData()

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  function openWorkspace(project: ProjectItem) {
    openProject(project.id)
    void navigate('/workspace')
  }

  function handleCreateProject() {
    if (!newProjectName.trim()) {
      void message.warning('请输入项目名称')
      return
    }

    void createProject()
      .then(() => {
        void message.success('项目创建成功')
      })
      .catch((error) => {
        const msg = error instanceof Error ? error.message : '项目创建失败'
        void message.error(msg)
      })
  }

  return (
    <div className="page-shell">
      <div className="projects-shell">
        <div className="panel-header-row" style={{ marginBottom: 12 }}>
          <div>
            <Typography.Title className="panel-title" level={4}>
              项目列表
            </Typography.Title>
          </div>

          <Button type="primary" icon={<FolderAddOutlined />} onClick={() => setProjectModalOpen(true)}>
            新建项目
          </Button>
        </div>

        <div className="project-list">
          {projects.length === 0 ? (
            <div className="projects-empty">
              <div className="projects-empty-icon">
                <CompassOutlined />
              </div>
              <Typography.Title level={4} className="projects-empty-title">
                还没有项目
              </Typography.Title>
              <Typography.Paragraph className="projects-empty-desc">
                创建一个项目后，你就可以上传素材、让 AI 分析并生成演示文稿。
              </Typography.Paragraph>
              <Button type="primary" icon={<FolderAddOutlined />} onClick={() => setProjectModalOpen(true)}>
                新建第一个项目
              </Button>
            </div>
          ) : (
            projects.map((project) => {
              const metrics = metricsForProject(project, sources, jobs)
              const active = project.id === activeProjectId

              return (
                <div
                  key={project.id}
                  className={`project-card project-card-status-${project.status}${active ? ' project-card-active' : ''}`}
                  onClick={() => openWorkspace(project)}
                >
                  <div className="project-card-main">
                    <div className="project-card-title-row">
                      <Typography.Text strong className="project-card-title">
                        {project.name}
                      </Typography.Text>
                      <span className={`project-status-icon project-status-icon-${project.status}`}>
                        {statusIcon(project.status)}
                      </span>
                    </div>

                    <div className="project-card-meta-row">
                      <Typography.Text className="project-card-meta-item">{statusText(project.status)}</Typography.Text>
                      <Typography.Text className="project-card-meta-sep">·</Typography.Text>
                      <Typography.Text className="project-card-meta-item">{project.slideCount} 页</Typography.Text>
                    </div>

                    <div className="project-card-footer">
                      <Typography.Text className="project-card-footer-text project-card-footer-time">
                        最近编辑 {shortTime(project.updatedAt)}
                      </Typography.Text>
                    </div>
                  </div>

                  <div className="project-card-side">
                    <div className="project-card-stats-grid">
                      <div className="project-stat-chip">
                        <span className="project-stat-label">素材</span>
                        <span className="project-stat-value">{metrics.sourceTotal}</span>
                      </div>
                      <div className="project-stat-chip">
                        <span className="project-stat-label">任务</span>
                        <span className="project-stat-value">{metrics.jobTotal}</span>
                      </div>
                      <div className="project-stat-chip project-stat-chip-full">
                        <span className="project-stat-label">运行中</span>
                        <span className="project-stat-value">{metrics.runningJobs}</span>
                      </div>
                    </div>

                    <div className="project-card-enter">
                      <span>进入工作台</span>
                      <RightOutlined />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <Modal
        title="新建项目"
        open={projectModalOpen}
        onCancel={() => setProjectModalOpen(false)}
        onOk={handleCreateProject}
        okText="创建"
      >
        <Space direction="vertical" size={10} style={{ width: '100%', marginTop: 8 }}>
          <input
            className="native-input"
            placeholder="项目名称"
            value={newProjectName}
            onChange={(event) => setNewProjectName(event.target.value)}
          />
          <Typography.Text type="secondary">创建后自动初始化来源、对话、预览三栏工作区。</Typography.Text>
        </Space>
      </Modal>
    </div>
  )
}
