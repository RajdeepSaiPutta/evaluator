import { useAuth } from '../features/auth/AuthContext'

export function RoleSwitcher() {
  const { profile, switchRole } = useAuth()

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 flex items-center gap-2">
        <span className="text-sm text-gray-600">Test Role:</span>
        <select
          value={profile?.role}
          onChange={(e) => switchRole(e.target.value as 'teacher' | 'student')}
          className="input py-1 px-2 text-sm w-auto"
        >
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>
        <span className={`badge ${profile?.role === 'teacher' ? 'badge-info' : 'badge-success'}`}>
          {profile?.role}
        </span>
      </div>
    </div>
  )
}