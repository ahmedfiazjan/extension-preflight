import type { Rule } from '../types'
import { makeEvidence } from '../evidence'

const REFERENCE =
  'https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code'

const REMOTE_SCRIPT = /<script\b[^>]*\bsrc\s*=\s*["']?(?:https?:)?\/\/[^"'\s>]+/gi

const isHtml = (path: string) => /\.html?$/i.test(path)

export const remoteScript: Rule = {
  id: 'remote-script',
  needs: 'files',
  run: (ctx) =>
    ctx.files
      .filter((file) => isHtml(file.path))
      .flatMap((file) =>
        [...file.text.matchAll(REMOTE_SCRIPT)].map((match) => ({
          ruleId: 'remote-script',
          severity: 'high' as const,
          title: `${file.path} loads a script from another server`,
          why: 'Manifest V3 requires everything your extension does to be visible in the code you submit. A script tag pointing at another server pulls in logic nobody reviewed. This is one of the most reliably enforced rejection reasons there is.',
          fix: 'Download that script, add it to your package, and point the tag at the local copy.',
          reference: REFERENCE,
          basis: 'HTML script tag parse',
          evidence: makeEvidence(file.path, file.text, match.index, match[0].length),
        })),
      ),
}
