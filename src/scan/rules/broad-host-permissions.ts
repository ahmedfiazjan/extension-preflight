import type { Rule } from '../types'
import { makeEvidence, locate } from '../evidence'
import { contentScriptMatches, hostPermissions, isBroadPattern } from '../manifest-fields'

const REFERENCE = 'https://developer.chrome.com/docs/webstore/program-policies/permissions'

export const broadHostPermissions: Rule = {
  id: 'broad-host-permissions',
  needs: 'manifest',
  run: (ctx) => {
    if (ctx.manifest === null || ctx.manifestText === null) return []

    const broad = [
      ...hostPermissions(ctx.manifest),
      ...contentScriptMatches(ctx.manifest),
    ].filter(isBroadPattern)

    if (broad.length === 0) return []

    const pattern = broad[0] as string

    return [
      {
        ruleId: 'broad-host-permissions',
        severity: 'review',
        title: `You are asking for access to every site: ${[...new Set(broad)].join(', ')}`,
        why: 'Google names broad host patterns as one of the things that slows a review down, because they allow browsing history collection, search hijacking and credential harvesting. Broad access is allowed. It is just examined closely, and you will have to defend it.',
        fix: 'List only the origins your extension actually touches. If you really do need every site, say precisely why in the Privacy practices tab.',
        reference: REFERENCE,
        confidence: 'high',
        evidence: makeEvidence(
          'manifest.json',
          ctx.manifestText,
          locate(ctx.manifestText, pattern),
          pattern.length,
        ),
      },
    ]
  },
}
