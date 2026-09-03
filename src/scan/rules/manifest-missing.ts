import type { Rule } from '../types'

const REFERENCE = 'https://developer.chrome.com/docs/webstore/prepare/'

export const manifestMissing: Rule = {
  id: 'manifest-missing',
  needs: 'manifest',
  run: (ctx) => {
    if (ctx.manifestText !== null) return []

    const nested = ctx.files.find((file) => file.path.endsWith('/manifest.json'))

    return [
      {
        ruleId: 'manifest-missing',
        severity: 'high',
        title: 'No manifest.json at the top level of your ZIP',
        why: nested
          ? `Your ZIP has ${nested.path} one level down. Chrome only looks at the top level, so it will not load this package. This happens when you zip the extension folder instead of what is inside it.`
          : 'Chrome reads manifest.json from the top level of the ZIP. Without it, the package will not load at all.',
        fix: nested
          ? 'Select the files inside your extension folder, then zip those. Do not zip the folder itself.'
          : 'Add a manifest.json at the top level of the ZIP.',
        reference: REFERENCE,
        basis: 'ZIP entry listing',
        evidence: null,
      },
    ]
  },
}
