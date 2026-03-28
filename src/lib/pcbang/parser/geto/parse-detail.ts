import type { CaptureBundle } from '@/lib/pcbang/parser/bundle-reader'
import type { ParserDiagnostic, ParsedVenueCandidate } from '@/lib/pcbang/parser/dto'

function extractDistrict(address: string | null): string | null {
  if (!address) {
    return null
  }

  const district_match = address.match(/(?:^|\s)([가-힣]+(?:구|군|시))(?:\s|\(|$)/)
  return district_match ? district_match[1] : null
}

export function parseGetoDetailHtml(bundle: CaptureBundle): {
  candidates: ParsedVenueCandidate[]
  diagnostics: ParserDiagnostic[]
} {
  const candidates: ParsedVenueCandidate[] = []
  const diagnostics: ParserDiagnostic[] = []

  if (typeof bundle.body !== 'string') {
    diagnostics.push({
      severity: 'error',
      target_id: bundle.target_id,
      message: 'Expected HTML string body',
    })
    return { candidates, diagnostics }
  }

  const html = bundle.body

  const name_pattern = /<h4>([^<]+)/
  const address_pattern = /<p>([^<]+)<\/p>/
  const draw_map_pattern = /draw_map\("([^"]+)"\s*,\s*"([^"]+)"\)/

  const name_match = html.match(name_pattern)
  const address_match = html.match(address_pattern)
  const coords_match = html.match(draw_map_pattern)

  if (!name_match && !address_match && !coords_match) {
    diagnostics.push({
      severity: 'warning',
      target_id: bundle.target_id,
      message: 'No detail data extracted from HTML',
    })
    return { candidates, diagnostics }
  }

  const name = name_match ? name_match[1].trim() : null
  const address = address_match ? address_match[1].trim() : null
  const lat = coords_match ? parseFloat(coords_match[1]) : null
  const lng = coords_match ? parseFloat(coords_match[2]) : null

  const shop_seq_match = bundle.metadata.request_url.match(/shop_seq=(\d+)/)
  const shop_seq = shop_seq_match ? shop_seq_match[1] : null

  if (!shop_seq) {
    diagnostics.push({
      severity: 'warning',
      target_id: bundle.target_id,
      message: 'No shop_seq found in request URL',
    })
    return { candidates, diagnostics }
  }

  const district = extractDistrict(address)

  candidates.push({
    source_entity_key: `geto:${shop_seq}`,
    name,
    address_full: address,
    address_district: district,
    lat,
    lng,
    pricing_tiers: [],
    raw_metadata: {
      shop_seq,
    },
  })

  return { candidates, diagnostics }
}
