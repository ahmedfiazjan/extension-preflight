import type { Rule } from '../types'
import { makeEvidence } from '../evidence'

const REFERENCE = 'https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements'

const ESCAPE = /\\x[0-9a-fA-F]{2}|\\u[0-9a-fA-F]{4}/g

const ESCAPES_PER_1K_THRESHOLD = 5
const MINIMUM_ESCAPES = 100

const isScript = (path: string) => /\.m?js$/i.test(path)

export const obfuscatedCode: Rule = {
  id: 'obfuscated-code',
  needs: 'files',
  run: (ctx) =>
    ctx.files
      .filter((file) => isScript(file.path) && file.text.length > 0)
      .flatMap((file) => {
        const matches = [...file.text.matchAll(ESCAPE)]
        const density = (matches.length * 1000) / file.text.length

        if (matches.length < MINIMUM_ESCAPES || density < ESCAPES_PER_1K_THRESHOLD) return []

        const first = matches[0]
        if (first === undefined) return []

        return [
          {
            ruleId: 'obfuscated-code',
            severity: 'review' as const,
            title: `${file.path} looks obfuscated, not just minified`,
            why: `This file holds ${matches.length} character escapes, roughly ${density.toFixed(1)} for every thousand characters. Normal minified code sits well under one. That density is a signature of obfuscation tools, and Chrome expects a reviewer to be able to follow what your extension does. Minifying is fine and is not what this flags.`,
            fix: 'Ship readable or minified code. If a dependency arrives obfuscated, swap it out or be ready to explain it during review.',
            reference: REFERENCE,
            confidence: 'medium' as const,
            evidence: makeEvidence(file.path, file.text, first.index, first[0].length),
          },
        ]
      }),
}
