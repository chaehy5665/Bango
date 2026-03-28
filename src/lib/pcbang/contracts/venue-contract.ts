import type { CanonicalVenueRecord } from '@/lib/pcbang/dto'

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

function readOptionalString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key]
  if (value == null) {
    return undefined
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function readNumber(source: Record<string, unknown>, key: string): number | null {
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

  return null
}

export function validateVenueContract(input: unknown): ValidationResult<CanonicalVenueRecord> {
  if (!isRecord(input)) {
    return { ok: false, errors: ['venue payload must be an object'] }
  }

  const errors: string[] = []
  const name = readNonEmptyString(input, 'name')
  const addressFull = readNonEmptyString(input, 'address_full')
  const addressDistrict = readNonEmptyString(input, 'address_district')
  const lat = readNumber(input, 'lat')
  const lng = readNumber(input, 'lng')

  if (!name) {
    errors.push('name is required')
  }

  if (!addressFull) {
    errors.push('address_full is required')
  }

  if (!addressDistrict) {
    errors.push('address_district is required')
  }

  if (lat === null || lng === null) {
    errors.push('lat and lng must be resolved numbers')
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  const output: CanonicalVenueRecord = {
    name: name!,
    address_full: addressFull!,
    address_district: addressDistrict!,
    lat: lat!,
    lng: lng!,
  }

  const phone = readOptionalString(input, 'phone')
  if (phone) {
    output.phone = phone
  }

  if (isRecord(input.operating_hours)) {
    const parsedOperatingHours: Record<string, string> = {}
    for (const [key, value] of Object.entries(input.operating_hours)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        parsedOperatingHours[key] = value.trim()
      }
    }

    if (Object.keys(parsedOperatingHours).length > 0) {
      output.operating_hours = parsedOperatingHours
    }
  }

  if (Array.isArray(input.amenities)) {
    const amenities = input.amenities
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)

    if (amenities.length > 0) {
      output.amenities = amenities
    }
  }

  const totalSeats = readNumber(input, 'total_seats')
  if (totalSeats !== null) {
    output.total_seats = totalSeats
  }

  if (typeof input.parking_available === 'boolean') {
    output.parking_available = input.parking_available
  }

  return { ok: true, value: output }
}
