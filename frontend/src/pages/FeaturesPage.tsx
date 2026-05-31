import { useNavigate } from 'react-router-dom'
import { useRequireAuth } from '../store/AppStore'
import { FadeIn, FeatureCard, Footer, Navbar, PageShell } from './_shared'

export default function FeaturesPage() {
  const isLoggedIn = useRequireAuth()
  const navigate = useNavigate()

  return (
    <PageShell>
      <Navbar isLoggedIn={!!isLoggedIn} />

      {/* ── Page header ── */}
      <section className="pt-[100px] pb-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn delay={0}>
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-semibold mb-5"
              style={{ background: '#eeecff', border: '1px solid #d4d0ff', color: '#4f46e5' }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4f46e5' }} />
              核心能力
            </div>
          </FadeIn>
          <FadeIn delay={60}>
            <h1
              className="text-4xl sm:text-5xl font-bold mb-4"
              style={{ color: '#1f2433', letterSpacing: '-0.03em', lineHeight: 1.1 }}
            >
              为什么选择 Lumislide？
            </h1>
          </FadeIn>
          <FadeIn delay={120}>
            <p className="text-[16px] leading-relaxed" style={{ color: '#5d6377' }}>
              从素材到演示，全流程 AI 辅助，让你专注于内容本身
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Feature grid ── */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              delay={0}
              accentColor="#4f46e5"
              accentBg="#eeecff"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              title="多格式素材上传"
              desc="支持 PDF、Word、TXT、Markdown、CSV 等多种格式，AI 自动解析并提取关键信息，无需手动整理。"
            />
            <FeatureCard
              delay={80}
              accentColor="#7c3aed"
              accentBg="#f3e8ff"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              title="AI 智能生成"
              desc="基于大语言模型深度理解内容语义，自动规划幻灯片层级与叙事逻辑，生成专业的演示文稿提示词。"
            />
            <FeatureCard
              delay={160}
              accentColor="#0ea5e9"
              accentBg="#e0f2fe"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M3 9H21M9 21V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              }
              title="丰富模板库"
              desc="30+ 精心设计的专业模板，覆盖商业汇报、学术报告、产品发布等多种场景，持续更新中。"
            />
            <FeatureCard
              delay={240}
              accentColor="#4f46e5"
              accentBg="#eeecff"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M21 15C21 16.1 20.1 17 19 17H7L3 21V5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              title="对话式编辑"
              desc="通过自然语言与 AI 对话，随时调整内容、修改结构、优化表达。所见即所得，迭代无摩擦。"
            />
            <FeatureCard
              delay={320}
              accentColor="#10b981"
              accentBg="#d1fae5"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22Z" stroke="currentColor" strokeWidth="2" />
                  <path d="M2 12H22M12 2C9.33 5.33 8 8.67 8 12C8 15.33 9.33 18.67 12 22C14.67 18.67 16 15.33 16 12C16 8.67 14.67 5.33 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              }
              title="一键导出 PPTX"
              desc="生成完成后直接导出为标准 PPTX 格式，完全兼容 PowerPoint、WPS 等主流演示软件。"
            />
            <FeatureCard
              delay={400}
              accentColor="#f59e0b"
              accentBg="#fef3c7"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22Z" stroke="currentColor" strokeWidth="2" />
                  <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              title="数据安全隔离"
              desc="端到端加密存储，项目私密隔离，企业级安全保障。你的内容只属于你。"
            />
          </div>
        </div>
      </section>

      {/* ── Workflow steps ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <FadeIn>
            <h2
              className="text-2xl sm:text-3xl font-bold mb-10 text-center"
              style={{ color: '#1f2433', letterSpacing: '-0.025em' }}
            >
              三步完成演示文稿
            </h2>
          </FadeIn>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: '上传素材',
                desc: '将你的 PDF、Word 文档或文本内容上传到项目中',
                color: '#4f46e5',
                bg: '#eeecff',
              },
              {
                step: '02',
                title: 'AI 分析生成',
                desc: 'AI 自动解析内容，规划结构，生成完整的演示文稿提示词',
                color: '#7c3aed',
                bg: '#f3e8ff',
              },
              {
                step: '03',
                title: '导出使用',
                desc: '对话微调满意后，一键导出 PPTX，直接在 PowerPoint 中使用',
                color: '#10b981',
                bg: '#d1fae5',
              },
            ].map(({ step, title, desc, color, bg }, i) => (
              <FadeIn key={step} delay={i * 100}>
                <div
                  className="rounded-2xl p-6"
                  style={{ background: 'white', border: '1px solid #e7e9f1', boxShadow: '0 2px 12px rgba(79,70,229,0.04)' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold mb-4"
                    style={{ background: bg, color }}
                  >
                    {step}
                  </div>
                  <h3 className="text-[15px] font-semibold mb-2" style={{ color: '#1f2433' }}>{title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: '#7d8497' }}>{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <button
              onClick={() => navigate(isLoggedIn ? '/projects' : '/register')}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[14px] font-semibold cursor-pointer transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #6d63ff 100%)',
                color: 'white',
                boxShadow: '0 6px 20px rgba(79,70,229,0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 10px 28px rgba(79,70,229,0.42)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.3)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {isLoggedIn ? '进入控制台' : '立即免费体验'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12H19M13 6L19 12L13 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </FadeIn>
      </section>

      <Footer />
    </PageShell>
  )
}
