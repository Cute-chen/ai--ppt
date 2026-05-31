import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type AuthLink = {
  to: string
  label: string
}

type AuthSceneProps = {
  pageLabel: string
  title: string
  subtitle: string
  heroTitle: string
  heroSubtitle: string
  heroPoints: string[]
  links: AuthLink[]
  note?: ReactNode
  children: ReactNode
}

export default function AuthScene({
  pageLabel,
  title,
  subtitle,
  heroTitle,
  heroSubtitle,
  heroPoints,
  links,
  note,
  children,
}: AuthSceneProps) {
  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <div className="auth-hero-brand">
          <div className="auth-hero-logo">AI</div>
          <span className="auth-hero-brand-name">AI PPT Studio</span>
        </div>

        <div>
          <h1 className="auth-hero-title">{heroTitle}</h1>
          <p className="auth-hero-subtitle">{heroSubtitle}</p>
          <ul className="auth-hero-list">
            {heroPoints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <p className="auth-hero-foot">Powered by AI Studio</p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <header className="auth-card-head">
            <span className="auth-card-tag">{pageLabel}</span>
            <h2 className="auth-card-title">{title}</h2>
            <p className="auth-card-subtitle">{subtitle}</p>
          </header>

          {children}

          <div className="auth-bottom-links">
            {links.map((item) => (
              <Link key={item.to} to={item.to}>
                {item.label}
              </Link>
            ))}
          </div>

          {note ? <div className="auth-note">{note}</div> : null}
        </div>
      </section>
    </div>
  )
}
