import { useNavigate } from 'react-router-dom'
import { useRequireAuth } from '../store/AppStore'
import { FadeIn, Footer, Navbar, PageShell, PptMockup } from './_shared'

export default function LandingPage() {
  const isLoggedIn = useRequireAuth()
  const navigate = useNavigate()

  return (
    <PageShell>
      <Navbar isLoggedIn={!!isLoggedIn} />

      {/* ── Hero ── */}
      <section className="relative pt-[100px] pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute pointer-events-none"
          aria-hidden="true"
          style={{
            top: '-120px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '900px',
            height: '600px',
            background: 'radial-gradient(ellipse, rgba(79,70,229,0.08) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        <div className="mx-auto max-w-7xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Left */}
            <div>
              <FadeIn delay={0}>
                <div
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-semibold mb-6"
                  style={{
                    background: '#eeecff',
                    border: '1px solid #d4d0ff',
                    color: '#4f46e5',
                    letterSpacing: '0.02em',
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4f46e5' }} />
                  AI 驱动的演示文稿生成器
                </div>
              </FadeIn>

              <FadeIn delay={80}>
                <h1
                  className="text-4xl sm:text-5xl lg:text-[56px] font-bold mb-5"
                  style={{ color: '#1f2433', letterSpacing: '-0.03em', lineHeight: 1.1 }}
                >
                  上传素材，
                  <br />
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c6cff 60%, #38bdf8 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    AI 秒出 PPT
                  </span>
                </h1>
              </FadeIn>

              <FadeIn delay={160}>
                <p className="text-[16px] leading-relaxed mb-6 max-w-lg" style={{ color: '#5d6377' }}>
                  只需上传 PDF、Word 或文本素材，AI 自动分析内容、提炼结构、生成专业演示文稿。
                  告别手动排版，专注于你的核心想法。
                </p>
              </FadeIn>

              <FadeIn delay={240}>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate(isLoggedIn ? '/projects' : '/register')}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold cursor-pointer transition-all duration-200"
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #6d63ff 100%)',
                      color: 'white',
                      boxShadow: '0 6px 20px rgba(79,70,229,0.32)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 10px 28px rgba(79,70,229,0.45)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.32)'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    {isLoggedIn ? '进入控制台' : '免费开始使用'}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 12H19M13 6L19 12L13 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    onClick={() => navigate('/features')}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold cursor-pointer transition-all duration-200"
                    style={{
                      background: 'white',
                      color: '#1f2433',
                      border: '1px solid #e7e9f1',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#c4bfff'
                      e.currentTarget.style.color = '#4f46e5'
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(79,70,229,0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e7e9f1'
                      e.currentTarget.style.color = '#1f2433'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'
                    }}
                  >
                    了解功能
                  </button>
                </div>
              </FadeIn>
            </div>

            {/* Right: mockup */}
            <FadeIn delay={200} className="relative">
              <PptMockup />
              <div
                className="absolute -top-3 -right-3 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold"
                style={{
                  background: 'white',
                  border: '1px solid #e7e9f1',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  color: '#1eae67',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M20 6L9 17L4 12" stroke="#1eae67" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                180s 生成完毕
              </div>
              <div
                className="absolute -bottom-3 -left-3 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold"
                style={{
                  background: 'white',
                  border: '1px solid #e7e9f1',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  color: '#4f46e5',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#4f46e5" />
                </svg>
                智能排版
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-14 px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div
            className="mx-auto max-w-3xl rounded-2xl px-8 py-8"
            style={{
              background: 'white',
              border: '1px solid #e7e9f1',
              boxShadow: '0 4px 24px rgba(79,70,229,0.06)',
            }}
          >
            <div className="grid grid-cols-3 divide-x divide-[#ebedf4]">
              {[
                { value: '180s', label: '平均生成时间' },
                { value: '30+', label: '专业模板' },
                { value: '95%+', label: '用户满意度' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center px-6">
                  <div
                    className="text-3xl lg:text-4xl font-bold mb-1.5"
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5, #7c6cff)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {value}
                  </div>
                  <div className="text-[13px]" style={{ color: '#7d8497' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>
      <Footer />
    </PageShell>
  )
}
