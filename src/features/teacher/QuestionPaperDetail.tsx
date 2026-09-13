import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { getQuestionPapers, getAnswerSheetsForTeacher, gradeAnswerSheet, updateTeacherGrade, type QuestionPaper, type AnswerSheetWithRelations, type GradeResult } from '../../lib/supabase'

export function QuestionPaperDetail() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [paper, setPaper] = useState<QuestionPaper | null>(null)
  const [sheets, setSheets] = useState<AnswerSheetWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [grading, setGrading] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [reviewGrade, setReviewGrade] = useState<GradeResult | null>(null)
  const [reviewComment, setReviewComment] = useState('')

  useEffect(() => {
    loadData()
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
      await gradeAnswerSheet(sheetId)
      await loadData()
    } catch (err) {
      console.error(err)
      alert('Grading failed')
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

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>
  if (!paper) return <div className="text-center py-12">Question paper not found</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link to="/dashboard" className="btn-ghost mb-2 inline-block">← Back</Link>
          <h1 className="text-3xl font-bold text-gray-900">{paper.title}</h1>
          <p className="text-gray-600 mt-1">{paper.marking_scheme.length} questions · {sheets.length} submissions</p>
        </div>
      </div>

      <div className="card mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Marking Scheme</h2>
        <div className="space-y-3">
          {paper.marking_scheme.map((q) => (
            <div key={q.question_id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono text-sm text-gray-500">{q.question_id}</p>
                  <p className="text-gray-700">{q.rubric_text}</p>
                </div>
                <span className="badge badge-info">{q.max_points} pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Submissions</h2>
        {sheets.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No submissions yet</p>
        ) : (
          <div className="space-y-4">
            {sheets.map((sheet) => (
              <div key={sheet.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-gray-900">Student: {sheet.profiles?.full_name || sheet.student_id}</span>
                    <span className={`badge ${sheet.status === 'graded' ? 'badge-success' : sheet.status === 'grading' ? 'badge-warning' : sheet.status === 'reviewed' ? 'badge-info' : 'badge-warning'}`}>
                      {sheet.status}
                    </span>
                    {sheet.final_grade && (
                      <span className="badge badge-success">
                        Final: {sheet.final_grade.total}/{paper.marking_scheme.reduce((sum, q) => sum + q.max_points, 0)}
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
                        {grading === sheet.id ? 'Grading...' : 'Grade with AI'}
                      </button>
                    )}
                    {(sheet.status === 'graded' || sheet.status === 'reviewed') && (
                      <button
                        onClick={() => openReview(sheet)}
                        disabled={reviewing === sheet.id}
                        className="btn-secondary"
                      >
                        {sheet.status === 'reviewed' ? 'Review/Edit' : 'Review Grade'}
                      </button>
                    )}
                  </div>
                </div>

                {(sheet.status === 'graded' || sheet.status === 'reviewed') && sheet.ai_grade && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">AI Grade Breakdown</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      {sheet.ai_grade.per_question.map((q) => (
                        <div key={q.question_id} className="p-2 bg-white rounded">
                          <p className="font-mono text-gray-500">{q.question_id}</p>
                          <p className="font-medium">{q.score}/{q.max_points}</p>
                          <p className="text-gray-600 line-clamp-2">{q.rationale}</p>
                        </div>
                      ))}
                      <div className="md:col-span-3 font-bold text-lg text-blue-600">
                        Total: {sheet.ai_grade.total}/{paper.marking_scheme.reduce((sum, q) => sum + q.max_points, 0)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {reviewing && reviewGrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold">Review & Override Grade</h2>
              <button onClick={closeReview} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              {reviewGrade.per_question.map((q, i) => (
                <div key={q.question_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-mono text-sm text-gray-500">{q.question_id}</p>
                      <p className="text-gray-700 text-sm">Max: {q.max_points} pts</p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={q.max_points}
                      value={q.score}
                      onChange={(e) => updateReviewScore(i, parseInt(e.target.value) || 0)}
                      className="w-20 input text-center font-mono"
                    />
                  </div>
                  <p className="text-gray-600 text-sm">{q.rationale}</p>
                </div>
              ))}
              <div className="border-t pt-4">
                <h3 className="font-bold text-lg">Total: {reviewGrade.total}/{paper.marking_scheme.reduce((sum, q) => sum + q.max_points, 0)}</h3>
              </div>
              <div>
                <label className="label">Teacher Comment</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="input min-h-[100px]"
                  placeholder="Optional feedback for student..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={closeReview} className="btn-secondary">Cancel</button>
                <button onClick={saveReview} className="btn-primary">Save Override</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}