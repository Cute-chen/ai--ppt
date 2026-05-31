import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import logoSvg from '../assets/lumislide-logo.svg'

// ── Page background shell ────────────────────────────────────────────────────
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: "'PingFang SC', 'SF Pro Text', 'Noto Sans SC', sans-serif",
        background:
          'radial-gradient(1200px 600px at 10% 0%, #f7f8fc 0%, transparent 58%), radial-gradient(900px 500px at 92% 100%, #f5f7ff 0%, transparent 62%), #eceef2',
      }}
    >
      <style>{`
        * { -webkit-font-smoothing: antialiased; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
      {children}
    </div>
  )
}

// ── Fade-in on scroll ────────────────────────────────────────────────────────
export function FadeIn({
  children,
  delay = 0,
  className = '',
  style = {},
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  style?: React.CSSProperties
}) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.08 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(18px)',
        transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── Navbar ───────────────────────────────────────────────────────────────────
export function Navbar({ isLoggedIn }: { isLoggedIn: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const navLinks = [
    { label: '功能', path: '/features' },
    { label: '定价', path: '/pricing' },
  ]

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(250,251,254,0.92)' : 'rgba(250,251,254,0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: scrolled ? '1px solid #e7e9f1' : '1px solid transparent',
        boxShadow: scrolled ? '0 2px 16px rgba(79,70,229,0.06)' : 'none',
      }}
    >
      <nav className="mx-auto max-w-7xl px-6 lg:px-8 h-[60px] flex items-center justify-between">
        {/* Logo */}
        <button
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => navigate('/')}
          aria-label="Lumislide 首页"
        >
          <img src={logoSvg} alt="Lumislide logo" className="w-8 h-8" />
          <span
            className="text-[17px] font-bold tracking-tight"
            style={{ color: '#1f2433', letterSpacing: '-0.02em' }}
          >
            Lumislide
          </span>
        </button>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(({ label, path }) => {
            const active = location.pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="text-[14px] font-medium transition-colors duration-200 cursor-pointer"
                style={{
                  color: active ? '#4f46e5' : '#5d6377',
                  borderBottom: active ? '2px solid #4f46e5' : '2px solid transparent',
                  paddingBottom: '2px',
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? '2px solid #4f46e5' : '2px solid transparent',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#4f46e5' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#5d6377' }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-2.5">
          {isLoggedIn ? (
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold cursor-pointer transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #6d63ff 100%)',
                color: 'white',
                boxShadow: '0 4px 14px rgba(79,70,229,0.28)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.4)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(79,70,229,0.28)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1.5" fill="white" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" fill="white" opacity="0.7" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.7" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.5" />
              </svg>
              控制台
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 rounded-xl text-[13px] font-medium cursor-pointer transition-all duration-200"
                style={{ color: '#5d6377', border: '1px solid #e7e9f1', background: 'white' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#4f46e5'
                  e.currentTarget.style.borderColor = '#c4bfff'
                  e.currentTarget.style.background = '#f5f3ff'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#5d6377'
                  e.currentTarget.style.borderColor = '#e7e9f1'
                  e.currentTarget.style.background = 'white'
                }}
              >
                登录
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold cursor-pointer transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #6d63ff 100%)',
                  color: 'white',
                  boxShadow: '0 4px 14px rgba(79,70,229,0.28)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.4)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(79,70,229,0.28)'
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

// ── Footer ───────────────────────────────────────────────────────────────────
export function Footer() {
  return (
    <footer
      className="py-7 px-6 lg:px-8"
      style={{ borderTop: '1px solid #e7e9f1', background: 'rgba(255,255,255,0.5)' }}
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src={logoSvg} alt="Lumislide" className="w-5 h-5" />
          <span className="text-[13px] font-bold" style={{ color: '#1f2433' }}>Lumislide</span>
        </div>
        <p className="text-[12px]" style={{ color: '#a0a8bc' }}>
          © 2026 Lumislide. 保留所有权利。
        </p>
      </div>
    </footer>
  )
}

// ── PPT Mockup ───────────────────────────────────────────────────────────────
export function PptMockup() {
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        aspectRatio: '16/10',
        background: 'white',
        border: '1px solid #e4e9f5',
        boxShadow: '0 32px 80px rgba(79,70,229,0.14), 0 8px 24px rgba(0,0,0,0.06)',
      }}
    >
      <div
        className="flex items-center gap-1.5 px-4 py-2.5"
        style={{ background: '#f8f9fc', borderBottom: '1px solid #ebedf4' }}
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
        <div className="flex-1 mx-3 h-4 rounded-md" style={{ background: '#ebedf4' }} />
      </div>
      <div
        className="p-5 h-full"
        style={{ background: 'linear-gradient(145deg, #f0f2ff 0%, #f5f3ff 50%, #eef6ff 100%)' }}
      >
        <div className="flex flex-col gap-3">
          <div className="h-1.5 w-12 rounded-full" style={{ background: '#4f46e5', opacity: 0.4 }} />
          <div className="h-5 w-3/4 rounded-lg" style={{ background: 'linear-gradient(90deg, #4f46e5, #7c6cff)', opacity: 0.8 }} />
          <div className="h-2.5 w-1/2 rounded-md" style={{ background: '#a5b4fc', opacity: 0.6 }} />
          <div className="mt-2 grid grid-cols-3 gap-2.5">
            {[{ accent: '#4f46e5' }, { accent: '#7c3aed' }, { accent: '#0ea5e9' }].map(({ accent }, i) => (
              <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(79,70,229,0.1)' }}>
                <div className="h-1.5 w-6 rounded mb-2" style={{ background: accent, opacity: 0.7 }} />
                <div className="h-1 w-full rounded mb-1" style={{ background: '#94a3b8', opacity: 0.4 }} />
                <div className="h-1 w-3/4 rounded" style={{ background: '#94a3b8', opacity: 0.3 }} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-1">
            <div className="h-1 flex-1 rounded" style={{ background: '#e2e8f0' }} />
            <div className="h-1 w-1/3 rounded" style={{ background: '#e2e8f0' }} />
          </div>
        </div>
        <div
          className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c6cff)', color: 'white', boxShadow: '0 4px 12px rgba(79,70,229,0.35)' }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
          AI 生成中
        </div>
      </div>
    </div>
  )
}

// ── Feature Card ─────────────────────────────────────────────────────────────
export function FeatureCard({
  icon,
  title,
  desc,
  delay = 0,
  accentColor = '#4f46e5',
  accentBg = '#eeecff',
}: {
  icon: React.ReactNode
  title: string
  desc: string
  delay?: number
  accentColor?: string
  accentBg?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className="rounded-2xl p-6 cursor-default"
      style={{
        background: 'white',
        border: '1px solid #e7e9f1',
        boxShadow: '0 2px 12px rgba(79,70,229,0.04)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms, box-shadow 0.2s ease, border-color 0.2s ease`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 12px 36px rgba(79,70,229,0.1)'
        e.currentTarget.style.borderColor = '#c4bfff'
        e.currentTarget.style.transform = 'translateY(-3px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(79,70,229,0.04)'
        e.currentTarget.style.borderColor = '#e7e9f1'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: accentBg }}>
        <div style={{ color: accentColor }}>{icon}</div>
      </div>
      <h3 className="text-[15px] font-semibold mb-2" style={{ color: '#1f2433' }}>{title}</h3>
      <p className="text-[13px] leading-relaxed" style={{ color: '#7d8497' }}>{desc}</p>
    </div>
  )
}
