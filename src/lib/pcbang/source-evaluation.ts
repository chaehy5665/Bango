import type { SourceRubric } from '@/lib/pcbang/dto'

export type SourceCandidateId = 'kakao-map' | 'naver-map' | 'linked-official' | 'forced-captcha-source'

type CandidateDimensionKey =
  | 'legality_access'
  | 'listing_completeness'
  | 'pricing_coverage'
  | 'selector_stability'
  | 'execution_cost'

interface CandidateDimensionScore {
  score: number
  pass: boolean
  reasons: string[]
}

interface CandidateObservedMetrics {
  identity_recoverable_count: number
  pricing_recoverable_count: number
  selector_navigation_stable_count: number
  median_acquisition_seconds: number
  repeatable_source_family: boolean
  login_required: boolean
  automation_permitted: boolean
}

interface CandidateHardGateStatus {
  pass: boolean
  reasons: string[]
}

export interface SourceCandidateScore {
  candidate: SourceCandidateId
  hard_gate: CandidateHardGateStatus
  dimensions: Record<CandidateDimensionKey, CandidateDimensionScore>
  observed: CandidateObservedMetrics
  total_score: number
}

export interface SourceScorecard {
  task: 'task-2-source-scorecard'
  city: 'seoul'
  sample_size: 20
  generated_at: string
  rubric: SourceRubric
  candidates: SourceCandidateScore[]
}

interface CandidateProfile {
  id: SourceCandidateId
  observed: CandidateObservedMetrics
  fixed_reasons: string[]
}

const CANDIDATE_PROFILES: Record<SourceCandidateId, CandidateProfile> = {
  'kakao-map': {
    id: 'kakao-map',
    observed: {
      identity_recoverable_count: 18,
      pricing_recoverable_count: 3,
      selector_navigation_stable_count: 6,
      median_acquisition_seconds: 22,
      repeatable_source_family: true,
      login_required: false,
      automation_permitted: false,
    },
    fixed_reasons: [
      'legal_access_not_permitted_under_current_evidence',
      'selector_stability_below_required_threshold',
    ],
  },
  'naver-map': {
    id: 'naver-map',
    observed: {
      identity_recoverable_count: 19,
      pricing_recoverable_count: 4,
      selector_navigation_stable_count: 7,
      median_acquisition_seconds: 20,
      repeatable_source_family: true,
      login_required: false,
      automation_permitted: false,
    },
    fixed_reasons: [
      'legal_access_not_permitted_under_current_evidence',
      'selector_stability_below_required_threshold',
    ],
  },
  'linked-official': {
    id: 'linked-official',
    observed: {
      identity_recoverable_count: 12,
      pricing_recoverable_count: 8,
      selector_navigation_stable_count: 9,
      median_acquisition_seconds: 18,
      repeatable_source_family: false,
      login_required: false,
      automation_permitted: false,
    },
    fixed_reasons: [
      'not_single_repeatable_source_family',
      'insufficient_evidence_of_automation_permission',
    ],
  },
  'forced-captcha-source': {
    id: 'forced-captcha-source',
    observed: {
      identity_recoverable_count: 0,
      pricing_recoverable_count: 0,
      selector_navigation_stable_count: 0,
      median_acquisition_seconds: 999,
      repeatable_source_family: false,
      login_required: true,
      automation_permitted: false,
    },
    fixed_reasons: ['captcha_or_mfa_required'],
  },
}

const CANDIDATE_ID_SET: Set<string> = new Set(Object.keys(CANDIDATE_PROFILES))

export function parseCandidateIds(raw: string): SourceCandidateId[] {
  const candidateIds = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  if (candidateIds.length === 0) {
    throw new Error('candidates list cannot be empty')
  }

  const invalid = candidateIds.filter((id) => !CANDIDATE_ID_SET.has(id))
  if (invalid.length > 0) {
    throw new Error(`unknown candidate(s): ${invalid.join(',')}`)
  }

  return Array.from(new Set(candidateIds)) as SourceCandidateId[]
}

function buildHardGate(profile: CandidateProfile, rubric: SourceRubric): CandidateHardGateStatus {
  const reasons: string[] = [...profile.fixed_reasons]

  if (profile.observed.identity_recoverable_count < rubric.thresholds.identity_recoverable_min) {
    reasons.push('identity_threshold_not_met')
  }

  if (profile.observed.pricing_recoverable_count < rubric.thresholds.pricing_recoverable_min) {
    reasons.push('pricing_threshold_not_met')
  }

  if (profile.observed.selector_navigation_stable_count < rubric.thresholds.selector_navigation_stability_min) {
    reasons.push('stability_threshold_not_met')
  }

  if (profile.observed.median_acquisition_seconds >= rubric.thresholds.median_acquisition_seconds_max) {
    reasons.push('median_acquisition_time_exceeded')
  }

  if (!profile.observed.repeatable_source_family) {
    reasons.push('not_single_repeatable_source_family')
  }

  if (!profile.observed.automation_permitted) {
    reasons.push('automation_not_permitted')
  }

  return {
    pass: reasons.length === 0,
    reasons: Array.from(new Set(reasons)),
  }
}

function withPass(score: number, threshold: number, reasonsOnFail: string[]): CandidateDimensionScore {
  return {
    score,
    pass: score >= threshold,
    reasons: score >= threshold ? [] : reasonsOnFail,
  }
}

function buildDimensions(profile: CandidateProfile): Record<CandidateDimensionKey, CandidateDimensionScore> {
  const legalityScore = profile.observed.automation_permitted ? 90 : 10
  const listingScore = Math.round((profile.observed.identity_recoverable_count / 20) * 100)
  const pricingScore = Math.round((profile.observed.pricing_recoverable_count / 20) * 100)
  const stabilityScore = Math.round((profile.observed.selector_navigation_stable_count / 20) * 100)
  const executionCostScore = profile.observed.median_acquisition_seconds < 15 ? 85 : 30

  return {
    legality_access: withPass(legalityScore, 70, profile.fixed_reasons),
    listing_completeness: withPass(listingScore, 80, ['identity_threshold_not_met']),
    pricing_coverage: withPass(pricingScore, 0, []),
    selector_stability: withPass(stabilityScore, 90, ['stability_threshold_not_met']),
    execution_cost: withPass(executionCostScore, 60, ['median_acquisition_time_exceeded']),
  }
}

export function buildSourceScorecard(candidateIds: SourceCandidateId[], rubric: SourceRubric): SourceScorecard {
  const candidates: SourceCandidateScore[] = candidateIds.map((id) => {
    const profile = CANDIDATE_PROFILES[id]
    const hardGate = buildHardGate(profile, rubric)
    const dimensions = buildDimensions(profile)
    const rankingDimensions = [
      dimensions.legality_access,
      dimensions.listing_completeness,
      dimensions.selector_stability,
      dimensions.execution_cost,
    ]
    const totalScore = Math.round(
      rankingDimensions.reduce((sum, dimension) => sum + dimension.score, 0) / rankingDimensions.length
    )

    return {
      candidate: id,
      hard_gate: hardGate,
      dimensions,
      observed: profile.observed,
      total_score: totalScore,
    }
  })

  return {
    task: 'task-2-source-scorecard',
    city: 'seoul',
    sample_size: 20,
    generated_at: new Date().toISOString(),
    rubric,
    candidates,
  }
}
