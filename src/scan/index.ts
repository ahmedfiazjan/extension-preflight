import { unzipSync, strFromU8 } from 'fflate'
import type { ExtensionFile, Rule, ScanContext, ScanResult } from './types'
import { rules as defaultRules } from './rules'
import { checkArchive, type ArchiveEntry, type Rejection } from './guards'
import { buildJustifications } from './justifications'

const TEXT_EXTENSIONS = ['.json', '.js', '.mjs', '.html', '.htm', '.css']

const isTextPath = (path: string) =>
  TEXT_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext))

const listEntries = (bytes: Uint8Array): ArchiveEntry[] => {
  const entries: ArchiveEntry[] = []

  unzipSync(bytes, {
    filter: (file) => {
      entries.push({
        name: file.name,
        compressedSize: file.size,
        originalSize: file.originalSize,
      })
      return false
    },
  })

  return entries
}

const readTextFiles = (bytes: Uint8Array): ExtensionFile[] =>
  Object.entries(unzipSync(bytes, { filter: (file) => isTextPath(file.name) })).map(
    ([path, data]) => ({ path, text: strFromU8(data) }),
  )

const normalise = (path: string) => path.replace(/^\.?\//, '')

const parseManifest = (files: ExtensionFile[]) => {
  const file = files.find((entry) => normalise(entry.path) === 'manifest.json')
  if (!file) return { manifest: null, manifestText: null, manifestError: null }

  try {
    const parsed: unknown = JSON.parse(file.text)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {
        manifest: parsed as Record<string, unknown>,
        manifestText: file.text,
        manifestError: null,
      }
    }
    return {
      manifest: null,
      manifestText: file.text,
      manifestError: 'The top level of manifest.json is not a JSON object.',
    }
  } catch (error) {
    return {
      manifest: null,
      manifestText: file.text,
      manifestError: error instanceof Error ? error.message : String(error),
    }
  }
}

const rejected = (rejection: Rejection): ScanResult => ({
  status: 'rejected',
  findings: [],
  erroredRules: [],
  checksPassed: 0,
  fileCount: 0,
  filesRead: 0,
  rejection,
  justifications: { permissions: [], remoteCode: { usesRemoteCode: false, text: '' } },
})

export const scan = (bytes: Uint8Array, rules: Rule[] = defaultRules): ScanResult => {
  let entries: ArchiveEntry[]

  try {
    entries = listEntries(bytes)
  } catch {
    return rejected({
      code: 'not-an-archive',
      message: 'This is not a readable ZIP file. Check you picked the packaged extension and not something else.',
    })
  }

  const rejection = checkArchive(entries)
  if (rejection) return rejected(rejection)

  let files: ExtensionFile[]
  try {
    files = readTextFiles(bytes)
  } catch {
    return rejected({
      code: 'unreadable-entry',
      message:
        'At least one file inside this ZIP could not be opened. Rebuild it with ordinary ZIP compression rather than a variant such as LZMA, which some archive tools use by default.',
    })
  }
  const context: ScanContext = {
    entryPaths: entries.map((entry) => entry.name),
    files,
    ...parseManifest(files),
  }

  const findings = []
  const erroredRules: string[] = []

  for (const rule of rules) {
    try {
      findings.push(...rule.run(context))
    } catch {
      erroredRules.push(rule.id)
    }
  }

  const flagged = new Set(findings.map((finding) => finding.ruleId))

  return {
    status: 'complete',
    findings,
    erroredRules,
    checksPassed: rules.filter(
      (rule) => !flagged.has(rule.id) && !erroredRules.includes(rule.id),
    ).length,
    fileCount: entries.length,
    filesRead: files.length,
    rejection: null,
    justifications: buildJustifications(context.manifest, findings, erroredRules),
  }
}
