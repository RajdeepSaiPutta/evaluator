import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getAnswerSheetsForStudent, type AnswerSheetWithRelations } from '../../lib/supabase'

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

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Submissions</h1>
      {sheets.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No submissions yet.</p>
          <p className="text-gray-400 text-sm">Ask your teacher for question paper links.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sheets.map((sheet) => (
            <Link key={sheet.id} to={`/student/submit/${sheet.question_paper_id}`} className="block">
              <div className="card hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{sheet.question_papers?.title || 'Unknown Paper'}</h3>
                    <p className="text-sm text-gray-500 mt-1">Submitted {new Date(sheet.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`badge ${sheet.status === 'graded' || sheet.status === 'reviewed' ? 'badge-success' : sheet.status === 'grading' ? 'badge-warning' : 'badge-info'}`}>
                      {sheet.status}
                    </span>
                    {sheet.final_grade && (
                      <span className="font-bold text-lg text-blue-600">
                        {sheet.final_grade.total} / {sheet.question_papers?.marking_scheme?.reduce((sum: number, q: any) => sum + q.max_points, 0) || 0}
                      </span>
                    )}
                  </div>
                </div>
                {(sheet.status === 'graded' || sheet.status === 'reviewed') && sheet.final_grade && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">Grade Breakdown</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      {sheet.final_grade.per_question.map((q) => (
                        <div key={q.question_id} className="p-2 bg-gray-50 rounded">
                          <p className="font-mono text-gray-500">{q.question_id}</p>
                          <p className="font-medium">{q.score}/{q.max_points}</p>
                        </div>
                      ))}
                    </div>
                    {sheet.teacher_comment && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="font-medium text-blue-900 text-sm">Teacher Comment:</p>
                        <p className="text-blue-700 text-sm mt-1">{sheet.teacher_comment}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}