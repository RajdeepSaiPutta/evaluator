import { useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { RoleSwitcher } from './RoleSwitcher'
import { Reveal } from './motion'

export function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    // No login screen yet — return to the start of the app instead.
    navigate('/')
  }

  const isTeacher = profile?.role === 'teacher'

  return (
    <div style={{ minHeight: '100vh' }}>
      <header className="toolbar" data-scrolled={scrolled}>
        <nav className="mx-auto px-4 sm:px-6 lg:px-8" style={{ maxWidth: '72rem' }} aria-label="Main navigation">
          <div className="flex justify-between" style={{ height: 60 }}>
            <div className="flex items-center gap-6">
              <Link
                to={isTeacher ? '/dashboard' : '/student/dashboard'}
                className="title-3"
                style={{ color: 'var(--ink)', textDecoration: 'none', letterSpacing: '-0.01em' }}
              >
                Evaluator
              </Link>
              <Link
                to="/demo/local-grade"
                className="caption row-press"
                style={{
                  textDecoration: 'none',
                  padding: '0.35rem 0.8rem',
                  borderRadius: 999,
                  background: location.pathname.startsWith('/demo') ? 'rgba(0,113,227,0.1)' : 'transparent',
                  color: location.pathname.startsWith('/demo') ? 'var(--blue-dark)' : 'var(--ink-2)',
                  fontWeight: 600,
                }}
              >
                Local Demo
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <span className="caption" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name || profile?.id}
              </span>
              <span className={`pill ${isTeacher ? 'pill-info' : 'pill-success'}`}>
                {isTeacher ? 'Teacher' : 'Student'}
              </span>
              <button onClick={handleSignOut} className="btn-ghost" style={{ padding: '0.4rem 0.7rem', fontSize: '0.8125rem' }}>
                Sign Out
              </button>
            </div>
          </div>
        </nav>
      </header>
      <main className="mx-auto px-4 sm:px-6 lg:px-8" style={{ maxWidth: '72rem', paddingTop: '2rem', paddingBottom: '5rem' }}>
        {/* Enter along the same path on every navigation */}
        <Reveal key={location.pathname} rise={10}>
          <Outlet />
        </Reveal>
      </main>
      <RoleSwitcher />
    </div>
  )
}
