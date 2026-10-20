import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { submitAnswerSheet, supabase, type QuestionPaper } from '../../lib/supabase'
import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { LoadingState, Reveal } from '../../ui/motion'

interface DraftDBSchema extends DBSchema {
  drafts: {
    key: string
    value: {
      paperId: string
      images: { name: string; type: string; data: string }[]
      meta: { studentName?: string; savedAt: number }
    }
  }
}

let dbPromise: Promise<IDBPDatabase<DraftDBSchema>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<DraftDBSchema>('answer-sheet-drafts', 1, {
      upgrade(db) {
        db.createObjectStore('drafts', { keyPath: 'paperId' })
      }
    })
  }
  return dbPromise
}

export function StudentSubmit() {
  const { paperId } = useParams<{ paperId: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [paper, setPaper] = useState<QuestionPaper | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [draftLoaded, setDraftLoaded] = useState(false)

  useEffect(() => {
    loadPaper()
    loadDraft()
  }, [paperId])

  const loadPaper = async () => {
    if (!paperId || !profile) return
    try {
      const { data, error } = await supabase
        .from('question_papers')
        .select('*')
        .eq('id', paperId)
        .single()
      if (error) throw error
      setPaper(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadDraft = async () => {
    if (!paperId) return
    try {
      const db = await getDB()
      const draft = await db.get('drafts', paperId)
      if (draft && draft.images.length > 0) {
        const files = await Promise.all(draft.images.map(async (img) => {
          const response = await fetch(img.data)
          const blob = await response.blob()
          return new File([blob], img.name, { type: img.type })
        }))
        setImages(files)
        setDraftLoaded(true)
      }
    } catch (err) {
      console.error('Failed to load draft:', err)
    }
  }

  const saveDraft = async () => {
    if (!paperId || images.length === 0) return
    try {
      const db = await getDB()
      const imageData = await Promise.all(images.map(async (file) => {
        const dataUrl = await fileToDataUrl(file)
        return { name: file.name, type: file.type, data: dataUrl }
      }))
      await db.put('drafts', {
        paperId: paperId as string,
        images: imageData,
        meta: { studentName: profile?.full_name, savedAt: Date.now() }
      } as { paperId: string; images: { name: string; type: string; data: string }[]; meta: { studentName?: string; savedAt: number } })
      alert('Draft saved locally')
    } catch (err) {
      console.error('Failed to save draft:', err)
    }
  }

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      if (images.length + newFiles.length > 10) {
        setError('Maximum 10 images allowed')
        return
      }
      setImages([...images, ...newFiles])
      setError('')
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paperId || !profile) return
    if (images.length === 0) {
      setError('Add at least one photo of your answer sheet.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await submitAnswerSheet(paperId, profile.id, images)
      const db = await getDB()
      await db.delete('drafts', paperId)
      navigate('/student/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Reveal>
          <h1 className="display" style={{ marginBottom: 4 }}>Submit</h1>
          <p className="caption" style={{ marginBottom: 24 }}>Loading paper…</p>
        </Reveal>
        <LoadingState rows={2} />
      </div>
    )
  }
  if (!paper) {
    return (
      <div className="text-center" style={{ padding: '4rem 0' }}>
        <h1 className="title-2" style={{ marginBottom: 8 }}>Paper not found</h1>
        <p className="caption">Check the link your teacher shared.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
      <Reveal>
        <h1 className="display" style={{ marginBottom: 4 }}>Submit Answers</h1>
        <p className="caption" style={{ marginBottom: 24 }}>{paper.title}: {paper.marking_scheme.length} questions</p>
      </Reveal>

      <Reveal delay={60}>
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && <div className="banner banner-error" role="alert">{error}</div>}

          <div>
            <label className="label" htmlFor="images">Photos of your answer sheet</label>
            <input
              type="file"
              id="images"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="input"
            />
            <p className="caption" style={{ marginTop: 6 }}>{images.length} of 10 photos</p>
            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3" style={{ marginTop: 12 }}>
                {images.map((img, i) => (
                  <Reveal key={`${img.name}-${i}`} delay={Math.min(i, 6) * 40}>
                    <div className="thumb">
                      <img src={URL.createObjectURL(img)} alt={`Answer page ${i + 1}`} />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="thumb-remove"
                        aria-label={`Remove photo ${i + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  </Reveal>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3" style={{ paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
            <button type="button" onClick={saveDraft} className="btn-secondary" disabled={images.length === 0}>
              Save Draft
            </button>
            <button type="submit" disabled={submitting || images.length === 0} className="btn-primary">
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </Reveal>

      {draftLoaded && (
        <Reveal delay={120}>
          <div className="banner banner-success" style={{ marginTop: 16 }} role="status">
            Draft restored from this device. Review the photos, then submit.
          </div>
        </Reveal>
      )}
    </div>
  )
}
