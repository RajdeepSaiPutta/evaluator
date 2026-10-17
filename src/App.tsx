import { Routes, Route, Navigate } from 'react-router-dom'
import { TeacherDashboard } from './features/teacher/Dashboard'
import { QuestionPaperCreate } from './features/teacher/QuestionPaperCreate'
import { QuestionPaperDetail } from './features/teacher/QuestionPaperDetail'
import { StudentDashboard } from './features/student/Dashboard'
import { StudentSubmit } from './features/student/Submit'
import { StudentDraft } from './features/student/Draft'
import { LocalGradeDemo } from './features/demo/LocalGrade'
import { Layout } from './ui/Layout'

function PublicRoute({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function App() {
  return (
    <Routes>
      {/* Login screen not wired yet — app opens straight into the dashboard. */}
      <Route element={<PublicRoute><Layout /></PublicRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<TeacherDashboard />} />
        <Route path="/paper/new" element={<QuestionPaperCreate />} />
        <Route path="/paper/:id" element={<QuestionPaperDetail />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/submit/:paperId" element={<StudentSubmit />} />
        <Route path="/student/draft/:paperId" element={<StudentDraft />} />
        <Route path="/demo/local-grade" element={<LocalGradeDemo />} />
      </Route>
    </Routes>
  )
}
