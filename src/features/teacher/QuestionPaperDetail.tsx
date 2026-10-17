import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { getQuestionPapers, getAnswerSheetsForTeacher, gradeAnswerSheet, gradeAnswerSheetLocal, checkLocalModel, updateTeacherGrade, type QuestionPaper, type AnswerSheetWithRelations, type GradeResult, type GradeProvider } from '../../lib/supabase'
import { CountUp, LoadingState, Reveal, Sheet, Stagger } from '../../ui/motion'

function statusPill(status: string) {
  if (status === 'graded') return 'pill-success'
  if (status === 'reviewed') return 'pill-info'
  if (status === 'grading') return 'pill-warning'
  return 'pill-neutral'
}

export function QuestionPaperDetail() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [paper, setPaper] = useState<QuestionPaper | null>(null)
  const [sheets, setSheets] = useState<AnswerSheetWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [grading, setGrading] = useState<string | null>(null)
  // Groq (cloud) option hidden for now — local MoE only.
  const provider: GradeProvider = 'local'
  const [localAvailable, setLocalAvailable] = useState<boolean | null>(null)
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [reviewGrade, setReviewGrade] = useState<GradeResult | null>(null)
  const [reviewComment, setReviewComment] = useState('')

  useEffect(() => {
    loadData()
    checkLocalModel().then(setLocalAvailable).catch(() => setLocalAvailable(false))
  }, [id])

  const loadData = async () => {
    if (!id || !profile) return
    setLoading(true)
    try {
      const papers = await getQuestionPapers(profile.id)
      const found = papers.find(p => p.id === id)
      if (found) {
        setPaper(found)
        const sheetsData = await getAnswerSheetsForTeacher(profile.id)
        setSheets(sheetsData.filter(s => s.question_paper_id === id))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGrade = async (sheetId: string) => {
    setGrading(sheetId)
    try {
      if (provider === 'local') {
        await gradeAnswerSheetLocal(sheetId)
      } else {
        await gradeAnswerSheet(sheetId)
      }
      await loadData()
    } catch (err) {
      console.error(err)
      alert(provider === 'local' ? 'Local grading failed — is the model server running on http://localhost:8000?' : 'Grading failed')
    } finally {
      setGrading(null)
    }
  }

  const openReview = (sheet: AnswerSheetWithRelations) => {
    setReviewing(sheet.id)
    setReviewGrade(sheet.ai_grade)
    setReviewComment(sheet.teacher_comment || '')
  }

  const closeReview = () => {
    setReviewing(null)
    setReviewGrade(null)
    setReviewComment('')
  }

  const saveReview = async () => {
    if (!reviewing || !reviewGrade) return
    try {
      await updateTeacherGrade(reviewing, reviewGrade, reviewComment)
      await loadData()
      closeReview()
    } catch (err) {
      console.error(err)
      alert('Save failed')
    }
  }

  const updateReviewScore = (qIndex: number, score: number) => {
    if (!reviewGrade) return
    const newPerQuestion = [...reviewGrade.per_question]
    newPerQuestion[qIndex] = { ...newPerQuestion[qIndex], score }
    const total = newPerQuestion.reduce((sum, q) => sum + q.score, 0)
    setReviewGrade({ ...reviewGrade, per_question: newPerQuestion, total })
  }

  if (loading) {
    return (
      <div>
        <Reveal>
          <h1 className="display" style={{ marginBottom: 4 }}>Paper</h1>
          <p className="caption" style={{ marginBottom: 24 }}>Loading marking scheme and submissions…</p>
        </Reveal>
        <LoadingState rows={3} />
      </div>
    )
  }
  if (!paper) {
    return (
      <div className="text-center" style={{ padding: '4rem 0' }}>
        <h1 className="title-2" style={{ marginBottom: 8 }}>Paper not found</h1>
        <p className="caption" style={{ marginBottom: 16 }}>It may have been deleted.</p>
        <Link to="/dashboard" className="btn-secondary">Back to Dashboard</Link>
      </div>
    )
  }

  const paperTotal = paper.marking_scheme.reduce((sum, q) => sum + q.max_points, 0)

  return (
    <div>
      <Reveal>
        <Link to="/dashboard" className="btn-ghost row-press" style={{ marginBottom: 8, paddingLeft: 0 }}>‹ Papers</Link>
        <h1 className="display" style={{ marginBottom: 4 }}>{paper.title}</h1>
        <p className="caption" style={{ marginBottom: 24 }}>{paper.marking_scheme.length} questions · {sheets.length} submissions</p>
      </Reveal>

      <Reveal delay={60}>
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 className="title-2" style={{ marginBottom: 16 }}>Marking Scheme</h2>
          <div className="space-y-2" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Stagger step={40}>
              {paper.marking_scheme.map((q) => (
                <div key={q.question_id} className="card-inset">
                  <div className="flex justify-between items-start gap-3">
                    <div style={{ minWidth: 0 }}>
                      <p className="mono caption">{q.question_id}</p>
                      <p className="body-2" style={{ marginTop: 2 }}>{q.rubric_text}</p>
                    </div>
                    <span className="pill pill-info" style={{ flexShrink: 0 }}>{q.max_points} pts</span>
                  </div>
                </div>
              ))}
            </Stagger>
          </div>
        </div>
      </Reveal>

      <Reveal delay={120}>
        <div className="card">
          <div className="flex flex-wrap justify-between items-center gap-4" style={{ marginBottom: 16 }}>
            <h2 className="title-2">Submissions</h2>
            <div className="flex items-center gap-2">
              <span className="pill pill-neutral">Local MoE</span>
              {localAvailable === true && <span className="pill pill-success">local online</span>}
              {localAvailable === false && <span className="pill pill-warning">local offline</span>}
            </div>
          </div>
          {sheets.length === 0 ? (
            <p className="caption text-center" style={{ padding: '2rem 0' }}>No submissions yet — share the paper link with students.</p>
          ) : (
            <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sheets.map((sheet) => (
                <div key={sheet.id} className="card-inset">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="body-2" style={{ fontWeight: 600 }}>{sheet.profiles?.full_name || sheet.student_id}</span>
                      <span className={`pill ${statusPill(sheet.status)}`} style={{ textTransform: 'capitalize' }}>
                        {sheet.status}
                      </span>
                      {sheet.final_grade && (
                        <span className="pill pill-success">
                          <CountUp value={sheet.final_grade.total} />/{paperTotal}
                        </span>
                      )}
                      {sheet.grading_provider && (
                        <span className="pill pill-neutral">
                          {sheet.grading_provider === 'local' ? 'Local MoE' : 'Cloud'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {sheet.status === 'pending' && (
                        <button
                          onClick={() => handleGrade(sheet.id)}
                          disabled={grading === sheet.id}
                          className="btn-primary"
                        >
                          {grading === sheet.id ? 'Grading…' : 'Grade · Local'}
                        </button>
                      )}
                      {(sheet.status === 'graded' || sheet.status === 'reviewed') && (
                        <button
                          onClick={() => openReview(sheet)}
                          disabled={reviewing === sheet.id}
                          className="btn-secondary"
                        >
                          {sheet.status === 'reviewed' ? 'Review / Edit' : 'Review'}
                        </button>
                      )}
                    </div>
                  </div>

                  {(sheet.status === 'graded' || sheet.status === 'reviewed') && sheet.ai_grade && (
                    <div style={{ marginTop: 12 }}>
                      <p className="label">AI breakdown</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2" style={{ marginTop: 6 }}>
                        {sheet.ai_grade.per_question.map((q) => (
                          <div key={q.question_id} className="card-inset" style={{ background: '#fff' }}>
                            <p className="mono caption">{q.question_id}</p>
                            <p className="title-3"><CountUp value={q.score} />/{q.max_points}</p>
                            <p className="caption" style={{ marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.rationale}</p>
                          </div>
                        ))}
                      </div>
                      <p className="title-2" style={{ color: 'var(--blue)', marginTop: 10 }}>
                        <CountUp value={sheet.ai_grade.total} />/{paperTotal}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      {reviewing && reviewGrade && (
        <Sheet onClose={closeReview} labelledBy="review-title">
          <div style={{ padding: '0.25rem 1.5rem 1.5rem' }}>
            <div className="flex justify-between items-center" style={{ padding: '0.75rem 0 1rem' }}>
              <h2 id="review-title" className="title-2">Review Grade</h2>
              <button onClick={closeReview} className="btn-ghost" aria-label="Close" style={{ fontSize: 22, padding: '0.2rem 0.6rem' }}>×</button>
            </div>
            <div className="space-y-3" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reviewGrade.per_question.map((q, i) => (
                <div key={q.question_id} className="card-inset" style={{ background: '#fff' }}>
                  <div className="flex justify-between items-center gap-3" style={{ marginBottom: 6 }}>
                    <div>
                      <p className="mono caption">{q.question_id}</p>
                      <p className="caption">Max {q.max_points} pts</p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={q.max_points}
                      value={q.score}
                      onChange={(e) => updateReviewScore(i, parseInt(e.target.value) || 0)}
                      className="input mono text-center"
                      style={{ width: 84, fontSize: '1.1rem', fontWeight: 700 }}
                      aria-label={`Score for ${q.question_id}`}
                    />
                  </div>
                  <p className="caption">{q.rationale}</p>
                </div>
              ))}
              <h3 className="title-2" style={{ paddingTop: 8 }}>
                <CountUp value={reviewGrade.total} />/{paperTotal}
              </h3>
              <div>
                <label className="label" htmlFor="teacher-comment">Teacher comment</label>
                <textarea
                  id="teacher-comment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="input"
                  style={{ minHeight: 90 }}
                  placeholder="Feedback for the student…"
                />
              </div>
              <div className="flex justify-end gap-3" style={{ paddingTop: 8 }}>
                <button onClick={closeReview} className="btn-secondary">Cancel</button>
                <button onClick={saveReview} className="btn-primary">Save Override</button>
              </div>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  )
}
