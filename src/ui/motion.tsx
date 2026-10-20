import { useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties } from 'react'

/* spring motion system: interruptible and velocity-aware. each spring
   animates from its current on-screen value.
   hand-rolled, no dependencies, critically damped by default. */

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

interface SpringOpts {
  stiffness?: number
  damping?: number
  precision?: number
}

/** Spring toward `target`. You can re-target any time: motion continues from
 *  the live on-screen value and keeps its velocity. */
export function useSpring(target: number, opts: SpringOpts = {}): number {
  const { stiffness = 170, damping = 26, precision = 0.05 } = opts
  const reduced = useReducedMotion()
  const [value, setValue] = useState(target)
  const state = useRef({ x: target, v: 0 })
  const targetRef = useRef(target)
  targetRef.current = target

  useEffect(() => {
    if (reduced) {
      state.current = { x: targetRef.current, v: 0 }
      setValue(targetRef.current)
      return
    }
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      const s = state.current
      const t = targetRef.current
      // semi-implicit Euler: inherently interruptible, velocity blends on re-target
      const f = -stiffness * (s.x - t) - damping * s.v
      s.v += f * dt
      s.x += s.v * dt
      if (Math.abs(s.x - t) < precision && Math.abs(s.v) < precision) {
        s.x = t
        s.v = 0
        setValue(t)
        return
      }
      setValue(s.x)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced, stiffness, damping, precision, target !== state.current.x])

  return value
}

/** Fade and rise entrance on mount, same path every navigation. */
export function Reveal({
  children,
  delay = 0,
  rise = 14,
  style,
  className,
}: {
  children: ReactNode
  delay?: number
  rise?: number
  style?: CSSProperties
  className?: string
}) {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), delay)
    return () => window.clearTimeout(t)
  }, [delay])
  const opacity = useSpring(shown ? 1 : 0)
  const y = useSpring(shown ? 0 : rise)
  return (
    <div
      className={className}
      style={{
        ...style,
        opacity: reduced ? (shown ? 1 : 0) : opacity,
        transform: reduced ? undefined : `translateY(${y.toFixed(2)}px)`,
        transition: reduced ? 'opacity 200ms ease' : undefined,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}

/** Stagger child entrances by `step` ms so content lands in sequence. */
export function Stagger({ children, step = 60 }: { children: ReactNode; step?: number }) {
  const items = useMemo(() => (Array.isArray(children) ? children : [children]), [children])
  return (
    <>
      {items.map((child, i) => (
        <Reveal key={(child as any)?.key ?? i} delay={i * step}>
          {child}
        </Reveal>
      ))}
    </>
  )
}

/** Animated number that keeps feeding back while scores land. */
export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const v = useSpring(value, { stiffness: 120, damping: 24 })
  return <>{v.toFixed(decimals)}</>
}

/** Shimmer placeholders for loading states. */
export function Skeleton({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />
}

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      <Skeleton style={{ height: 28, width: '42%' }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card" style={{ padding: '1rem 1.25rem' }}>
          <Skeleton style={{ height: 18, width: `${88 - i * 9}%`, marginBottom: 8 }} />
          <Skeleton style={{ height: 14, width: '55%' }} />
        </div>
      ))}
    </div>
  )
}

/** Segmented control for 2-3 exclusive options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label?: string
}) {
  return (
    <span className="inline-flex items-center gap-2">
      {label && <span className="caption">{label}</span>}
      <span className="segmented" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </span>
    </span>
  )
}

/** Bottom sheet: slides up in, dismisses down the same path. */
export function Sheet({
  onClose,
  children,
  labelledBy,
}: {
  onClose: () => void
  children: ReactNode
  labelledBy?: string
}) {
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setOpen(true), 10)
    return () => window.clearTimeout(t)
  }, [])
  // bouncier spring: the open gesture carries momentum
  const y = useSpring(open ? 0 : 60, { stiffness: 210, damping: 26 })
  const scrim = useSpring(open ? 1 : 0, { stiffness: 260, damping: 30 })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose ])

  return (
    <>
      <div
        className="scrim"
        style={{ opacity: reduced ? (open ? 1 : 0) : scrim, transition: reduced ? 'opacity 200ms ease' : undefined }}
        onClick={onClose}
      />
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={reduced ? undefined : { transform: `translateY(${y.toFixed(1)}px)`, willChange: 'transform' }}
      >
        <div className="sheet-grabber" aria-hidden="true" />
        {children}
      </div>
    </>
  )
}
