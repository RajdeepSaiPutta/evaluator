import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getQuestionPapers, createStudentAccount, getStudentsForTeacher, type QuestionPaper, type Profile } from '../../lib/supabase'
import { LoadingState, Reveal, Stagger } from '../../ui/motion'

export function TeacherDashboard() {
  const { profile } = useAuth()
  const [papers, setPapers] = useState<QuestionPaper[]>([])
  const [students, setStudents] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingStudent, setCreatingStudent] = useState(false)
  const [newStudentEmail, setNewStudentEmail] = useState('')
  const [studentError, setStudentError] = useState('')
  const [studentSuccess, setStudentSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    if (!profile) return
    try {
      const [papersData, studentsData] = await Promise.all([
        getQuestionPapers(profile.id),
        getStudentsForTeacher(profile.id),
      ])
      setPapers(papersData)
      setStudents(studentsData)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setStudentError('')
    setStudentSuccess('')
    setCreatingStudent(true)
    try {
      await createStudentAccount(profile.id, newStudentEmail)
      setStudentSuccess(`Student account created! A password reset link has been sent to ${newStudentEmail}. They can set their password and log in.`)
      setNewStudentEmail('')
      const studentsData = await getStudentsForTeacher(profile.id)
      setStudents(studentsData)
    } catch (err: any) {
      setStudentError(err.message)
    } finally {
      setCreatingStudent(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Reveal>
          <h1 className="display" style={{ marginBottom: 4 }}>Dashboard</h1>
          <p className="caption" style={{ marginBottom: 24 }}>Loading your papers and students…</p>
        </Reveal>
        <LoadingState rows={4} />
      </div>
    )
  }

  return (
    <div>
      <Reveal>
        <div className="flex flex-wrap justify-between items-end gap-4" style={{ marginBottom: 24 }}>
          <div>
            <h1 className="display">Dashboard</h1>
            <p className="caption" style={{ marginTop: 4 }}>Question papers and students</p>
          </div>
          <Link to="/paper/new" className="btn-primary">New Paper</Link>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Reveal delay={60}>
          <section className="card">
            <h2 className="title-2" style={{ marginBottom: 16 }}>Question Papers</h2>
            {papers.length === 0 ? (
              <div className="text-center" style={{ padding: '2rem 0' }}>
                <p className="body-2" style={{ color: 'var(--ink-2)', marginBottom: 12 }}>No question papers yet.</p>
                <Link to="/paper/new" className="btn-secondary">Create your first paper</Link>
              </div>
            ) : (
              <div className="space-y-2">
                <Stagger step={45}>
                  {papers.map((paper) => (
                    <Link
                      key={paper.id}
                      to={`/paper/${paper.id}`}
                      className="row-press block"
                      style={{ textDecoration: 'none', borderRadius: 'var(--r-md)', padding: '0.9rem 1rem', background: 'rgba(0,0,0,0.035)' }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div style={{ minWidth: 0 }}>
                          <h3 className="title-3" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{paper.title}</h3>
                          <p className="caption" style={{ marginTop: 2 }}>
                            {paper.marking_scheme.length} questions · {new Date(paper.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span aria-hidden="true" style={{ color: 'var(--ink-3)', fontSize: 20, flexShrink: 0 }}>›</span>
                      </div>
                    </Link>
                  ))}
                </Stagger>
              </div>
            )}
          </section>
        </Reveal>

        <Reveal delay={120}>
          <section className="card">
            <h2 className="title-2" style={{ marginBottom: 16 }}>Students</h2>
            <form onSubmit={handleCreateStudent} className="card-inset" style={{ marginBottom: 16 }}>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="student@example.com"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  required
                  className="input"
                  style={{ flex: 1 }}
                  aria-label="Student email"
                />
                <button type="submit" disabled={creatingStudent} className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
                  {creatingStudent ? 'Adding…' : 'Add'}
                </button>
              </div>
              {studentError && <div className="banner banner-error" style={{ marginTop: 10 }} role="alert">{studentError}</div>}
              {studentSuccess && <div className="banner banner-success" style={{ marginTop: 10 }} role="status">{studentSuccess}</div>}
            </form>
            {students.length === 0 ? (
              <p className="caption text-center" style={{ padding: '1rem 0' }}>No students linked yet. Add students above.</p>
            ) : (
              <div className="space-y-2">
                <Stagger step={40}>
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between" style={{ padding: '0.7rem 1rem', background: 'rgba(0,0,0,0.035)', borderRadius: 'var(--r-md)' }}>
                      <p className="body-2" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {student.full_name || student.id}
                      </p>
                      <span className="pill pill-info">Student</span>
                    </div>
                  ))}
                </Stagger>
              </div>
            )}
          </section>
        </Reveal>
      </div>
    </div>
  )
}
