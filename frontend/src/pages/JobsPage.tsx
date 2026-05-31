import { ClockCircleOutlined, DeleteOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons'
import {
  Alert,
  App,
  Button,
  Modal,
  Progress,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  type TableProps,
} from 'antd'
import { Navigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { apiGet } from '../lib/http'
import { useJobsData, useRequireAuth } from '../store/AppStore'
import type { JobDTO, JobEventDTO, JobItem } from '../types/app'

const jobStatusColor = {
  queued: 'default',
  running: 'processing',
  succeeded: 'success',
  failed: 'error',
  canceled: 'default',
} as const

export default function JobsPage() {
  const { message } = App.useApp()
  const isLoggedIn = useRequireAuth()
  const { displayedJobs, showOnlyFailedJobs, setShowOnlyFailedJobs, retryJob, cancelJob, deleteJob, statusText } =
    useJobsData()
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [jobDetail, setJobDetail] = useState<JobDTO | null>(null)
  const [jobEvents, setJobEvents] = useState<JobEventDTO[]>([])
  const [deletingJobId, setDeletingJobId] = useState('')
  const detailSeq = useRef(0)

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  const isLiveJob = jobDetail?.status === 'queued' || jobDetail?.status === 'running'

  function handleRetryJob(jobId: string) {
    void retryJob(jobId).catch((error) => {
      const msg = error instanceof Error ? error.message : '任务重试失败'
      void message.warning(msg)
    })
  }

  function handleCancelJob(jobId: string) {
    void cancelJob(jobId)
      .then(() => {
        void message.success('任务已取消')
        if (selectedJobId === jobId) {
          void loadJobDetail(jobId, true)
        }
      })
      .catch((error) => {
        const msg = error instanceof Error ? error.message : '任务取消失败'
        void message.warning(msg)
      })
  }

  function handleDeleteJob(jobId: string) {
    void deleteJob(jobId)
      .then(() => {
        void message.success('任务已删除')
        if (selectedJobId === jobId) {
          setDetailOpen(false)
        }
      })
      .catch((error) => {
        const msg = error instanceof Error ? error.message : '任务删除失败'
        void message.warning(msg)
      })
      .finally(() => {
        setDeletingJobId('')
      })
  }

  async function loadJobDetail(jobId: string, silent = false) {
    const seq = detailSeq.current + 1
    detailSeq.current = seq

    if (!silent) {
      setDetailLoading(true)
      setDetailError('')
    }

    try {
      const [job, events] = await Promise.all([
        apiGet<JobDTO>(`/api/jobs/${jobId}`),
        apiGet<JobEventDTO[]>(`/api/jobs/${jobId}/events`),
      ])

      if (detailSeq.current !== seq) return
      setJobDetail(job)
      setJobEvents(events)
    } catch (error) {
      if (detailSeq.current !== seq) return
      const msg = error instanceof Error ? error.message : '加载任务详情失败'
      setDetailError(msg)
      if (!silent) {
        void message.error(msg)
      }
    } finally {
      if (detailSeq.current === seq && !silent) {
        setDetailLoading(false)
      }
    }
  }

  function openDetail(jobId: string) {
    setSelectedJobId(jobId)
    setDetailOpen(true)
    setJobDetail(null)
    setJobEvents([])
    setDetailError('')
    void loadJobDetail(jobId)
  }

  function formatEventTime(iso: string) {
    const ts = new Date(iso)
    if (Number.isNaN(ts.getTime())) return iso
    return ts.toLocaleString()
  }

  useEffect(() => {
    if (!detailOpen || !selectedJobId || !isLiveJob) return

    const timer = window.setInterval(() => {
      void loadJobDetail(selectedJobId, true)
    }, 3000)

    return () => {
      window.clearInterval(timer)
    }
  }, [detailOpen, selectedJobId, isLiveJob])

  const columns: TableProps<JobItem>['columns'] = [
    {
      title: '任务信息',
      key: 'task',
      render: (_value, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{record.projectName}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.type}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: JobItem['status']) => (
        <Tag color={jobStatusColor[status]} style={{ borderRadius: 999, marginInlineEnd: 0 }}>
          {statusText(status)}
        </Tag>
      ),
    },
    {
      title: '进度',
      key: 'progress',
      width: 220,
      render: (_value, record) => <Progress percent={record.progress} strokeColor="#5d52f5" size="small" />,
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (value: string) => (
        <Space size={4}>
          <ClockCircleOutlined style={{ color: '#8f96aa' }} />
          <span>{value}</span>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      align: 'center',
      render: (_value, record) => (
        <Space size={4}>
          <Button type="text" onClick={() => openDetail(record.id)}>
            详情
          </Button>
          {record.status === 'queued' ? (
            <Button type="text" icon={<StopOutlined />} onClick={() => handleCancelJob(record.id)}>
              取消
            </Button>
          ) : null}
          {record.retryable ? (
            <Button type="text" icon={<ReloadOutlined />} onClick={() => handleRetryJob(record.id)}>
              重试
            </Button>
          ) : null}
          {record.status === 'succeeded' || record.status === 'failed' || record.status === 'canceled' ? (
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setDeletingJobId(record.id)}>
              删除
            </Button>
          ) : null}
        </Space>
      ),
    },
  ]

  return (
    <div className="page-shell">
      <div className="jobs-shell">
        <div className="panel-header-row" style={{ marginBottom: 12 }}>
          <div>
            <Typography.Title className="panel-title" level={4}>
              任务中心
            </Typography.Title>
          </div>

          <Space>
            <Typography.Text type="secondary">仅看失败任务</Typography.Text>
            <Switch checked={showOnlyFailedJobs} onChange={setShowOnlyFailedJobs} />
          </Space>
        </div>

        <Table<JobItem>
          rowKey="id"
          columns={columns}
          dataSource={displayedJobs}
          pagination={{ pageSize: 8 }}
          bordered={false}
        />
      </div>

      <Modal
        title="任务详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        width={900}
        footer={[
          jobDetail?.status === 'queued' ? (
            <Button key="cancel" icon={<StopOutlined />} onClick={() => handleCancelJob(jobDetail.id)}>
              取消任务
            </Button>
          ) : null,
          jobDetail?.status === 'failed' ? (
            <Button key="retry" icon={<ReloadOutlined />} onClick={() => handleRetryJob(jobDetail.id)}>
              重试任务
            </Button>
          ) : null,
          jobDetail &&
          (jobDetail.status === 'succeeded' ||
            jobDetail.status === 'failed' ||
            jobDetail.status === 'canceled') ? (
            <Button key="delete" danger icon={<DeleteOutlined />} onClick={() => setDeletingJobId(jobDetail.id)}>
              删除任务
            </Button>
          ) : null,
          <Button
            key="refresh"
            onClick={() => {
              if (selectedJobId) {
                void loadJobDetail(selectedJobId)
              }
            }}
          >
            刷新
          </Button>,
          <Button key="close" type="primary" onClick={() => setDetailOpen(false)}>
            关闭
          </Button>,
        ]}
      >
        {detailLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <Spin />
          </div>
        ) : detailError ? (
          <Alert type="error" showIcon message="加载失败" description={detailError} />
        ) : jobDetail ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag>Job ID: {jobDetail.id}</Tag>
              <Tag color={jobStatusColor[jobDetail.status]}>{statusText(jobDetail.status)}</Tag>
              <Tag>{jobDetail.type}</Tag>
              <Tag color="blue">进度 {jobDetail.progress}%</Tag>
            </Space>

            {jobDetail.errorMessage ? (
              <Alert type="error" showIcon message="失败原因" description={jobDetail.errorMessage} />
            ) : null}

            <div>
              <Typography.Text strong>Payload</Typography.Text>
              <pre className="source-preview-block">{JSON.stringify(jobDetail.payload || {}, null, 2)}</pre>
            </div>

            <div>
              <Typography.Text strong>Result</Typography.Text>
              <pre className="source-preview-block">{JSON.stringify(jobDetail.result || {}, null, 2)}</pre>
            </div>

            <div>
              <Space style={{ marginBottom: 6 }}>
                <Typography.Text strong>事件日志</Typography.Text>
                <Tag color="default">{jobEvents.length}</Tag>
              </Space>
              {jobEvents.length === 0 ? (
                <Typography.Text type="secondary">暂无事件</Typography.Text>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {jobEvents.map((event) => (
                    <div
                      key={event.id}
                      style={{
                        border: '1px solid #e8ecf5',
                        borderRadius: 10,
                        padding: '8px 10px',
                        background: '#fff',
                      }}
                    >
                      <Space size={8} wrap>
                        <Tag color="processing">{event.event}</Tag>
                        <Typography.Text type="secondary">{formatEventTime(event.timestamp)}</Typography.Text>
                      </Space>
                      <div style={{ marginTop: 4 }}>{event.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Space>
        ) : (
          <Typography.Text type="secondary">请选择任务查看详情</Typography.Text>
        )}
      </Modal>

      <Modal
        title="删除任务"
        open={Boolean(deletingJobId)}
        onCancel={() => setDeletingJobId('')}
        onOk={() => {
          if (deletingJobId) {
            handleDeleteJob(deletingJobId)
          }
        }}
        okButtonProps={{ danger: true }}
        okText="删除"
        cancelText="取消"
      >
        <Typography.Text>
          确定删除任务「{deletingJobId || ''}」吗？删除后仅移除任务记录与日志，已生成的文件不会被删除。
        </Typography.Text>
      </Modal>
    </div>
  )
}
