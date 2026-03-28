import type { CaptureBundle } from '@/lib/pcbang/parser/bundle-reader'
import type { ParserDiagnostic, ParsedVenueCandidate } from '@/lib/pcbang/parser/dto'

function extractDistrict(address: string): string | null {
  const district_match = address.match(/(?:^|\s)([가-힣]+(?:구|군|시))(?:\s|\(|$)/)
  return district_match ? district_match[1] : null
}

interface PicaPcbangRecord {
  PCBANGID?: string
  PCBANGNAME?: string
  ADDRESS?: string
  SEQ?: number
  THUMB_FILE_PATH?: string
  SIGNING_CNT?: number
}

export function parsePicaListJson(bundle: CaptureBundle): {
  candidates: ParsedVenueCandidate[]
  diagnostics: ParserDiagnostic[]
} {
  const candidates: ParsedVenueCandidate[] = []
  const diagnostics: ParserDiagnostic[] = []

  if (typeof bundle.body !== 'object' || bundle.body === null) {
    diagnostics.push({
      severity: 'error',
      target_id: bundle.target_id,
      message: 'Expected JSON object body',
    })
    return { candidates, diagnostics }
  }

  const payload = bundle.body as Record<string, unknown>

  if (payload.result !== 1) {
    diagnostics.push({
      severity: 'warning',
      target_id: bundle.target_id,
      message: `API result is not 1: ${payload.result}`,
    })
  }

  if (!Array.isArray(payload.pcbangList)) {
    diagnostics.push({
      severity: 'error',
      target_id: bundle.target_id,
      message: 'pcbangList is not an array',
    })
    return { candidates, diagnostics }
  }

  const list = payload.pcbangList as PicaPcbangRecord[]

  for (const record of list) {
    const pcbang_id = record.PCBANGID
    const seq = record.SEQ
    const name = record.PCBANGNAME
    const address = record.ADDRESS

    if (!seq || !name || !address) {
      diagnostics.push({
        severity: 'warning',
        target_id: bundle.target_id,
        message: 'Record missing required fields (SEQ, name, or address)',
        context: { record },
      })
      continue
    }

    const district = extractDistrict(address)

    candidates.push({
      source_entity_key: `pica:${seq}`,
      name,
      address_full: address,
      address_district: district,
      lat: null,
      lng: null,
      pricing_tiers: [],
      raw_metadata: {
        pcbang_id,
        seq,
      },
    })
  }

  if (candidates.length === 0) {
    diagnostics.push({
      severity: 'warning',
      target_id: bundle.target_id,
      message: 'No candidates extracted from pcbangList',
    })
  }

  return { candidates, diagnostics }
}
