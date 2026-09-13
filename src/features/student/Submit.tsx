import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { submitAnswerSheet, type QuestionPaper } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'
import { openDB, DBSchema, IDBPDatabase } from 'idb'

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
      setError('Please select at least one image')
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

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>
  if (!paper) return <div className="text-center py-12">Question paper not found</div>

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit Answer Sheet</h1>
      <p className="text-gray-600 mb-8">{paper.title} — {paper.marking_scheme.length} questions</p>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}

        <div>
          <label className="label">Answer Sheet Images (max 10)</label>
          <input
            type="file"
            id="images"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="input"
          />
          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square border border-gray-200 rounded-lg overflow-hidden">
                  <img src={URL.createObjectURL(img)} alt={`Answer ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-gray-500 mt-2">{images.length}/10 images</p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={saveDraft} className="btn-secondary" disabled={images.length === 0}>
            Save Draft
          </button>
          <button type="submit" disabled={submitting || images.length === 0} className="btn-primary">
            {submitting ? 'Submitting...' : 'Submit Answer Sheet'}
          </button>
        </div>
      </form>

      {draftLoaded && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          Draft loaded from local storage. You can continue editing or submit.
        </div>
      )}
    </div>
  )
}