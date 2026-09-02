import type { Rule } from '../types'
import { makeEvidence, locate } from '../evidence'
import { declaredPermissions } from '../manifest-fields'
import { apiPropertyFor, usesApiProperty } from '../permissions'

const REFERENCE = 'https://developer.chrome.com/docs/webstore/program-policies/permissions'

export const unusedPermission: Rule = {
  id: 'unused-permission',
  needs: 'files',
  run: (ctx) => {
    const manifestText = ctx.manifestText
    if (ctx.manifest === null || manifestText === null) return []

    const code = ctx.files.filter((file) => file.path !== 'manifest.json')

    return declaredPermissions(ctx.manifest).flatMap((permission) => {
      const property = apiPropertyFor(permission)
      if (property === null) return []
      if (code.some((file) => usesApiProperty(file.text, property))) return []

      return [
        {
          ruleId: 'unused-permission',
          severity: 'review' as const,
          title: `You request ${permission} but nothing in your code appears to use it`,
          why: `Your manifest asks for ${permission}, but no reference to a ${property} API turned up anywhere in the package. Reviewers send back a rejection worded "Requesting but not using the following permission(s)" for this. This check reads your code without running it, so it cannot see an API you reach dynamically. Treat it as something to confirm, not as proof.`,
          fix: `Confirm you really use ${permission}. If you do not, take it out of the manifest.`,
          reference: REFERENCE,
          confidence: 'medium' as const,
          evidence: makeEvidence(
            'manifest.json',
            manifestText,
            locate(manifestText, permission),
            permission.length,
          ),
        },
      ]
    })
  },
}
