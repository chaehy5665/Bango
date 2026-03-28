import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { decideSourceApproval } from '@/lib/pcbang/source-approval'
import { buildSourceScorecard, parseCandidateIds } from '@/lib/pcbang/source-evaluation'
import { WAVE1_SOURCE_RUBRIC } from '@/lib/pcbang/source-rubric'

describe('source approval', () => {
  test('halts when no candidates pass hard gates', () => {
    const scorecard = buildSourceScorecard(parseCandidateIds('kakao-map,naver-map,linked-official'), WAVE1_SOURCE_RUBRIC)
    const decision = decideSourceApproval(scorecard)

    assert.equal(decision.status, 'halt')
    if (decision.status !== 'halt') {
      return
    }

    assert.equal(decision.reasons.includes('no_candidate_passed_all_hard_gates'), true)
  })

  test('halts on blocked scorecard candidate', () => {
    const scorecard = buildSourceScorecard(parseCandidateIds('forced-captcha-source'), WAVE1_SOURCE_RUBRIC)
    const decision = decideSourceApproval(scorecard)

    assert.equal(decision.status, 'halt')
  })
})
