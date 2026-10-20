import { useAuth } from '../features/auth/AuthContext'

/** Floating glass pill for switching the test role. */
export function RoleSwitcher() {
  const { profile, switchRole } = useAuth()
  return (
    <div className="role-pill">
      <span className="caption" style={{ fontWeight: 600 }}>
        Test Role
      </span>
      <span className="segmented" role="group" aria-label="Test role">
        {(['teacher', 'student'] as const).map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={profile?.role === r}
            onClick={() => switchRole(r)}
            style={{ textTransform: 'capitalize' }}
          >
            {r}
          </button>
        ))}
      </span>
    </div>
  )
}
