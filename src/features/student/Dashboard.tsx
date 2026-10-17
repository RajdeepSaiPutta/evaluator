import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getAnswerSheetsForStudent, type AnswerSheetWithRelations } from '../../lib/supabase'
import { CountUp, LoadingState, Reveal, Stagger } from '../../ui/motion'

export function StudentDashboard() {
  const { profile } = useAuth()
  const [sheets, setSheets] = useState<AnswerSheetWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [profile])

  const loadData = async () => {
    if (!profile) return
    try {
      const data = await getAnswerSheetsForStudent(profile.id)
      setSheets(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Reveal>
          <h1 className="display" style={{ marginBottom: 4 }}>My Work</h1>
          <p className="caption" style={{ marginBottom: 24 }}>Loading your submissions…</p>
        </Reveal>
        <LoadingState rows={3} />
      </div>
    )
  }

  return (
    <div>
      <Reveal>
        <h1 className="display" style={{ marginBottom: 4 }}>My Work</h1>
        <p className="caption" style={{ marginBottom: 24 }}>
          {sheets.length === 0 ? 'Nothing submitted yet' : `${sheets.length} submission${sheets.length === 1 ? '' : 's'}`}
        </p>
      </Reveal>
      {sheets.length === 0 ? (
        <Reveal delay={60}>
          <div className="card text-center" style={{ padding: '3rem 1.5rem' }}>
            <p className="title-3" style={{ marginBottom: 8 }}>No submissions yet</p>
            <p className="caption">Ask your teacher for a question paper link to get started.</p>
          </div>
        </Reveal>
      ) : (
        <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Stagger step={60}>
            {sheets.map((sheet) => (
              <Link key={sheet.id} to={`/student/submit/${sheet.question_paper_id}`} className="row-press block" style={{ textDecoration: 'none' }}>
                <div className="card">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div style={{ minWidth: 0 }}>
                      <h3 className="title-3">{sheet.question_papers?.title || 'Unknown Paper'}</h3>
                      <p className="caption" style={{ marginTop: 2 }}>Submitted {new Date(sheet.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`pill ${sheet.status === 'graded' || sheet.status === 'reviewed' ? 'pill-success' : sheet.status === 'grading' ? 'pill-warning' : 'pill-info'}`} style={{ textTransform: 'capitalize' }}>
                        {sheet.status}
                      </span>
                      {sheet.final_grade && (
                        <span className="title-2" style={{ color: 'var(--blue)' }}>
                          <CountUp value={sheet.final_grade.total} /> / {sheet.question_papers?.marking_scheme?.reduce((sum: number, q: any) => sum + q.max_points, 0) || 0}
                        </span>
                      )}
                    </div>
                  </div>
                  {(sheet.status === 'graded' || sheet.status === 'reviewed') && sheet.final_grade && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--hairline)' }}>
                      <p className="label">Breakdown</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2" style={{ marginTop: 8 }}>
                        {sheet.final_grade.per_question.map((q) => (
                          <div key={q.question_id} className="card-inset">
                            <p className="mono caption">{q.question_id}</p>
                            <p className="title-3"><CountUp value={q.score} />/{q.max_points}</p>
                          </div>
                        ))}
                      </div>
                      {sheet.teacher_comment && (
                        <div className="banner banner-info" style={{ marginTop: 12 }}>
                          <p style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: 2 }}>Teacher comment</p>
                          <p>{sheet.teacher_comment}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </Stagger>
        </div>
      )}
    </div>
  )
}
