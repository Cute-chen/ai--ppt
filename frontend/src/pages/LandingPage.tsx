import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRequireAuth } from '../store/AppStore'

// ── Animated gradient orbs background ──────────────────────────────────────
function BackgroundOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {/* Large blue orb top-left */}
      <div
        className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'float1 12s ease-in-out infinite',
        }}
      />
      {/* Orange orb top-right */}
      <div
        className="absolute -top-20 right-0 w-[500px] h-[500px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, #F97316 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'float2 15s ease-in-out infinite',
        }}
      />
      {/* Purple orb center */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)',
          filter: 'blur(100px)',
          animation: 'float3 18s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 30px) scale(1.05); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 40px) scale(0.95); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-48%, -52%) scale(1.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  )
}

// ── PPT Preview Card ────────────────────────────────────────────────────────
function PptPreviewCard() {
  return (
    <div
      className="relative w-full max-w-lg mx-auto rounded-2xl overflow-hidden"
      style={{
        background: 'white',
        boxShadow: '0 32px 80px rgba(37,99,235,0.18), 0 8px 24px rgba(0,0,0,0.08)',
        border: '1px solid rgba(226,232,240,0.8)',
        aspectRatio: '16/10',
      }}
    >
      {/* Slide header bar */}
      <div className="flex items-center gap-1.5 px-4 py-3" style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <div className="w-3 h-3 rounded-full" style={{ background: '#FC5C65' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#FED330' }} />
        <div className="w-3 h-3 rounded-full" style={{ background: '#26DE81' }} />
        <div className="flex-1 mx-4 h-5 rounded-md" style={{ background: '#E2E8F0' }} />
      </div>
      {/* Slide content */}
      <div className="p-6 h-full" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 100%)' }}>
        {/* Title slide mockup */}
        <div className="flex flex-col gap-3">
          <div className="h-2 w-16 rounded-full" style={{ background: '#2563EB', opacity: 0.5 }} />
          <div className="h-5 w-3/4 rounded-lg" style={{ background: 'linear-gradient(90deg, #2563EB, #7C3AED)', opacity: 0.85 }} />
          <div className="h-3 w-1/2 rounded-md" style={{ background: '#94A3B8' }} />
          <div className="mt-2 grid grid-cols-3 gap-3">
            {[0.9, 0.7, 0.8].map((op, i) => (
              <div key={i} className="rounded-xl p-3" style={{ background: `rgba(37,99,235,${op * 0.08})`, border: '1px solid rgba(37,99,235,0.12)' }}>
                <div className="h-2 w-8 rounded mb-2" style={{ background: '#2563EB', opacity: op * 0.6 }} />
                <div className="h-1.5 w-full rounded mb-1" style={{ background: '#94A3B8', opacity: 0.5 }} />
                <div className="h-1.5 w-3/4 rounded" style={{ background: '#94A3B8', opacity: 0.4 }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-2">
            <div className="h-1.5 flex-1 rounded" style={{ background: '#E2E8F0' }} />
            <div className="h-1.5 w-1/3 rounded" style={{ background: '#E2E8F0' }} />
          </div>
        </div>
        {/* AI badge */}
        <div
          className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
            color: 'white',
            boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white" />
          </svg>
          AI 生成
        </div>
      </div>
    </div>
  )
}

// ── Navbar ──────────────────────────────────────────────────────────────────
function Navbar({ isLoggedIn }: { isLoggedIn: boolean }) {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="fixed top-4 left-4 right-4 z-50 transition-all duration-300"
      style={{ maxWidth: 'calc(100vw - 2rem)' }}
    >
      <nav
        className="mx-auto max-w-7xl rounded-2xl px-6 py-3 flex items-center justify-between transition-all duration-300"
        style={{
          background: scrolled
            ? 'rgba(255,255,255,0.85)'
            : 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(226,232,240,0.8)',
          boxShadow: scrolled
            ? '0 8px 32px rgba(37,99,235,0.08)'
            : '0 2px 12px rgba(0,0,0,0.04)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="8" height="6" rx="1.5" fill="white" opacity="0.9" />
              <rect x="13" y="3" width="8" height="6" rx="1.5" fill="white" opacity="0.6" />
              <rect x="3" y="11" width="18" height="4" rx="1.5" fill="white" opacity="0.8" />
              <rect x="3" y="17" width="12" height="4" rx="1.5" fill="white" opacity="0.5" />
            </svg>
          </div>
          <span
            className="text-lg font-semibold tracking-tight"
            style={{ color: '#1E293B', fontFamily: "'Poppins', sans-serif" }}
          >
            SlideAI
          </span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          {['功能', '定价', '案例'].map((item) => (
            <a
              key={item}
              href={`#${item}`}
              className="text-sm font-medium transition-colors duration-200 cursor-pointer"
              style={{ color: '#475569' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
            >
              {item}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                color: 'white',
                boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,99,235,0.45)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,0.3)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1" fill="white" />
                <rect x="14" y="3" width="7" height="7" rx="1" fill="white" opacity="0.7" />
                <rect x="3" y="14" width="7" height="7" rx="1" fill="white" opacity="0.7" />
                <rect x="14" y="14" width="7" height="7" rx="1" fill="white" opacity="0.5" />
              </svg>
              控制台
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200"
                style={{ color: '#475569', border: '1px solid #E2E8F0' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#2563EB'
                  e.currentTarget.style.borderColor = '#2563EB'
                  e.currentTarget.style.background = 'rgba(37,99,235,0.04)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#475569'
                  e.currentTarget.style.borderColor = '#E2E8F0'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                登录
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                  color: 'white',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,99,235,0.45)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,0.3)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                免费开始
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

// ── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({
  icon,
  title,
  desc,
  delay = 0,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  delay?: number
}) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.15 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className="group rounded-2xl p-6 cursor-default transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(226,232,240,0.8)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms, box-shadow 0.2s ease`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(37,99,235,0.12)'
        e.currentTarget.style.borderColor = 'rgba(37,99,235,0.2)'
        e.currentTarget.style.transform = 'translateY(-4px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.04)'
        e.currentTarget.style.borderColor = 'rgba(226,232,240,0.8)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
        style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(124,58,237,0.1) 100%)' }}
      >
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-2" style={{ color: '#1E293B', fontFamily: "'Poppins', sans-serif" }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>
        {desc}
      </p>
    </div>
  )
}

// ── Stat Badge ────────────────────────────────────────────────────────────────
function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div
        className="text-3xl font-bold mb-1"
        style={{
          fontFamily: "'Poppins', sans-serif",
          background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {value}
      </div>
      <div className="text-sm" style={{ color: '#64748B' }}>{label}</div>
    </div>
  )
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const isLoggedIn = useRequireAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC', fontFamily: "'Open Sans', sans-serif" }}>
      {/* Google Fonts */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap"
      />

      <BackgroundOrbs />
      <Navbar isLoggedIn={!!isLoggedIn} />

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: copy */}
            <div>
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
                style={{
                  background: 'rgba(37,99,235,0.08)',
                  border: '1px solid rgba(37,99,235,0.2)',
                  color: '#2563EB',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#2563EB" />
                </svg>
                AI 驱动的演示文稿生成器
              </div>

              {/* Headline */}
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
                style={{ color: '#1E293B', fontFamily: "'Poppins', sans-serif" }}
              >
                上传素材，
                <br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  AI 秒出 PPT
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg leading-relaxed mb-8 max-w-lg" style={{ color: '#475569' }}>
                只需上传 PDF、Word 或文本素材，AI 自动分析内容、提炼结构、生成专业演示文稿。
                告别手动排版，专注于你的核心想法。
              </p>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-4 mb-10">
                <button
                  onClick={() => navigate(isLoggedIn ? '/projects' : '/register')}
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold cursor-pointer transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                    color: 'white',
                    boxShadow: '0 6px 20px rgba(37,99,235,0.35)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(37,99,235,0.5)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,99,235,0.35)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  {isLoggedIn ? '进入控制台' : '免费开始使用'}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12H19M13 6L19 12L13 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={() => navigate('/templates')}
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold cursor-pointer transition-all duration-200"
                  style={{
                    background: 'white',
                    color: '#1E293B',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#2563EB'
                    e.currentTarget.style.color = '#2563EB'
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0'
                    e.currentTarget.style.color = '#1E293B'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                >
                  查看模板
                </button>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['#2563EB', '#7C3AED', '#F97316', '#10B981'].map((color, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: color, zIndex: 4 - i }}
                    >
                      {['张', '李', '王', '陈'][i]}
                    </div>
                  ))}
                </div>
                <p className="text-sm" style={{ color: '#64748B' }}>
                  <span className="font-semibold" style={{ color: '#1E293B' }}>1,200+</span> 用户已在使用
                </p>
              </div>
            </div>

            {/* Right: preview */}
            <div className="relative">
              <PptPreviewCard />
              {/* Floating badges */}
              <div
                className="absolute -top-4 -right-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{
                  background: 'white',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  color: '#10B981',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 6L9 17L4 12" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                30 秒生成完毕
              </div>
              <div
                className="absolute -bottom-4 -left-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{
                  background: 'white',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  color: '#F97316',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#F97316" />
                </svg>
                智能排版
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div
          className="mx-auto max-w-4xl rounded-2xl px-8 py-8"
          style={{
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-gray-100">
            <StatBadge value="30s" label="平均生成时间" />
            <StatBadge value="50+" label="专业模板" />
            <StatBadge value="1200+" label="活跃用户" />
            <StatBadge value="98%" label="用户满意度" />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="功能" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl font-bold mb-4"
              style={{ color: '#1E293B', fontFamily: "'Poppins', sans-serif" }}
            >
              为什么选择 SlideAI？
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#64748B' }}>
              从素材到演示，全流程 AI 辅助，让你专注于内容本身
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              delay={0}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2V8H20" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              title="多格式素材上传"
              desc="支持 PDF、Word、TXT、Markdown、CSV 等多种格式，AI 自动解析并提取关键信息。"
            />
            <FeatureCard
              delay={80}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              title="AI 智能生成"
              desc="基于大语言模型深度理解内容，自动规划幻灯片结构，生成专业的演示文稿提示词。"
            />
            <FeatureCard
              delay={160}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="#F97316" strokeWidth="2" />
                  <path d="M3 9H21M9 21V9" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
                </svg>
              }
              title="丰富模板库"
              desc="50+ 精心设计的专业模板，覆盖商业汇报、学术报告、产品发布等多种场景。"
            />
            <FeatureCard
              delay={240}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              title="对话式编辑"
              desc="通过自然语言与 AI 对话，随时调整内容、修改结构、优化表达，所见即所得。"
            />
            <FeatureCard
              delay={320}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#7C3AED" strokeWidth="2" />
                  <path d="M2 12H22M12 2C9.33 5.33 8 8.67 8 12C8 15.33 9.33 18.67 12 22C14.67 18.67 16 15.33 16 12C16 8.67 14.67 5.33 12 2Z" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" />
                </svg>
              }
              title="一键导出"
              desc="生成完成后直接导出为 PPTX 格式，兼容 PowerPoint、WPS 等主流演示软件。"
            />
            <FeatureCard
              delay={400}
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#F97316" strokeWidth="2" />
                  <path d="M9 12L11 14L15 10" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              title="安全可靠"
              desc="数据加密存储，项目私密隔离，企业级安全保障，你的内容只属于你。"
            />
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div
          className="mx-auto max-w-4xl rounded-3xl px-8 py-14 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
            boxShadow: '0 24px 64px rgba(37,99,235,0.3)',
          }}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10" style={{ background: 'white', transform: 'translate(-30%, 30%)' }} />

          <h2
            className="text-3xl sm:text-4xl font-bold text-white mb-4 relative"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            准备好了吗？
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-md mx-auto relative">
            立即免费注册，体验 AI 驱动的演示文稿生成
          </p>
          <button
            onClick={() => navigate(isLoggedIn ? '/projects' : '/register')}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold cursor-pointer transition-all duration-200 relative"
            style={{
              background: 'white',
              color: '#2563EB',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'
            }}
          >
            {isLoggedIn ? '进入控制台' : '免费注册'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12H19M13 6L19 12L13 18" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8" style={{ borderTop: '1px solid #E2E8F0' }}>
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="8" height="6" rx="1.5" fill="white" opacity="0.9" />
                <rect x="13" y="3" width="8" height="6" rx="1.5" fill="white" opacity="0.6" />
                <rect x="3" y="11" width="18" height="4" rx="1.5" fill="white" opacity="0.8" />
              </svg>
            </div>
            <span className="text-sm font-semibold" style={{ color: '#1E293B' }}>SlideAI</span>
          </div>
          <p className="text-sm" style={{ color: '#94A3B8' }}>
            © 2026 SlideAI. 保留所有权利。
          </p>
          <div className="flex gap-6">
            {['隐私政策', '服务条款', '联系我们'].map((item) => (
              <a
                key={item}
                href="#"
                className="text-sm transition-colors duration-200 cursor-pointer"
                style={{ color: '#94A3B8' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
