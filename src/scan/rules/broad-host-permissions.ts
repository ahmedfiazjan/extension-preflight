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
    const scope = [...new Set(broad)].join(', ')

    return [
      {
        ruleId: 'broad-host-permissions',
        severity: 'review',
        title: 'Broad host access needs a specific justification',
        why: `Requesting ${scope} grants access to every site. That can be legitimate, but Chrome asks for the narrowest scope your current features need, and a reviewer will ask which feature requires every site.`,
        fix: 'List only the origins your extension touches. If it genuinely needs every site, name the user-facing feature that requires it in the Privacy practices tab.',
        reference: REFERENCE,
        basis: 'Exact manifest match',
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
