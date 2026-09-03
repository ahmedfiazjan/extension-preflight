import type { Rule } from '../types'
import { makeEvidence, locate } from '../evidence'
import {
  contentScriptMatches,
  declaredPermissions,
  hostPermissions,
  isBroadPattern,
} from '../manifest-fields'

const REFERENCE = 'https://developer.chrome.com/docs/webstore/program-policies/permissions'

const coveredBy = (match: string, hosts: string[]) =>
  hosts.some((host) => isBroadPattern(host) || host === match)

export const redundantPermission: Rule = {
  id: 'redundant-permission',
  needs: 'manifest',
  run: (ctx) => {
    if (ctx.manifest === null || ctx.manifestText === null) return []
    if (!declaredPermissions(ctx.manifest).includes('activeTab')) return []

    const hosts = hostPermissions(ctx.manifest)
    if (hosts.length === 0) return []

    const matches = contentScriptMatches(ctx.manifest)
    if (matches.length === 0) return []
    if (!matches.every((match) => coveredBy(match, hosts))) return []

    return [
      {
        ruleId: 'redundant-permission',
        severity: 'review',
        title: 'activeTab may add nothing your host permissions do not already give you',
        why: 'Every origin you declare is already granted permanently through host_permissions, so activeTab has nothing left to unlock. Reviewers do reject submissions for requesting a permission another setting already covers, and at least one developer fixed exactly this by deleting activeTab.',
        fix: 'Check whether your extension ever acts on a site outside your host permissions. If it does not, remove activeTab.',
        reference: REFERENCE,
        basis: 'Exact manifest match',
        evidence: makeEvidence(
          'manifest.json',
          ctx.manifestText,
          locate(ctx.manifestText, 'activeTab'),
          'activeTab'.length,
        ),
      },
    ]
  },
}
