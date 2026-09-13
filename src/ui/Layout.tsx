import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { RoleSwitcher } from './RoleSwitcher'

export function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isTeacher = profile?.role === 'teacher'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to={isTeacher ? '/dashboard' : '/student/dashboard'} className="text-xl font-bold text-blue-600">
                Answer Sheet Evaluator
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{profile?.full_name || profile?.id}</span>
              <span className={`badge ${isTeacher ? 'badge-info' : 'badge-success'}`}>
                {isTeacher ? 'Teacher' : 'Student'}
              </span>
              <button onClick={handleSignOut} className="btn-ghost">Sign Out</button>
            </div>
          </div>
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <RoleSwitcher />
    </div>
  )
}