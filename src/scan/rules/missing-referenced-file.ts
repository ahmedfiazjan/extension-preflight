import type { Rule, ScanContext } from '../types'
import { makeEvidence, locate } from '../evidence'
import { asArray, asRecord, strings } from '../manifest-fields'

const REFERENCE = 'https://developer.chrome.com/docs/webstore/prepare/'

const referencedPaths = (manifest: Record<string, unknown>): string[] => {
  const paths: string[] = []

  for (const script of asArray(manifest['content_scripts'])) {
    const entry = asRecord(script)
    paths.push(...strings(asArray(entry['js'])), ...strings(asArray(entry['css'])))
  }

  const background = asRecord(manifest['background'])
  if (typeof background['service_worker'] === 'string') paths.push(background['service_worker'])

  const action = asRecord(manifest['action'])
  if (typeof action['default_popup'] === 'string') paths.push(action['default_popup'])
  if (typeof action['default_icon'] === 'string') paths.push(action['default_icon'])
  paths.push(...strings(Object.values(asRecord(action['default_icon']))))

  paths.push(...strings(Object.values(asRecord(manifest['icons']))))

  if (typeof manifest['options_page'] === 'string') paths.push(manifest['options_page'])
  const optionsUi = asRecord(manifest['options_ui'])
  if (typeof optionsUi['page'] === 'string') paths.push(optionsUi['page'])

  if (typeof manifest['devtools_page'] === 'string') paths.push(manifest['devtools_page'])

  for (const resource of asArray(manifest['web_accessible_resources'])) {
    paths.push(...strings(asArray(asRecord(resource)['resources'])))
  }

  return paths
}

const normalise = (path: string) => path.replace(/^\.?\//, '')

const missingFrom = (ctx: ScanContext, manifest: Record<string, unknown>): string[] => {
  const present = new Set(ctx.entryPaths.map(normalise))

  return referencedPaths(manifest)
    .map(normalise)
    .filter((path) => !path.includes('*'))
    .filter((path) => !present.has(path))
}

export const missingReferencedFile: Rule = {
  id: 'missing-referenced-file',
  needs: 'manifest',
  run: (ctx) => {
    const manifestText = ctx.manifestText
    if (ctx.manifest === null || manifestText === null) return []

    const missing = [...new Set(missingFrom(ctx, ctx.manifest))]

    return missing.map((path) => ({
      ruleId: 'missing-referenced-file',
      severity: 'high' as const,
      title: `Your manifest points at a file the ZIP does not contain: ${path}`,
      why: `The manifest asks for ${path}, but nothing by that name is in the ZIP. Chrome will refuse to load the extension. This usually means the build wrote somewhere other than the folder you zipped.`,
      fix: `Add ${path} to the ZIP, or point the manifest at the path that is actually there.`,
      reference: REFERENCE,
      confidence: 'high' as const,
      evidence: makeEvidence(
        'manifest.json',
        manifestText,
        locate(manifestText, path),
        path.length,
      ),
    }))
  },
}
