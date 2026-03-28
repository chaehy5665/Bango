import type { ParsedVenueCandidate, ParserDiagnostic } from '@/lib/pcbang/parser/dto'

export interface MergeConflict {
  entity_key: string
  field: string
  list_value: unknown
  detail_value: unknown
}

export interface MergeResult {
  merged: ParsedVenueCandidate[]
  conflicts: MergeConflict[]
}

function mergeField<T>(
  list_val: T | null | undefined,
  detail_val: T | null | undefined
): T | null | undefined {
  if (detail_val !== null && detail_val !== undefined) {
    return detail_val
  }
  if (list_val !== null && list_val !== undefined) {
    return list_val
  }
  return null
}

function detectConflict(
  list_val: unknown,
  detail_val: unknown,
  field: string,
  entity_key: string
): MergeConflict | null {
  const list_populated = list_val !== null && list_val !== undefined && list_val !== ''
  const detail_populated = detail_val !== null && detail_val !== undefined && detail_val !== ''

  if (list_populated && detail_populated && list_val !== detail_val) {
    return {
      entity_key,
      field,
      list_value: list_val,
      detail_value: detail_val,
    }
  }

  return null
}

export function mergeRecords(
  list_candidates: ParsedVenueCandidate[],
  detail_candidates: ParsedVenueCandidate[]
): MergeResult {
  const list_map = new Map<string, ParsedVenueCandidate>()
  for (const candidate of list_candidates) {
    list_map.set(candidate.source_entity_key, candidate)
  }

  const detail_map = new Map<string, ParsedVenueCandidate>()
  for (const candidate of detail_candidates) {
    detail_map.set(candidate.source_entity_key, candidate)
  }

  const merged_map = new Map<string, ParsedVenueCandidate>()
  const conflicts: MergeConflict[] = []

  const all_keys = new Set([...list_map.keys(), ...detail_map.keys()])

  for (const key of all_keys) {
    const list_rec = list_map.get(key)
    const detail_rec = detail_map.get(key)

    if (!list_rec && detail_rec) {
      merged_map.set(key, detail_rec)
      continue
    }

    if (list_rec && !detail_rec) {
      merged_map.set(key, list_rec)
      continue
    }

    if (!list_rec || !detail_rec) {
      continue
    }

    const conflict_fields = ['name', 'address_full', 'address_district', 'lat', 'lng', 'phone']
    for (const field of conflict_fields) {
      const conflict = detectConflict(
        list_rec[field as keyof ParsedVenueCandidate],
        detail_rec[field as keyof ParsedVenueCandidate],
        field,
        key
      )
      if (conflict) {
        conflicts.push(conflict)
      }
    }

    const merged: ParsedVenueCandidate = {
      source_entity_key: key,
      name: mergeField(list_rec.name, detail_rec.name) ?? null,
      address_full: mergeField(list_rec.address_full, detail_rec.address_full) ?? null,
      address_district: mergeField(list_rec.address_district, detail_rec.address_district) ?? null,
      lat: mergeField(list_rec.lat, detail_rec.lat) ?? null,
      lng: mergeField(list_rec.lng, detail_rec.lng) ?? null,
      phone: mergeField(list_rec.phone, detail_rec.phone) ?? null,
      operating_hours: mergeField(list_rec.operating_hours, detail_rec.operating_hours) ?? null,
      amenities: mergeField(list_rec.amenities, detail_rec.amenities) ?? null,
      total_seats: mergeField(list_rec.total_seats, detail_rec.total_seats) ?? null,
      parking_available: mergeField(list_rec.parking_available, detail_rec.parking_available) ?? null,
      pricing_tiers:
        (detail_rec.pricing_tiers && detail_rec.pricing_tiers.length > 0 ? detail_rec.pricing_tiers : undefined) ??
        (list_rec.pricing_tiers && list_rec.pricing_tiers.length > 0 ? list_rec.pricing_tiers : undefined) ??
        [],
      raw_metadata: {
        ...list_rec.raw_metadata,
        ...detail_rec.raw_metadata,
      },
    }

    merged_map.set(key, merged)
  }

  return {
    merged: Array.from(merged_map.values()),
    conflicts,
  }
}

export function conflictsTodiagnostics(conflicts: MergeConflict[]): ParserDiagnostic[] {
  return conflicts.map((conflict) => ({
    severity: 'warning' as const,
    target_id: 'merge',
    message: `Merge conflict on ${conflict.field} for entity ${conflict.entity_key}`,
    context: {
      entity_key: conflict.entity_key,
      field: conflict.field,
      list_value: conflict.list_value,
      detail_value: conflict.detail_value,
    },
  }))
}
