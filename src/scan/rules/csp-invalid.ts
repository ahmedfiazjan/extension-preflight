import type { Finding, Rule } from '../types'
import { makeEvidence, locate } from '../evidence'
import { asRecord } from '../manifest-fields'

const REFERENCE = 'https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements'

const UNSAFE_DIRECTIVES = ["'unsafe-eval'", "'unsafe-inline'"]
const CODE_DIRECTIVES = ['script-src', 'script-src-elem', 'worker-src', 'object-src']

const finding = (
  manifestText: string,
  needle: string,
  title: string,
  why: string,
  fix: string,
): Finding => ({
  ruleId: 'csp-invalid',
  severity: 'high',
  title,
  why,
  fix,
  reference: REFERENCE,
  basis: 'Policy directive parse',
  evidence: makeEvidence('manifest.json', manifestText, locate(manifestText, needle), needle.length),
})

const codeSources = (policy: string): string => {
  const declared = new Map<string, string>()

  for (const part of policy.split(';')) {
    const trimmed = part.trim()
    if (trimmed === '') continue
    const space = trimmed.search(/\s/)
    const name = space === -1 ? trimmed : trimmed.slice(0, space)
    declared.set(name.toLowerCase(), space === -1 ? '' : trimmed.slice(space + 1))
  }

  const fallback = declared.get('default-src') ?? ''
  return CODE_DIRECTIVES.map((name) => declared.get(name) ?? fallback).join(' ')
}

export const cspInvalid: Rule = {
  id: 'csp-invalid',
  needs: 'manifest',
  run: (ctx) => {
    if (ctx.manifest === null || ctx.manifestText === null) return []

    const policy = ctx.manifest['content_security_policy']
    if (policy === undefined) return []

    if (typeof policy === 'string') {
      return [
        finding(
          ctx.manifestText,
          'content_security_policy',
          'Your content_security_policy is still written the Manifest V2 way',
          'Manifest V3 expects an object here with extension_pages and sandbox members. A plain string is the V2 shape, so Chrome will ignore your policy entirely.',
          'Wrap the policy in an object and put it under extension_pages.',
        ),
      ]
    }

    const pages = asRecord(policy)['extension_pages']
    if (typeof pages !== 'string') return []

    const sources = codeSources(pages)

    const unsafe = UNSAFE_DIRECTIVES.filter((directive) => sources.includes(directive))
    if (unsafe.length > 0) {
      const directive = unsafe[0] as string
      return [
        finding(
          ctx.manifestText,
          directive,
          `Your policy still allows ${unsafe.join(' and ')}`,
          'Manifest V3 expects your logic to be self contained and readable by a reviewer. Loosening the policy this way lets your extension run code that was never part of what you submitted.',
          `Take ${unsafe.join(' and ')} out of extension_pages and bundle that code into the package.`,
        ),
      ]
    }

    const remote = /https?:\/\/[^\s;'"]+/.exec(sources)
    if (remote) {
      return [
        finding(
          ctx.manifestText,
          remote[0],
          `Your policy names a remote origin: ${remote[0]}`,
          'Manifest V3 does not let an extension run code fetched from another server. Naming one here tells a reviewer you intend to.',
          'Remove the origin and ship that code inside the package.',
        ),
      ]
    }

    return []
  },
}
