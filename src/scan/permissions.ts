export const NO_API_SURFACE = new Set([
  'activeTab',
  'background',
  'clipboardRead',
  'clipboardWrite',
  'geolocation',
  'nativeMessaging',
  'unlimitedStorage',
  'webRequestBlocking',
])

const PROPERTY_OVERRIDES: Record<string, string> = {
  declarativeNetRequestWithHostAccess: 'declarativeNetRequest',
  declarativeNetRequestFeedback: 'declarativeNetRequest',
}

const SAFE_IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]*$/

export const apiPropertyFor = (permission: string): string | null => {
  if (NO_API_SURFACE.has(permission)) return null
  const property = PROPERTY_OVERRIDES[permission] ?? permission
  return SAFE_IDENTIFIER.test(property) ? property : null
}

export const usesApiProperty = (text: string, property: string): boolean =>
  new RegExp(`\\.${property}\\b`).test(text)
