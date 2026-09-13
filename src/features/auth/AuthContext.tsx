import { createContext, useContext, useState, ReactNode } from 'react'
import { type Profile } from '../../lib/supabase'

type AuthContextType = {
  user: { id: string; email: string } | null
  session: null | { user: { id: string; email: string } }
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, role: 'teacher' | 'student', teacherId?: string) => Promise<void>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  refreshProfile: () => Promise<void>
  switchRole: (role: 'teacher' | 'student') => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const mockTeacherProfile: Profile = {
  id: 'mock-teacher-id',
  email: 'teacher@test.com',
  role: 'teacher',
  teacher_id: null,
  full_name: 'Test Teacher',
  app_metadata: { role: 'teacher', onboarded: true },
  created_at: new Date().toISOString(),
}

const mockStudentProfile: Profile = {
  id: 'mock-student-id',
  email: 'student@test.com',
  role: 'student',
  teacher_id: 'mock-teacher-id',
  full_name: 'Test Student',
  app_metadata: { role: 'student', teacher_id: 'mock-teacher-id', onboarded: true },
  created_at: new Date().toISOString(),
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(mockTeacherProfile)
  const [user] = useState({ id: 'mock-teacher-id', email: 'teacher@test.com' })

  const switchRole = (role: 'teacher' | 'student') => {
    setProfile(role === 'teacher' ? mockTeacherProfile : mockStudentProfile)
  }

  const noop = async () => {}

  const session = { user }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading: false,
      signIn: noop,
      signUp: noop,
      signOut: noop,
      sendPasswordReset: noop,
      updatePassword: noop,
      refreshProfile: noop,
      switchRole,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}