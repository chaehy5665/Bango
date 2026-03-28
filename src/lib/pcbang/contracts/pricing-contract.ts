import type { CanonicalPricing, CanonicalPricingTier } from '@/lib/pcbang/dto'

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readNonEmptyString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key]
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function readNumberFrom(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return null
}

function readNotes(source: Record<string, unknown>): string | null {
  const notesValue = source.notes
  if (typeof notesValue === 'string' && notesValue.trim().length > 0) {
    return notesValue.trim()
  }

  const descriptionValue = source.description
  if (typeof descriptionValue === 'string' && descriptionValue.trim().length > 0) {
    return descriptionValue.trim()
  }

  return null
}

function normalizePricingPayload(source: Record<string, unknown>, fallbackNotesSource?: Record<string, unknown>): CanonicalPricing {
  const nestedPackage = isRecord(source.package) ? source.package : undefined
  const notes = readNotes(source) ?? (fallbackNotesSource ? readNotes(fallbackNotesSource) : null)

  return {
    hourly: readNumberFrom(source, ['hourly']),
    package_3h:
      readNumberFrom(source, ['package_3h', '3hours']) ??
      (nestedPackage ? readNumberFrom(nestedPackage, ['package_3h', '3hours', '3h']) : null),
    package_6h:
      readNumberFrom(source, ['package_6h', '6hours']) ??
      (nestedPackage ? readNumberFrom(nestedPackage, ['package_6h', '6hours', '6h']) : null),
    package_overnight:
      readNumberFrom(source, ['package_overnight', 'overnight']) ??
      (nestedPackage ? readNumberFrom(nestedPackage, ['package_overnight', 'overnight']) : null),
    notes,
  }
}

export function normalizePricingContract(input: unknown): ValidationResult<CanonicalPricingTier> {
  if (!isRecord(input)) {
    return { ok: false, errors: ['pricing payload must be an object'] }
  }

  const tierName = readNonEmptyString(input, 'tier_name')
  if (!tierName) {
    return { ok: false, errors: ['tier_name is required'] }
  }

  const source = isRecord(input.pricing_structure) ? input.pricing_structure : input

  return {
    ok: true,
    value: {
      tier_name: tierName,
      pricing: normalizePricingPayload(source, input),
    },
  }
}
