// pure client-side analysis over final grades: distribution stats,
// moderation scaling, and answer-similarity flags. no supabase, no network.

import type { GradeResult } from './supabase'

export type Distribution = {
  count: number
  mean: number
  median: number
  stdev: number
  min: number
  max: number
  // ten equal-width buckets between 0 and maxTotal, as fractions of count
  buckets: number[]
}

export function gradeDistribution(
  marks: number[],
  maxTotal: number,
  bucketCount = 10,
): Distribution {
  const n = marks.length
  if (n === 0 || maxTotal <= 0) {
    return { count: n, mean: 0, median: 0, stdev: 0, min: 0, max: 0, buckets: new Array(bucketCount).fill(0) }
  }
  const sorted = [...marks].sort((a, b) => a - b)
  const mean = marks.reduce((s, v) => s + v, 0) / n
  const median = n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2
  const variance = marks.reduce((s, v) => s + (v - mean) * (v - mean), 0) / n
  const buckets = new Array(bucketCount).fill(0)
  for (const v of marks) {
    // last score falls in the top bucket, not one past the edge
    const idx = Math.min(bucketCount - 1, Math.floor((v / maxTotal) * bucketCount))
    buckets[idx] += 1
  }
  return {
    count: n,
    mean,
    median,
    stdev: Math.sqrt(variance),
    min: sorted[0],
    max: sorted[n - 1],
    buckets: buckets.map((b) => b / n),
  }
}

export type Moderation = {
  factor: number
  targetMean: number
  // per-student scaled marks, clamped to [0, maxTotal]
  scaled: number[]
}

export function moderateMarks(
  marks: number[],
  maxTotal: number,
  targetMean: number,
): Moderation {
  const n = marks.length
  if (n === 0 || maxTotal <= 0) return { factor: 1, targetMean, scaled: [] }
  const currentMean = marks.reduce((s, v) => s + v, 0) / n
  if (currentMean <= 0) return { factor: 1, targetMean, scaled: [...marks] }
  const factor = targetMean / currentMean
  // keep the requested mean bounded so a fat-finger cannot wipe a class's marks
  const safeFactor = Math.max(0.5, Math.min(2.0, factor))
  return {
    factor: safeFactor,
    targetMean,
    scaled: marks.map((v) => Math.max(0, Math.min(maxTotal, v * safeFactor))),
  }
}

// character trigram jaccard: cheap, order-tolerant, works fine on short answers
export function trigrams(text: string): Set<string> {
  const t = '  ' + text.toLowerCase().replace(/\s+/g, ' ').trim() + ' '
  const out = new Set<string>()
  for (let i = 0; i < t.length - 2; i++) out.add(t.slice(i, i + 3))
  return out
}

export function similarity(a: string, b: string): number {
  const A = trigrams(a)
  const B = trigrams(b)
  if (A.size === 0 && B.size === 0) return 1
  let inter = 0
  for (const g of A) if (B.has(g)) inter++
  return inter / (A.size + B.size - inter)
}

export type CopyFlag = {
  aId: string
  bId: string
  questionId: string
  score: number
}

const SIM_THRESHOLD = 0.82

export function flagSimilarAnswers(
  sheets: Array<{ id: string; grade: GradeResult | null; answers?: Record<string, string> }>,
): CopyFlag[] {
  const flags: CopyFlag[] = []
  for (let i = 0; i < sheets.length; i++) {
    for (let j = i + 1; j < sheets.length; j++) {
      const sa = sheets[i].answers
      const sb = sheets[j].answers
      if (!sa || !sb) continue
      for (const q of Object.keys(sa)) {
        if (!sb[q]) continue
        const score = similarity(sa[q], sb[q])
        if (score >= SIM_THRESHOLD) {
          flags.push({ aId: sheets[i].id, bId: sheets[j].id, questionId: q, score })
        }
      }
    }
  }
  return flags.sort((x, y) => y.score - x.score).slice(0, 20)
}
