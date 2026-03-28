import type { CaptureBundle } from '@/lib/pcbang/parser/bundle-reader'
import type { ParserDiagnostic, ParsedVenueCandidate } from '@/lib/pcbang/parser/dto'

function extractDistrict(address: string): string | null {
  const district_match = address.match(/(?:^|\s)([가-힣]+(?:구|군|시))(?:\s|\(|$)/)
  return district_match ? district_match[1] : null
}

export function parseGetoListHtml(bundle: CaptureBundle): {
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

  const shop_seq_pattern = /shop_seq=(\d+)/g
  const name_pattern = /<span[^>]*title="([^"]+)"[^>]*class="[^"]*add[^"]*cursor[^"]*">([^<]+)<\/span>/g
  const address_pattern = /<span class="add cursor" title="([^"]+)">([^<]+)<\/span>/g

  const shop_ids: string[] = []
  let match: RegExpExecArray | null

  while ((match = shop_seq_pattern.exec(html)) !== null) {
    shop_ids.push(match[1])
  }

  const names: string[] = []
  while ((match = name_pattern.exec(html)) !== null) {
    names.push(match[1] || match[2])
  }

  const addresses: string[] = []
  while ((match = address_pattern.exec(html)) !== null) {
    addresses.push((match[1] || match[2]).trim())
  }

  if (shop_ids.length === 0) {
    diagnostics.push({
      severity: 'warning',
      target_id: bundle.target_id,
      message: 'No shop_seq found in list HTML',
    })
  }

  const min_count = Math.min(shop_ids.length, names.length, addresses.length)

  for (let i = 0; i < min_count; i++) {
    const shop_id = shop_ids[i]
    const name = names[i]
    const address = addresses[i]

    const district = extractDistrict(address)

    candidates.push({
      source_entity_key: `geto:${shop_id}`,
      name,
      address_full: address,
      address_district: district,
      lat: null,
      lng: null,
      pricing_tiers: [],
      raw_metadata: {
        shop_seq: shop_id,
      },
    })
  }

  if (shop_ids.length !== names.length || names.length !== addresses.length) {
    diagnostics.push({
      severity: 'warning',
      target_id: bundle.target_id,
      message: `Mismatched counts: ${shop_ids.length} shop_ids, ${names.length} names, ${addresses.length} addresses`,
      context: {
        shop_ids: shop_ids.length,
        names: names.length,
        addresses: addresses.length,
      },
    })
  }

  return { candidates, diagnostics }
}
