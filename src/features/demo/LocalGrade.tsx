import { useEffect, useState } from 'react'
import { CountUp, Reveal, Stagger } from '../../ui/motion'

const MODEL_URL = import.meta.env.VITE_LOCAL_MODEL_URL || 'http://localhost:8000'

interface PerQ {
  question_id: string
  score: number
  max_points: number
  rationale: string
}

function fileToDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(f)
  })
}

export function LocalGradeDemo() {
  const [health, setHealth] = useState<{ status: string; moe_loaded: boolean } | null>(null)
  const [healthErr, setHealthErr] = useState('')
  const [rubric, setRubric] = useState('Correct factorization and both roots with verification')
  const [modelAnswer, setModelAnswer] = useState('x = 3 or x = 2')
  const [maxPoints, setMaxPoints] = useState('5')
  const [question, setQuestion] = useState('Solve: x^2 - 5x + 6 = 0')
  const [answer, setAnswer] = useState('(x - 3)(x - 2) = 0, so x = 3 or x = 2. Checked: 9 - 15 + 6 = 0.')
  const [grading, setGrading] = useState(false)
  const [result, setResult] = useState<{ total: number; per_question: PerQ[] } | null>(null)
  const [error, setError] = useState('')
  const [ocrBusy, setOcrBusy] = useState<'q' | 'a' | null>(null)

  const checkHealth = async () => {
    setHealthErr('')
    try {
      const r = await fetch(`${MODEL_URL}/health`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setHealth(await r.json())
    } catch (e) {
      setHealthErr(`Model server unreachable at ${MODEL_URL}: is it running? (${String(e)})`)
      setHealth(null)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  const grade = async () => {
    setGrading(true)
    setError('')
    setResult(null)
    try {
      const r = await fetch(`${MODEL_URL}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marking_scheme: [
            {
              question_id: 'Q1',
              max_points: parseFloat(maxPoints) || 5,
              rubric_text: rubric,
              model_answer: modelAnswer,
            },
          ],
          question_text: question,
          answer_text: answer,
        }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`)
      setResult(await r.json())
    } catch (e) {
      setError(String(e))
    } finally {
      setGrading(false)
    }
  }

  const ocrInto = async (file: File, which: 'q' | 'a') => {
    setOcrBusy(which)
    setError('')
    try {
      const dataUrl = await fileToDataUrl(file)
      const r = await fetch(`${MODEL_URL}/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: dataUrl }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`)
      const { text } = await r.json()
      if (which === 'q') setQuestion(text)
      else setAnswer(text)
    } catch (e) {
      setError(`OCR failed: ${String(e)}`)
    } finally {
      setOcrBusy(null)
    }
  }

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
      <Reveal>
        <div className="flex flex-wrap justify-between items-end gap-3" style={{ marginBottom: 20 }}>
          <div>
            <h1 className="display">Local Demo</h1>
            <p className="caption" style={{ marginTop: 4 }}>Grade one question with the on-device model</p>
          </div>
          <button onClick={checkHealth} className="btn-secondary">Recheck model</button>
        </div>
      </Reveal>

      <Reveal delay={50}>
        {health ? (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.9rem 1.25rem', marginBottom: 20 }}>
            <span className="pill pill-success">Model online</span>
            <p className="caption mono">{MODEL_URL} · MoE {String(health.moe_loaded)}</p>
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.9rem 1.25rem', marginBottom: 20 }}>
            <span className="pill pill-error">Model offline</span>
            <p className="caption">{healthErr || 'Checking model server…'}</p>
          </div>
        )}
      </Reveal>

      <Reveal delay={100}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
          <h2 className="title-2">Marking scheme · Q1</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block md:col-span-2">
              <span className="label">Rubric</span>
              <input className="input" value={rubric} onChange={(e) => setRubric(e.target.value)} />
            </label>
            <label className="block">
              <span className="label">Max points</span>
              <input className="input" value={maxPoints} onChange={(e) => setMaxPoints(e.target.value)} />
            </label>
          </div>
          <label className="block">
            <span className="label">Model answer</span>
            <input className="input" value={modelAnswer} onChange={(e) => setModelAnswer(e.target.value)} />
          </label>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5" style={{ marginBottom: 20 }}>
        <Reveal delay={150}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
            <h2 className="title-3">Question</h2>
            <textarea className="input" rows={6} value={question} onChange={(e) => setQuestion(e.target.value)} style={{ flex: 1 }} />
            <label className="btn-ghost row-press" style={{ alignSelf: 'flex-start', cursor: 'pointer' }}>
              {ocrBusy === 'q' ? 'Reading image…' : 'Scan from photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={ocrBusy !== null}
                onChange={(e) => e.target.files?.[0] && ocrInto(e.target.files[0], 'q')}
              />
            </label>
          </div>
        </Reveal>
        <Reveal delay={200}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
            <h2 className="title-3">Student answer</h2>
            <textarea className="input" rows={6} value={answer} onChange={(e) => setAnswer(e.target.value)} style={{ flex: 1 }} />
            <label className="btn-ghost row-press" style={{ alignSelf: 'flex-start', cursor: 'pointer' }}>
              {ocrBusy === 'a' ? 'Reading image…' : 'Scan from photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={ocrBusy !== null}
                onChange={(e) => e.target.files?.[0] && ocrInto(e.target.files[0], 'a')}
              />
            </label>
          </div>
        </Reveal>
      </div>

      <Reveal delay={250}>
        <button onClick={grade} disabled={grading || !health} className="btn-primary" style={{ width: '100%', padding: '0.8rem' }}>
          {grading ? 'Grading…' : 'Grade with local model'}
        </button>
      </Reveal>

      {error && <div className="banner banner-error" style={{ marginTop: 16 }} role="alert">{error}</div>}

      {result && (
        <Reveal>
          <div className="card" style={{ marginTop: 20 }}>
            <p className="caption">Result</p>
            <h2 className="display" style={{ color: 'var(--blue)', margin: '2px 0 16px' }}>
              <CountUp value={result.total} /> <span style={{ fontSize: '1.25rem', color: 'var(--ink-2)' }}>/ {maxPoints}</span>
            </h2>
            <div className="space-y-2" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Stagger step={70}>
                {result.per_question.map((q) => (
                  <div key={q.question_id} className="card-inset">
                    <div className="flex justify-between items-baseline gap-3">
                      <p className="mono caption">{q.question_id}</p>
                      <p className="title-3"><CountUp value={q.score} />/{q.max_points}</p>
                    </div>
                    <p className="body-2" style={{ color: 'var(--ink-2)', marginTop: 6 }}>{q.rationale}</p>
                  </div>
                ))}
              </Stagger>
            </div>
          </div>
        </Reveal>
      )}

      <p className="caption text-center" style={{ marginTop: 20 }}>
        No account needed. This page talks directly to the model server.
      </p>
    </div>
  )
}
