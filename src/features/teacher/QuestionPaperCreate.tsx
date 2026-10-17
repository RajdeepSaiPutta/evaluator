import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { createQuestionPaper, type MarkingSchemeQuestion } from '../../lib/supabase'
import { Reveal } from '../../ui/motion'

export function QuestionPaperCreate() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<MarkingSchemeQuestion[]>([
    { question_id: 'q1', max_points: 0, rubric_text: '', model_answer: '' }
  ])
  const [images, setImages] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addQuestion = () => {
    const newId = `q${questions.length + 1}`
    setQuestions([...questions, { question_id: newId, max_points: 0, rubric_text: '', model_answer: '' }])
  }

  const updateQuestion = (index: number, field: keyof MarkingSchemeQuestion, value: any) => {
    const newQuestions = [...questions]
    newQuestions[index] = { ...newQuestions[index], [field]: value }
    setQuestions(newQuestions)
  }

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const ACCEPTED_TYPES = ".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx,.ppt,.pptx"
  const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "bmp"])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      const oversized = files.filter(f => f.size > 20 * 1024 * 1024)
      if (oversized.length > 0) {
        setError(`Files too large (max 20MB): ${oversized.map(f => f.name).join(", ")}`)
        return
      }
      setError("")
      setImages(files)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    if (!title.trim()) {
      setError('Give the paper a title first.')
      return
    }
    if (questions.some(q => q.max_points <= 0)) {
      setError('Every question needs max points above 0.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const paper = await createQuestionPaper(profile.id, title, questions, images)
      navigate(`/paper/${paper.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const totalPoints = questions.reduce((s, q) => s + (q.max_points || 0), 0)

  return (
    <div style={{ maxWidth: '52rem', margin: '0 auto' }}>
      <Reveal>
        <h1 className="display" style={{ marginBottom: 4 }}>New Paper</h1>
        <p className="caption" style={{ marginBottom: 24 }}>
          {questions.length} question{questions.length === 1 ? '' : 's'} · {totalPoints} points total
        </p>
      </Reveal>
      <Reveal delay={60}>
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {error && <div className="banner banner-error" role="alert">{error}</div>}

          <div>
            <label htmlFor="title" className="label">Paper title</label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input title-3"
              placeholder="e.g. Midterm Exam — Mathematics"
            />
          </div>

          <div>
            <span className="label">Marking scheme</span>
            <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: 8 }}>
              {questions.map((q, i) => (
                <div key={q.question_id} className="card-inset">
                  <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
                    <h3 className="title-3">Question {i + 1}</h3>
                    {questions.length > 1 && (
                      <button type="button" onClick={() => removeQuestion(i)} className="btn-ghost" style={{ color: 'var(--red)', padding: '0.3rem 0.6rem', fontSize: '0.8125rem' }}>Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: 12 }}>
                    <div>
                      <label className="label">Question ID</label>
                      <input
                        type="text"
                        value={q.question_id}
                        onChange={(e) => updateQuestion(i, 'question_id', e.target.value)}
                        className="input mono"
                      />
                    </div>
                    <div>
                      <label className="label">Max points</label>
                      <input
                        type="number"
                        min="1"
                        value={q.max_points}
                        onChange={(e) => updateQuestion(i, 'max_points', parseInt(e.target.value) || 0)}
                        className="input"
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label className="label">Rubric — how to grade this question</label>
                    <textarea
                      value={q.rubric_text}
                      onChange={(e) => updateQuestion(i, 'rubric_text', e.target.value)}
                      className="input mono"
                      style={{ minHeight: 80, fontSize: '0.875rem' }}
                      placeholder="What earns each mark…"
                    />
                  </div>
                  <div>
                    <label className="label">Model answer</label>
                    <textarea
                      value={q.model_answer}
                      onChange={(e) => updateQuestion(i, 'model_answer', e.target.value)}
                      className="input mono"
                      style={{ minHeight: 80, fontSize: '0.875rem' }}
                      placeholder="The expected correct answer…"
                    />
                  </div>
                </div>
              ))}
              <button type="button" onClick={addQuestion} className="btn-secondary" style={{ alignSelf: 'flex-start' }}>+ Add Question</button>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="images">Paper files — images, PDF, Word or PowerPoint</label>
            <input
              type="file"
              id="images"
              accept={ACCEPTED_TYPES}
              multiple
              onChange={handleImageChange}
              className="input"
            />
            <p className="caption" style={{ marginTop: 6 }}>PNG, JPG, WEBP, PDF, DOC, DOCX, PPT, PPTX — up to 20MB each</p>
            {images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2" style={{ marginTop: 10 }}>
                {images.map((f, i) => {
                  const ext = f.name.split(".").pop()?.toLowerCase() || ""
                  const isImage = IMAGE_EXTS.has(ext)
                  return (
                    <span key={i} className={`pill ${isImage ? "pill-info" : "pill-warning"}`} title={`${(f.size / 1024).toFixed(0)} KB`}>
                      {f.name}
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3" style={{ paddingTop: 16, borderTop: '1px solid var(--hairline)' }}>
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creating…' : 'Create Paper'}
            </button>
          </div>
        </form>
      </Reveal>
    </div>
  )
}
