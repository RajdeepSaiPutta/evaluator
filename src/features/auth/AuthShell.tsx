import type { ReactNode } from 'react'
import { Reveal } from '../../ui/motion'

/** Centered glass card for auth screens. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div
      className="flex items-center justify-center px-4 sm:px-6"
      style={{ minHeight: '100vh', paddingTop: 48, paddingBottom: 48 }}
    >
      <Reveal rise={10}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div className="text-center" style={{ marginBottom: 24 }}>
            <p className="title-3" style={{ color: 'var(--blue)', marginBottom: 8 }}>Evaluator</p>
            <h1 className="display" style={{ fontSize: '1.9rem' }}>{title}</h1>
            {subtitle && <p className="caption" style={{ marginTop: 6 }}>{subtitle}</p>}
          </div>
          <div className="card">{children}</div>
        </div>
      </Reveal>
    </div>
  )
}
