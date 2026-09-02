import type { Rejection } from './guards'
import type { Justifications } from './justifications'

export type Severity = 'high' | 'review'
export type Confidence = 'high' | 'medium'
export type RuleInput = 'manifest' | 'files'

export type Evidence = {
  file: string
  offset: number
  excerpt: string
  matchStart: number
  matchLength: number
}

export type Finding = {
  ruleId: string
  severity: Severity
  title: string
  why: string
  fix: string
  reference: string
  confidence: Confidence
  evidence: Evidence | null
}

export type ExtensionFile = {
  path: string
  text: string
}

export type ScanContext = {
  entryPaths: string[]
  files: ExtensionFile[]
  manifest: Record<string, unknown> | null
  manifestText: string | null
  manifestError: string | null
}

export type Rule = {
  id: string
  needs: RuleInput
  run(ctx: ScanContext): Finding[]
}

export type ScanResult = {
  status: 'complete' | 'rejected'
  findings: Finding[]
  erroredRules: string[]
  checksPassed: number
  fileCount: number
  rejection: Rejection | null
  justifications: Justifications
}
