import type { CaptureBundle } from '@/lib/pcbang/parser/bundle-reader'
import type { ParserDiagnostic, ParsedVenueCandidate } from '@/lib/pcbang/parser/dto'

function extractDistrict(address: string): string | null {
  const district_match = address.match(/(?:^|\s)([가-힣]+(?:구|군|시))(?:\s|\(|$)/)
  return district_match ? district_match[1] : null
}

function extractSeqFromTargetId(target_id: string): number | null {
  const match = target_id.match(/detail_(?:info|map)_seq_(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

function parseMapCoordinates(html: string): { lat: number; lng: number } | null {
  const lat_lng_match = html.match(/daum\.maps\.LatLng\s*\(\s*["']?([0-9.]+)["']?\s*,\s*["']?([0-9.]+)["']?\s*\)/)
  if (lat_lng_match) {
    const lat = parseFloat(lat_lng_match[1])
    const lng = parseFloat(lat_lng_match[2])
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng }
    }
  }
  return null
}

function parseInfoFields(html: string): {
  name: string | null
  address: string | null
  intro: string | null
  amenities: string[]
} {
  let name: string | null = null
  let address: string | null = null
  let intro: string | null = null
  const amenities: string[] = []

  const name_match = html.match(/<h2[^>]*class="tit-pop"[^>]*>([^<]+)<\/h2>/)
  if (name_match) {
    name = name_match[1].trim()
  }

  const addr_match = html.match(/<div class="right">\s*<p>([^<]+)<\/p>/)
  if (addr_match) {
    address = addr_match[1].trim()
  }

  const intro_match = html.match(/<div[^>]*class="box-txt"[^>]*>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/)
  if (intro_match) {
    intro = intro_match[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim()
  }

  const amenity_pattern = /<span class="item"><span>([^<]+)<\/span><\/span>/g
  let amenity_match: RegExpExecArray | null
  while ((amenity_match = amenity_pattern.exec(html)) !== null) {
    const amenity = amenity_match[1].trim()
    if (amenity.length > 0) {
      amenities.push(amenity)
    }
  }

  return { name, address, intro, amenities }
}

export function parsePicaDetailInfo(bundle: CaptureBundle): {
  candidates: ParsedVenueCandidate[]
  diagnostics: ParserDiagnostic[]
} {
  const candidates: ParsedVenueCandidate[] = []
  const diagnostics: ParserDiagnostic[] = []

  const seq = extractSeqFromTargetId(bundle.target_id)
  if (!seq) {
    diagnostics.push({
      severity: 'error',
      target_id: bundle.target_id,
      message: 'Could not extract SEQ from target_id',
    })
    return { candidates, diagnostics }
  }

  if (typeof bundle.body !== 'string') {
    diagnostics.push({
      severity: 'error',
      target_id: bundle.target_id,
      message: 'Expected string body for HTML',
    })
    return { candidates, diagnostics }
  }

  const { name, address, intro, amenities } = parseInfoFields(bundle.body)

  if (!name || !address) {
    diagnostics.push({
      severity: 'warning',
      target_id: bundle.target_id,
      message: 'Could not extract name or address from info.do',
    })
    return { candidates, diagnostics }
  }

  const district = extractDistrict(address)

  candidates.push({
    source_entity_key: `pica:${seq}`,
    name,
    address_full: address,
    address_district: district,
    lat: null,
    lng: null,
    amenities,
    pricing_tiers: [],
    raw_metadata: {
      seq,
      intro,
    },
  })

  return { candidates, diagnostics }
}

export function parsePicaDetailMap(bundle: CaptureBundle): {
  candidates: ParsedVenueCandidate[]
  diagnostics: ParserDiagnostic[]
} {
  const candidates: ParsedVenueCandidate[] = []
  const diagnostics: ParserDiagnostic[] = []

  const seq = extractSeqFromTargetId(bundle.target_id)
  if (!seq) {
    diagnostics.push({
      severity: 'error',
      target_id: bundle.target_id,
      message: 'Could not extract SEQ from target_id',
    })
    return { candidates, diagnostics }
  }

  if (typeof bundle.body !== 'string') {
    diagnostics.push({
      severity: 'error',
      target_id: bundle.target_id,
      message: 'Expected string body for HTML',
    })
    return { candidates, diagnostics }
  }

  const coords = parseMapCoordinates(bundle.body)
  if (!coords) {
    diagnostics.push({
      severity: 'warning',
      target_id: bundle.target_id,
      message: 'Could not extract coordinates from map.do',
    })
    return { candidates, diagnostics }
  }

  const { name, address } = parseInfoFields(bundle.body)

  if (!name || !address) {
    diagnostics.push({
      severity: 'warning',
      target_id: bundle.target_id,
      message: 'Could not extract name or address from map.do',
    })
  }

  const district = address ? extractDistrict(address) : null

  candidates.push({
    source_entity_key: `pica:${seq}`,
    name: name ?? '',
    address_full: address ?? '',
    address_district: district,
    lat: coords.lat,
    lng: coords.lng,
    pricing_tiers: [],
    raw_metadata: {
      seq,
    },
  })

  return { candidates, diagnostics }
}
