import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js'
export type { User, Session }

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export type Profile = {
  id: string
  email: string
  role: 'teacher' | 'student'
  teacher_id: string | null
  full_name: string | null
  app_metadata: {
    role?: string
    teacher_id?: string
    onboarded?: boolean
    [key: string]: any
  }
  created_at: string
}

export type QuestionPaper = {
  id: string
  teacher_id: string
  title: string
  marking_scheme: MarkingSchemeQuestion[]
  image_paths: string[]
  created_at: string
}

export type MarkingSchemeQuestion = {
  question_id: string
  max_points: number
  rubric_text: string
  model_answer: string
}

export type GradeProvider = 'local'

export const LOCAL_MODEL_URL = import.meta.env.VITE_LOCAL_MODEL_URL || 'http://localhost:8000'

export type AnswerSheet = {
  id: string
  question_paper_id: string
  student_id: string
  image_paths: string[]
  status: 'pending' | 'grading' | 'graded' | 'reviewed'
  ai_grade: GradeResult | null
  teacher_grade: GradeResult | null
  teacher_comment: string | null
  grading_provider: GradeProvider | null
  final_grade: GradeResult
  graded_at: string | null
  created_at: string
}

export type AnswerSheetWithRelations = AnswerSheet & {
  question_papers?: QuestionPaper
  profiles?: Pick<Profile, 'full_name' | 'email'>
}

export type GradeResult = {
  total: number
  per_question: PerQuestionGrade[]
}

export type PerQuestionGrade = {
  question_id: string
  score: number
  max_points: number
  rationale: string
}

export type DraftSheet = {
  question_paper_id: string
  images: File[]
  meta: {
    student_name?: string
    saved_at: number
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function signUp(email: string, password: string, role: 'teacher' | 'student', teacherId?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, teacher_id: teacherId },
    },
  })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function createStudentAccount(teacherId: string, email: string) {
  const tempPassword = crypto.randomUUID()
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { role: 'student' },
    app_metadata: { role: 'student', teacher_id: teacherId, onboarded: false },
  })
  if (error) throw error
  return data
}

export async function getQuestionPapers(teacherId: string): Promise<QuestionPaper[]> {
  const { data, error } = await supabase
    .from('question_papers')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createQuestionPaper(
  teacherId: string,
  title: string,
  markingScheme: MarkingSchemeQuestion[],
  images: File[]
): Promise<QuestionPaper> {
  const imagePaths: string[] = []
  for (const file of images) {
    const fileName = `${teacherId}/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage
      .from('question-papers')
      .upload(fileName, file)
    if (error) throw error
    imagePaths.push(data.path)
  }

  const { data, error } = await supabase
    .from('question_papers')
    .insert({
      teacher_id: teacherId,
      title,
      marking_scheme: markingScheme,
      image_paths: imagePaths,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getStudentsForTeacher(teacherId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('role', 'student')
  if (error) throw error
  return data || []
}

export async function submitAnswerSheet(
  questionPaperId: string,
  studentId: string,
  images: File[]
): Promise<AnswerSheet> {
  const imagePaths: string[] = []
  for (const file of images) {
    const fileName = `${studentId}/${Date.now()}-${file.name}`
    const { data, error } = await supabase.storage
      .from('answer-sheets')
      .upload(fileName, file)
    if (error) throw error
    imagePaths.push(data.path)
  }

  const { data, error } = await supabase
    .from('answer_sheets')
    .insert({
      question_paper_id: questionPaperId,
      student_id: studentId,
      image_paths: imagePaths,
      status: 'pending',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getAnswerSheetsForTeacher(teacherId: string): Promise<AnswerSheetWithRelations[]> {
  const { data, error } = await supabase
    .from('answer_sheets')
    .select(`
      *,
      question_papers!inner(*),
      profiles!answer_sheets_student_id_fkey(full_name, email)
    `)
    .eq('question_papers.teacher_id', teacherId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getAnswerSheetsForStudent(studentId: string): Promise<AnswerSheetWithRelations[]> {
  const { data, error } = await supabase
    .from('answer_sheets')
    .select(`
      *,
      question_papers(title, marking_scheme)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function gradeAnswerSheet(sheetId: string): Promise<GradeResult> {
  const { data, error } = await supabase.functions.invoke('grade-answer-sheet', {
    body: { sheet_id: sheetId },
  })
  if (error) throw error
  return data
}

export async function checkLocalModel(): Promise<boolean> {
  try {
    const res = await fetch(`${LOCAL_MODEL_URL}/health`)
    if (!res.ok) return false
    const data = await res.json()
    return data.status === 'ok' && data.moe_loaded === true
  } catch {
    return false
  }
}

export async function gradeAnswerSheetLocal(sheetId: string): Promise<GradeResult> {
  const { data: sheet, error: sheetError } = await supabase
    .from('answer_sheets')
    .select('*, question_papers(*)')
    .eq('id', sheetId)
    .single()
  if (sheetError || !sheet) throw new Error('Sheet not found')
  if (sheet.status !== 'pending') throw new Error('Sheet already graded')

  const paper = sheet.question_papers as QuestionPaper
  const base = supabaseUrl.replace(/\/$/, '')
  const questionImages = (paper.image_paths || []).map(
    (p: string) => `${base}/storage/v1/object/public/question-papers/${p}`
  )
  const answerImages = (sheet.image_paths || []).map(
    (p: string) => `${base}/storage/v1/object/public/answer-sheets/${p}`
  )

  await supabase.from('answer_sheets').update({ status: 'grading' }).eq('id', sheetId)

  try {
    const res = await fetch(`${LOCAL_MODEL_URL}/grade-sheet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        marking_scheme: paper.marking_scheme,
        question_images: questionImages,
        answer_images: answerImages,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Local model error: ${res.status} ${err}`)
    }
    const gradeResult = (await res.json()) as GradeResult

    const { error: updateError } = await supabase
      .from('answer_sheets')
      .update({
        ai_grade: gradeResult,
        grading_provider: 'local',
        status: 'graded',
        graded_at: new Date().toISOString(),
      })
      .eq('id', sheetId)
    if (updateError) throw updateError
    return gradeResult
  } catch (err) {
    await supabase.from('answer_sheets').update({ status: 'pending' }).eq('id', sheetId)
    throw err
  }
}

export async function updateTeacherGrade(
  sheetId: string,
  teacherGrade: GradeResult,
  comment: string
): Promise<AnswerSheetWithRelations> {
  const { data, error } = await supabase
    .from('answer_sheets')
    .update({
      teacher_grade: teacherGrade,
      teacher_comment: comment,
      status: 'reviewed',
      graded_at: new Date().toISOString(),
    })
    .eq('id', sheetId)
    .select(`
      *,
      question_papers!inner(*),
      profiles!answer_sheets_student_id_fkey(full_name, email)
    `)
    .single()
  if (error) throw error
  return data
}

export function getSignedUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}