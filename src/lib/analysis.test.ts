import { describe, it, expect } from 'vitest'
import { gradeDistribution, moderateMarks, similarity, flagSimilarAnswers } from './analysis'

describe('gradeDistribution', () => {
  it('stats match the class', () => {
    const d = gradeDistribution([10, 12, 14, 14, 20], 20)
    expect(d.count).toBe(5)
    expect(d.mean).toBeCloseTo(14)
    expect(d.median).toBe(14)
    expect(d.min).toBe(10)
    expect(d.max).toBe(20)
    expect(d.buckets.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
  })
  it('empty class gives zeroes', () => {
    const d = gradeDistribution([], 20)
    expect(d.mean).toBe(0)
    expect(d.buckets.every((b) => b === 0)).toBe(true)
  })
  it('a full-mark sheet lands in the top bucket', () => {
    const d = gradeDistribution([20], 20)
    expect(d.buckets[9]).toBe(1)
  })
})

describe('moderateMarks', () => {
  it('scales to the target mean', () => {
    const m = moderateMarks([10, 10, 10, 10], 20, 8)
    expect(m.factor).toBeCloseTo(0.8)
    expect(m.scaled.every((v) => Math.abs(v - 8) < 1e-9)).toBe(true)
  })
  it('clamps to the paper total', () => {
    const m = moderateMarks([19, 19], 20, 25)
    expect(m.scaled.every((v) => v <= 20)).toBe(true)
  })
  it('refuses wild factors', () => {
    const m = moderateMarks([1, 1, 1], 20, 19)
    expect(m.factor).toBe(2.0)
    const m2 = moderateMarks([20, 20], 20, 5)
    expect(m2.factor).toBe(0.5)
  })
  it('no marks, no crash', () => {
    expect(moderateMarks([], 20, 10).scaled).toEqual([])
  })
})

describe('similarity', () => {
  it('identical text is near 1', () => {
    expect(similarity('the mitochondria is the powerhouse of the cell', 'the mitochondria is the powerhouse of the cell')).toBe(1)
  })
  it('different text is low', () => {
    expect(similarity('newton first law inertia', 'bohr model of hydrogen atom emits photons')).toBeLessThan(0.5)
  })
  it('both empty is 1, flagged as identical', () => {
    expect(similarity('', '')).toBe(1)
  })
})

describe('flagSimilarAnswers', () => {
  it('flags a copied pair and skips singles', () => {
    const sheets = [
      { id: 'a', grade: null, answers: { q1: 'the answer about gravity and mass' } },
      { id: 'b', grade: null, answers: { q1: 'the answer about gravity and mass' } },
      { id: 'c', grade: null, answers: { q1: 'completely different explanation of velocity' } },
    ]
    const flags = flagSimilarAnswers(sheets)
    expect(flags).toHaveLength(1)
    expect(flags[0].aId).toBe('a')
    expect(flags[0].bId).toBe('b')
  })
  it('no answers given, no flags, no crash', () => {
    expect(flagSimilarAnswers([{ id: 'a', grade: null }, { id: 'b', grade: null }])).toEqual([])
  })
})
