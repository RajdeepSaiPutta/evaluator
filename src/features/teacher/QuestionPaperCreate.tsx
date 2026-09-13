import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { createQuestionPaper, type MarkingSchemeQuestion } from '../../lib/supabase'

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (questions.some(q => q.max_points <= 0)) {
      setError('All questions must have max points > 0')
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

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Question Paper</h1>
      <form onSubmit={handleSubmit} className="card space-y-8">
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}

        <div>
          <label htmlFor="title" className="label">Paper Title</label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="e.g., Midterm Exam - Mathematics"
          />
        </div>

        <div>
          <label className="label">Marking Scheme</label>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={q.question_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-900">Question {i + 1}</h3>
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(i)} className="btn-ghost text-red-600 hover:bg-red-50">Remove</button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="label">Question ID</label>
                    <input
                      type="text"
                      value={q.question_id}
                      onChange={(e) => updateQuestion(i, 'question_id', e.target.value)}
                      className="input font-mono"
                    />
                  </div>
                  <div>
                    <label className="label">Max Points</label>
                    <input
                      type="number"
                      min="1"
                      value={q.max_points}
                      onChange={(e) => updateQuestion(i, 'max_points', parseInt(e.target.value) || 0)}
                      className="input"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="label">Rubric / Grading Criteria</label>
                  <textarea
                    value={q.rubric_text}
                    onChange={(e) => updateQuestion(i, 'rubric_text', e.target.value)}
                    className="input min-h-[80px] font-mono text-sm"
                    placeholder="Describe how to grade this question..."
                  />
                </div>
                <div>
                  <label className="label">Model Answer</label>
                  <textarea
                    value={q.model_answer}
                    onChange={(e) => updateQuestion(i, 'model_answer', e.target.value)}
                    className="input min-h-[80px] font-mono text-sm"
                    placeholder="The expected correct answer..."
                  />
                </div>
              </div>
            ))}
            <button type="button" onClick={addQuestion} className="btn-secondary">+ Add Question</button>
          </div>
        </div>

        <div>
          <label className="label">Question Paper Images</label>
          <input
            type="file"
            id="images"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="input"
          />
          {images.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {images.map((img, i) => (
                <span key={i} className="badge badge-info">{img.name}</span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create Question Paper'}
          </button>
        </div>
      </form>
    </div>
  )
}