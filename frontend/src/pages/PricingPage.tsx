import { useNavigate } from 'react-router-dom'
import { useRequireAuth } from '../store/AppStore'
import { FadeIn, Footer, Navbar, PageShell } from './_shared'

export default function PricingPage() {
  const isLoggedIn = useRequireAuth()
  const navigate = useNavigate()

  return (
    <PageShell>
      <Navbar isLoggedIn={!!isLoggedIn} />

      {/* ── Page header ── */}
      <section className="pt-[100px] pb-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <FadeIn delay={0}>
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-semibold mb-5"
              style={{ background: '#eeecff', border: '1px solid #d4d0ff', color: '#4f46e5' }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4f46e5' }} />
              定价
            </div>
          </FadeIn>
          <FadeIn delay={60}>
            <h1
              className="text-4xl sm:text-5xl font-bold mb-4"
              style={{ color: '#1f2433', letterSpacing: '-0.03em', lineHeight: 1.1 }}
            >
              简单透明
            </h1>
          </FadeIn>
          <FadeIn delay={120}>
            <p className="text-[16px] leading-relaxed" style={{ color: '#5d6377' }}>
              Lumislide 本身不收取任何使用费用，注册即可使用全部功能
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Pricing card ── */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg">
          <FadeIn delay={80}>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'white',
                border: '1px solid #e7e9f1',
                boxShadow: '0 8px 32px rgba(79,70,229,0.08)',
              }}
            >
              {/* Card header */}
              <div
                className="px-8 py-8 text-center"
                style={{
                  background: 'linear-gradient(135deg, #f0f2ff 0%, #f5f3ff 50%, #eef6ff 100%)',
                  borderBottom: '1px solid #e7e9f1',
                }}
              >
                <p className="text-[13px] font-semibold mb-3" style={{ color: '#4f46e5', letterSpacing: '0.04em' }}>
                  LUMISLIDE
                </p>
                <div
                  className="text-6xl font-bold mb-2"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5, #7c6cff)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.04em',
                  }}
                >
                  ¥0
                </div>
                <p className="text-[14px]" style={{ color: '#7d8497' }}>注册即用，无需信用卡</p>
              </div>

              {/* Included features */}
              <div className="px-8 py-6">
                <p className="text-[12px] font-semibold mb-4 tracking-wider uppercase" style={{ color: '#a0a8bc' }}>
                  包含功能
                </p>
                <div className="flex flex-col gap-3 mb-6">
                  {[
                    '无限项目创建',
                    '多格式素材上传（PDF / Word / TXT / Markdown）',
                    '30+ 专业演示模板',
                    'AI 对话式内容编辑',
                    'PPTX 一键导出',
                    '数据加密存储',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: '#eeecff' }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M20 6L9 17L4 12" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className="text-[13px] leading-relaxed" style={{ color: '#3d4456' }}>{item}</span>
                    </div>
                  ))}
                </div>

                {/* Divider */}
                <div className="my-5" style={{ borderTop: '1px solid #ebedf4' }} />

                {/* Model config notice */}
                <div
                  className="rounded-xl p-4 mb-6"
                  style={{
                    background: 'linear-gradient(135deg, #fefce8 0%, #fff7ed 100%)',
                    border: '1px solid #fde68a',
                  }}
                >
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-0.5">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.46 18.63 1.46 19.37 1.82 20C2.18 20.63 2.86 21 3.58 21H20.42C21.14 21 21.82 20.63 22.18 20C22.54 19.37 22.54 18.63 22.18 18L13.71 3.86C13.35 3.23 12.67 2.86 11.95 2.86C11.23 2.86 10.55 3.23 10.19 3.86H10.29Z" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold mb-1" style={{ color: '#92400e' }}>
                        AI 模型需自行配置
                      </p>
                      <p className="text-[12px] leading-relaxed" style={{ color: '#a16207' }}>
                        分析模型和生图模型需按照系统内的指引自行配置 API Key。
                        模型调用费用由对应服务商（如 OpenAI、Anthropic 等）收取，与 Lumislide 无关。
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate(isLoggedIn ? '/projects' : '/register')}
                  className="w-full py-3.5 rounded-xl text-[14px] font-semibold cursor-pointer transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6d63ff 100%)',
                    color: 'white',
                    boxShadow: '0 6px 20px rgba(79,70,229,0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 10px 28px rgba(79,70,229,0.42)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.3)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  {isLoggedIn ? '进入控制台' : '立即注册使用'}
                </button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <FadeIn>
            <h2
              className="text-2xl font-bold mb-8 text-center"
              style={{ color: '#1f2433', letterSpacing: '-0.02em' }}
            >
              常见问题
            </h2>
          </FadeIn>
          <div className="flex flex-col gap-4">
            {[
              {
                q: 'Lumislide 真的完全免费吗？',
                a: '是的，Lumislide 平台本身不收取任何费用。你只需要自行配置 AI 模型的 API Key，模型调用费用由对应的 AI 服务商收取。',
              },
              {
                q: '需要配置哪些 AI 模型？',
                a: '需要配置两类模型：分析模型（用于理解和处理素材内容）和生图模型（用于生成演示配图）。系统内有详细的配置指引，支持 OpenAI、Anthropic 等主流服务商。',
              },
              {
                q: '我的数据安全吗？',
                a: '所有项目数据均加密存储，项目之间完全隔离。你的素材和生成内容只有你自己可以访问。',
              },
              {
                q: '导出的 PPTX 可以直接编辑吗？',
                a: '可以。导出的是标准 .pptx 格式文件，可以在 PowerPoint、WPS、Keynote 等软件中直接打开和编辑。',
              },
            ].map(({ q, a }, i) => (
              <FadeIn key={i} delay={i * 60}>
                <div
                  className="rounded-xl p-5"
                  style={{ background: 'white', border: '1px solid #e7e9f1' }}
                >
                  <p className="text-[14px] font-semibold mb-2" style={{ color: '#1f2433' }}>{q}</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: '#7d8497' }}>{a}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </PageShell>
  )
}
