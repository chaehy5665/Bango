import { validateVenueContract } from '@/lib/pcbang/contracts/venue-contract'
import { normalizePricingContract } from '@/lib/pcbang/contracts/pricing-contract'
import type { ParsedVenueCandidate, ParserDiagnostic } from '@/lib/pcbang/parser/dto'
import type { CanonicalVenueWithPricing } from '@/lib/pcbang/canonical/models'

export interface CanonicalNormalizationResult {
  accepted: CanonicalVenueWithPricing[]
  invalid: ParsedVenueCandidate[]
  diagnostics: ParserDiagnostic[]
}

export function normalizeToCanonical(
  candidates: ParsedVenueCandidate[]
): CanonicalNormalizationResult {
  const accepted: CanonicalVenueWithPricing[] = []
  const invalid: ParsedVenueCandidate[] = []
  const diagnostics: ParserDiagnostic[] = []

  for (const candidate of candidates) {
    const result = validateVenueContract(candidate)

    if (result.ok) {
      const pricing_tiers = (candidate.pricing_tiers ?? [])
        .map((tier) => {
          const normalized = normalizePricingContract(tier)

          if (!normalized.ok) {
            diagnostics.push({
              severity: 'warning',
              target_id: 'canonical_pricing',
              message: `Pricing normalization failed for entity ${candidate.source_entity_key}: ${normalized.errors.join(', ')}`,
              context: {
                entity_key: candidate.source_entity_key,
                errors: normalized.errors,
                tier,
              },
            })

            return null
          }

          return normalized.value
        })
        .filter((tier): tier is NonNullable<typeof tier> => tier !== null)

      if (pricing_tiers.length === 0) {
        diagnostics.push({
          severity: 'info',
          target_id: 'canonical_pricing',
          message: `No pricing tiers extracted for entity ${candidate.source_entity_key}; pricing is user-managed after ingestion`,
          context: {
            entity_key: candidate.source_entity_key,
          },
        })
      }

      accepted.push({
        venue: result.value,
        pricing_tiers,
      })
    } else {
      invalid.push(candidate)
      diagnostics.push({
        severity: 'error',
        target_id: 'canonical_validation',
        message: `Validation failed for entity ${candidate.source_entity_key}: ${result.errors.join(', ')}`,
        context: {
          entity_key: candidate.source_entity_key,
          errors: result.errors,
          candidate,
        },
      })
    }
  }

  return { accepted, invalid, diagnostics }
}
