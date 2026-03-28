import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { buildSourceScorecard, parseCandidateIds } from '@/lib/pcbang/source-evaluation'
import { WAVE1_SOURCE_RUBRIC } from '@/lib/pcbang/source-rubric'

describe('source evaluation', () => {
  test('scores known baseline candidates with explicit legal/access failures', () => {
    const scorecard = buildSourceScorecard(parseCandidateIds('kakao-map,naver-map,linked-official'), WAVE1_SOURCE_RUBRIC)

    assert.equal(scorecard.candidates.length, 3)

    const kakao = scorecard.candidates.find((candidate) => candidate.candidate === 'kakao-map')
    assert.ok(kakao)
    assert.equal(kakao.hard_gate.pass, false)
    assert.equal(kakao.hard_gate.reasons.includes('legal_access_not_permitted_under_current_evidence'), true)

    const linkedOfficial = scorecard.candidates.find((candidate) => candidate.candidate === 'linked-official')
    assert.ok(linkedOfficial)
    assert.equal(linkedOfficial.hard_gate.pass, false)
    assert.equal(linkedOfficial.hard_gate.reasons.includes('not_single_repeatable_source_family'), true)
  })

  test('forced captcha candidate fails with captcha_or_mfa_required', () => {
    const scorecard = buildSourceScorecard(parseCandidateIds('forced-captcha-source'), WAVE1_SOURCE_RUBRIC)
    assert.equal(scorecard.candidates.length, 1)
    assert.equal(scorecard.candidates[0].hard_gate.pass, false)
    assert.equal(scorecard.candidates[0].hard_gate.reasons.includes('captcha_or_mfa_required'), true)
  })
})
