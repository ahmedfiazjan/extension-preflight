import type { Rule } from '../types'
import { makeEvidence } from '../evidence'

const REFERENCE = 'https://developer.chrome.com/docs/webstore/prepare/'

const positionFrom = (message: string): number => {
  const match = /at position (\d+)/.exec(message)
  return match?.[1] ? Number(match[1]) : 0
}

export const manifestInvalid: Rule = {
  id: 'manifest-invalid',
  needs: 'manifest',
  run: (ctx) => {
    if (ctx.manifestText === null || ctx.manifestError === null) return []

    return [
      {
        ruleId: 'manifest-invalid',
        severity: 'high',
        title: 'Your manifest.json will not parse',
        why: `The parser stopped here: ${ctx.manifestError}. Chrome will not load an extension whose manifest does not parse, and none of the other manifest checks could run on it.`,
        fix: 'Fix the syntax at that position. Trailing commas and comments cause this most often, and neither is allowed in JSON.',
        reference: REFERENCE,
        basis: 'manifest.json parse',
        evidence: makeEvidence(
          'manifest.json',
          ctx.manifestText,
          positionFrom(ctx.manifestError),
          1,
        ),
      },
    ]
  },
}
