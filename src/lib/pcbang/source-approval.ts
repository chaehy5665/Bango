import type { SourceScorecard } from '@/lib/pcbang/source-evaluation'

export interface SourceApprovalDecisionApproved {
  task: 'task-3-source-decision'
  generated_at: string
  status: 'approved'
  source: string
  reasons: []
}

export interface SourceApprovalDecisionHalt {
  task: 'task-3-source-decision'
  generated_at: string
  status: 'halt'
  reasons: string[]
  evaluated_candidates: Array<{
    candidate: string
    hard_gate_pass: boolean
    hard_gate_reasons: string[]
    total_score: number
  }>
}

export type SourceApprovalDecision = SourceApprovalDecisionApproved | SourceApprovalDecisionHalt

export function decideSourceApproval(scorecard: SourceScorecard): SourceApprovalDecision {
  const passingCandidates = scorecard.candidates.filter((candidate) => candidate.hard_gate.pass)

  if (passingCandidates.length === 1) {
    return {
      task: 'task-3-source-decision',
      generated_at: new Date().toISOString(),
      status: 'approved',
      source: passingCandidates[0].candidate,
      reasons: [],
    }
  }

  if (passingCandidates.length > 1) {
    const highestScore = Math.max(...passingCandidates.map((candidate) => candidate.total_score))
    const highestScored = passingCandidates.filter((candidate) => candidate.total_score === highestScore)

    if (highestScored.length === 1) {
      return {
        task: 'task-3-source-decision',
        generated_at: new Date().toISOString(),
        status: 'approved',
        source: highestScored[0].candidate,
        reasons: [],
      }
    }

    return {
      task: 'task-3-source-decision',
      generated_at: new Date().toISOString(),
      status: 'halt',
      reasons: ['multiple_candidates_passed_hard_gates_without_single_winner'],
      evaluated_candidates: scorecard.candidates.map((candidate) => ({
        candidate: candidate.candidate,
        hard_gate_pass: candidate.hard_gate.pass,
        hard_gate_reasons: candidate.hard_gate.reasons,
        total_score: candidate.total_score,
      })),
    }
  }

  return {
    task: 'task-3-source-decision',
    generated_at: new Date().toISOString(),
    status: 'halt',
    reasons: ['no_candidate_passed_all_hard_gates'],
    evaluated_candidates: scorecard.candidates.map((candidate) => ({
      candidate: candidate.candidate,
      hard_gate_pass: candidate.hard_gate.pass,
      hard_gate_reasons: candidate.hard_gate.reasons,
      total_score: candidate.total_score,
    })),
  }
}
