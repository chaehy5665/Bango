import type { CaptureBundle } from '@/lib/pcbang/parser/bundle-reader'
import type { ParserResult } from '@/lib/pcbang/parser/dto'
import { parseGetoListHtml } from './parse-list'
import { parseGetoDetailHtml } from './parse-detail'

export function parseGetoBundles(bundles: CaptureBundle[]): ParserResult[] {
  const results: ParserResult[] = []

  for (const bundle of bundles) {
    if (bundle.target_id === 'seoul_gangnam_list_html') {
      const { candidates, diagnostics } = parseGetoListHtml(bundle)
      results.push({
        target_id: bundle.target_id,
        candidates,
        diagnostics,
      })
    } else if (bundle.target_id === 'sample_detail_html') {
      const { candidates, diagnostics } = parseGetoDetailHtml(bundle)
      results.push({
        target_id: bundle.target_id,
        candidates,
        diagnostics,
      })
    } else if (bundle.target_id === 'landing_html' || bundle.target_id === 'district_list_json') {
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
    } else {
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
  }

  return results
}
