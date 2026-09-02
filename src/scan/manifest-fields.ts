export const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

export const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

export const strings = (values: unknown[]): string[] =>
  values.filter((value): value is string => typeof value === 'string')

export const BROAD_PATTERNS = ['<all_urls>', '*://*/*', 'https://*/*', 'http://*/*', '*://*/']

export const isBroadPattern = (pattern: string) => BROAD_PATTERNS.includes(pattern.trim())

export const hostPermissions = (manifest: Record<string, unknown>): string[] =>
  strings(asArray(manifest['host_permissions']))

export const contentScriptMatches = (manifest: Record<string, unknown>): string[] =>
  asArray(manifest['content_scripts']).flatMap((script) =>
    strings(asArray(asRecord(script)['matches'])),
  )

export const declaredPermissions = (manifest: Record<string, unknown>): string[] =>
  strings(asArray(manifest['permissions']))
