import type { CaptureBundle } from '@/lib/pcbang/parser/bundle-reader'
import type { ParsedVenueCandidate, ParserDiagnostic, ParserResult } from '@/lib/pcbang/parser/dto'
import { conflictsTodiagnostics, mergeRecords } from '@/lib/pcbang/parser/merge-records'
import { parsePicaListJson } from './parse-list'
import { parsePicaDetailInfo, parsePicaDetailMap } from './parse-detail'

function mergeDetailFragments(detailResults: ParserResult[]): ParserResult | null {
  if (detailResults.length === 0) {
    return null
  }

  let mergedCandidates: ParsedVenueCandidate[] = []
  const diagnostics: ParserDiagnostic[] = []

  for (const result of detailResults) {
    diagnostics.push(...result.diagnostics)

    const merge = mergeRecords(mergedCandidates, result.candidates)
    mergedCandidates = merge.merged
    diagnostics.push(...conflictsTodiagnostics(merge.conflicts))
  }

  return {
    target_id: 'detail_followup_merged',
    candidates: mergedCandidates,
    diagnostics,
  }
}

export function parsePicaBundles(bundles: CaptureBundle[]): ParserResult[] {
  const results: ParserResult[] = []
  const detailResults: ParserResult[] = []

  for (const bundle of bundles) {
    if (
      bundle.target_id === 'main_pcbang_list_json' ||
      bundle.target_id.startsWith('main_pcbang_list_page_')
    ) {
      const { candidates, diagnostics } = parsePicaListJson(bundle)
      results.push({
        target_id: bundle.target_id,
        candidates,
        diagnostics,
      })
      continue
    }

    if (bundle.target_id.startsWith('detail_info_seq_')) {
      const { candidates, diagnostics } = parsePicaDetailInfo(bundle)
      detailResults.push({
        target_id: bundle.target_id,
        candidates,
        diagnostics,
      })
      continue
    }

    if (bundle.target_id.startsWith('detail_map_seq_')) {
      const { candidates, diagnostics } = parsePicaDetailMap(bundle)
      detailResults.push({
        target_id: bundle.target_id,
        candidates,
        diagnostics,
      })
      continue
    }

    if (
      bundle.target_id === 'main_html' ||
      bundle.target_id === 'franchise_list_html' ||
      bundle.target_id === 'notice_list_html'
    ) {
      results.push({
        target_id: bundle.target_id,
        candidates: [],
        diagnostics: [
          {
            severity: 'info',
            target_id: bundle.target_id,
            message: `Auxiliary target ${bundle.target_id} skipped`,
          },
        ],
      })
      continue
    }

    results.push({
      target_id: bundle.target_id,
      candidates: [],
      diagnostics: [
        {
          severity: 'warning',
          target_id: bundle.target_id,
          message: `Unknown target_id: ${bundle.target_id}`,
        },
      ],
    })
  }

  const mergedDetailResult = mergeDetailFragments(detailResults)
  if (mergedDetailResult) {
    results.push(mergedDetailResult)
  }

  return results
}
