import { validateVenueContract } from '@/lib/pcbang/contracts/venue-contract'
import { normalizePricingContract } from '@/lib/pcbang/contracts/pricing-contract'
import type { ParsedVenueCandidate, ParserDiagnostic } from '@/lib/pcbang/parser/dto'
import type { CanonicalVenueWithPricing } from '@/lib/pcbang/canonical/models'
import type { SourceId } from '@/lib/pcbang/raw/dto'

export interface CanonicalNormalizationResult {
  accepted: CanonicalVenueWithPricing[]
  invalid: ParsedVenueCandidate[]
  diagnostics: ParserDiagnostic[]
}

function buildPricingSummary(candidate: ParsedVenueCandidate): string | undefined {
  const tiers = candidate.pricing_tiers ?? []

  const summaryParts = tiers
    .map((tier) => {
      const segments: string[] = []

      if (tier.description && tier.description.trim().length > 0) {
        segments.push(tier.description.trim())
      }

      if (tier.pricing_structure && typeof tier.pricing_structure === 'object') {
        for (const [key, value] of Object.entries(tier.pricing_structure)) {
          if (typeof value === 'number' && Number.isFinite(value)) {
            segments.push(`${key}:${value}`)
            continue
          }

          if (typeof value === 'string' && value.trim().length > 0) {
            segments.push(`${key}:${value.trim()}`)
          }
        }
      }

      if (segments.length === 0) {
        return tier.tier_name.trim().length > 0 ? tier.tier_name.trim() : null
      }

      const label = tier.tier_name.trim().length > 0 ? `${tier.tier_name.trim()}=` : ''
      return `${label}${segments.join(', ')}`
    })
    .filter((value): value is string => value !== null && value.length > 0)

  if (summaryParts.length === 0) {
    return undefined
  }

  return summaryParts.join(' | ')
}

function extractSourceId(sourceEntityKey: string): SourceId | null {
  const [sourceId] = sourceEntityKey.split(':')

  if (sourceId === 'geto' || sourceId === 'pica') {
    return sourceId
  }

  return null
}

export function normalizeToCanonical(
  candidates: ParsedVenueCandidate[]
): CanonicalNormalizationResult {
  const accepted: CanonicalVenueWithPricing[] = []
  const invalid: ParsedVenueCandidate[] = []
  const diagnostics: ParserDiagnostic[] = []

  for (const candidate of candidates) {
    const sourceId = extractSourceId(candidate.source_entity_key)
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

      if (!sourceId) {
        diagnostics.push({
          severity: 'warning',
          target_id: 'canonical_source',
          message: `Unable to extract source id from entity ${candidate.source_entity_key}`,
          context: {
            entity_key: candidate.source_entity_key,
          },
        })
      }

      accepted.push({
        venue: {
          ...result.value,
          ...(sourceId ? { source: sourceId } : {}),
          source_id: candidate.source_entity_key,
          location_text: result.value.address_full,
          ...(buildPricingSummary(candidate)
            ? { pricing_summary: buildPricingSummary(candidate) }
            : {}),
          ...(candidate.raw_metadata ? { raw_metadata: candidate.raw_metadata } : {}),
          ...(sourceId ? { source_ids: [sourceId] } : {}),
        },
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
