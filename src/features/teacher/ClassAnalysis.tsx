// class-level analysis over final grades: distribution, moderation preview
// and one-click moderation, plus answer-similarity flags when sheets carry
// extracted answer text.

import { useMemo, useState } from 'react'
import type { AnswerSheetWithRelations, GradeResult } from '../../lib/supabase'
import { updateTeacherGrade } from '../../lib/supabase'
import {
  gradeDistribution,
  moderateMarks,
  flagSimilarAnswers,
  type CopyFlag,
} from '../../lib/analysis'

function pct(n: number): string {
  return (n * 100).toFixed(0) + '%'
}

// clamped per-sheet scale, applied to total and every question in the rubric
function scaleGrade(grade: GradeResult, factor: number): GradeResult {
  return {
    total: Math.round(grade.total * factor * 100) / 100,
    per_question: grade.per_question.map((q) => ({
      ...q,
      score: Math.round(q.score * factor * 100) / 100,
    })),
  }
}

export function ClassAnalysis({
  paperTotal,
  sheets,
  onModerated,
}: {
  paperTotal: number
  sheets: AnswerSheetWithRelations[]
  onModerated: (sheetId: string, grade: GradeResult) => void
}) {
  const marked = useMemo(
    () => sheets.filter((s) => typeof s.final_grade?.total === 'number'),
    [sheets],
  )
  const dist = useMemo(
    () => gradeDistribution(marked.map((s) => s.final_grade.total), paperTotal),
    [marked, paperTotal],
  )

  const [targetMean, setTargetMean] = useState<string>(
    dist.mean ? dist.mean.toFixed(1) : '15',
  )
  const [applying, setApplying] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // answer text, when the marking edge case has stored it, feeds copy flags
  const copyFlags: CopyFlag[] = useMemo(() => {
    const withAnswers = sheets
      .filter((s) => typeof (s as Record<string, unknown>).extracted_answers === 'object')
      .map((s) => ({
        id: s.id,
        grade: s.final_grade as GradeResult | null,
        answers: (s as unknown as { extracted_answers: Record<string, string> }).extracted_answers,
      }))
    return withAnswers.length >= 2 ? flagSimilarAnswers(withAnswers) : []
  }, [sheets])

  const preview = useMemo(() => {
    const t = parseFloat(targetMean)
    if (!marked.length || !Number.isFinite(t)) return null
    return moderateMarks(
      marked.map((s) => s.final_grade.total),
      paperTotal,
      t,
    )
  }, [targetMean, marked, paperTotal])

  if (marked.length === 0) {
    return (
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="title-2">Class Analysis</h2>
        <p className="caption" style={{ marginTop: 8 }}>
          Averages and moderation unlock once sheets are graded.
        </p>
      </div>
    )
  }

  const step = paperTotal / dist.buckets.length

  async function applyModeration() {
    if (!preview) return
    setApplying(true)
    setNotice(null)
    try {
      for (let i = 0; i < marked.length; i++) {
        const sheet = marked[i]
        const scaled = scaleGrade(sheet.final_grade, preview.scaled[i] / sheet.final_grade.total)
        await updateTeacherGrade(sheet.id, scaled, `moderated ×${preview.factor.toFixed(3)}`)
        onModerated(sheet.id, scaled)
      }
      setNotice(`${marked.length} sheets scaled ×${preview.factor.toFixed(3)} and marked reviewed.`)
    } catch (e) {
      setNotice('moderation failed for some sheets: ' + String(e).slice(0, 120))
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="flex flex-wrap justify-between items-center gap-4" style={{ marginBottom: 16 }}>
        <h2 className="title-2">Class Analysis</h2>
        <span className="pill pill-neutral">{dist.count} graded</span>
      </div>

      <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
        <span className="pill pill-info">mean {dist.mean.toFixed(1)}</span>
        <span className="pill pill-info">median {dist.median.toFixed(1)}</span>
        <span className="pill pill-neutral">stdev {dist.stdev.toFixed(1)}</span>
        <span className="pill pill-neutral">min {dist.min.toFixed(1)}</span>
        <span className="pill pill-success">max {dist.max.toFixed(1)}</span>
      </div>

      <div className="flex items-end gap-1" style={{ height: 72, marginBottom: 4 }}>
        {dist.buckets.map((b, i) => (
          <div
            key={i}
            title={`${(i * step).toFixed(1)}–${((i + 1) * step).toFixed(1)} : ${pct(b)}`}
            style={{
              flex: 1,
              height: `${Math.max(4, b * 100)}%`,
              background: 'var(--accent, #0071e3)',
              opacity: b > 0 ? 0.85 : 0.15,
              borderRadius: 4,
            }}
          />
        ))}
      </div>
      <p className="mono caption" style={{ marginBottom: 20 }}>
        0 → {paperTotal} pts
      </p>

      <div className="card-inset" style={{ marginBottom: 12 }}>
        <p className="label">Moderation</p>
        <p className="body-2" style={{ marginTop: 4 }}>
          Scale the whole class toward a target mean. The factor is clamped between
          0.5× and 2×, then applied to every final grade and its per-question breakdown.
        </p>
        <div className="flex items-center gap-3" style={{ marginTop: 12 }}>
          <input
            type="number"
            value={targetMean}
            min={0}
            max={paperTotal}
            step={0.5}
            onChange={(e) => setTargetMean(e.target.value)}
            className="mono"
            style={{
              width: 96,
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid var(--hairline, rgba(0,0,0,0.12))',
              background: 'transparent',
              color: 'inherit',
            }}
          />
          {preview && (
            <span className="mono caption">
              ×{preview.factor.toFixed(3)} · {marked.length} sheets
            </span>
          )}
          <button onClick={applyModeration} disabled={applying || !preview} className="btn-primary">
            {applying ? 'Applying…' : 'Apply moderation'}
          </button>
        </div>
        {notice && <p className="caption" style={{ marginTop: 8 }}>{notice}</p>}
      </div>

      {copyFlags.length > 0 && (
        <div className="card-inset">
          <p className="label" style={{ color: 'var(--red, #d70015)' }}>Answer similarity</p>
          <div className="space-y-1" style={{ marginTop: 6 }}>
            {copyFlags.map((f, i) => (
              <p key={i} className="mono caption">
                {f.questionId}: sheets {f.aId.slice(0, 6)} / {f.bId.slice(0, 6)} overlap {(f.score * 100).toFixed(0)}%
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
