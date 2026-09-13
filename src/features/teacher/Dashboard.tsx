import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getQuestionPapers, createStudentAccount, getStudentsForTeacher, type QuestionPaper, type Profile } from '../../lib/supabase'

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

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage question papers and students</p>
        </div>
        <Link to="/paper/new" className="btn-primary">Create Question Paper</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Question Papers</h2>
          {papers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No question papers yet.</p>
              <Link to="/paper/new" className="text-blue-600 hover:text-blue-500 font-medium mt-2 inline-block">Create your first paper</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {papers.map((paper) => (
                <Link key={paper.id} to={`/paper/${paper.id}`} className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <h3 className="font-medium text-gray-900">{paper.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {paper.marking_scheme.length} questions · Created {new Date(paper.created_at).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Students</h2>
          <form onSubmit={handleCreateStudent} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="student@example.com"
                value={newStudentEmail}
                onChange={(e) => setNewStudentEmail(e.target.value)}
                required
                className="input flex-1"
              />
              <button type="submit" disabled={creatingStudent} className="btn-primary whitespace-nowrap">
                {creatingStudent ? 'Adding...' : 'Add Student'}
              </button>
            </div>
            {studentError && <p className="text-red-600 text-sm mt-2">{studentError}</p>}
            {studentSuccess && <p className="text-green-600 text-sm mt-2">{studentSuccess}</p>}
          </form>
          {students.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No students linked yet. Add students above.</p>
          ) : (
            <div className="space-y-2">
              {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{student.full_name || student.id}</p>
                  </div>
                  <span className="badge badge-info">Student</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}