import type { Finding } from './types'
import { contentScriptMatches, declaredPermissions, hostPermissions } from './manifest-fields'

export type Justification = { permission: string; text: string }

export type Justifications = {
  permissions: Justification[]
  remoteCode: { usesRemoteCode: boolean; text: string }
}

const originOf = (pattern: string): string | null => {
  const cleaned = pattern.replace(/^\*:\/\//, '').replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (cleaned === '' || cleaned === '*' || pattern === '<all_urls>') return null
  return cleaned.replace(/^\*\./, '')
}

const describeScope = (manifest: Record<string, unknown>): string => {
  const origins = [...hostPermissions(manifest), ...contentScriptMatches(manifest)]
    .map(originOf)
    .filter((origin): origin is string => origin !== null)

  const unique = [...new Set(origins)]
  if (unique.length === 0) return 'the pages the user is viewing'
  if (unique.length === 1) return unique[0] as string
  if (unique.length <= 3) return unique.join(', ')
  return `${unique.slice(0, 3).join(', ')} and ${unique.length - 3} other origins`
}

const TEMPLATES: Record<string, (scope: string) => string> = {
  storage: () =>
    'Saves the settings a user picks so they are still there next time the browser opens.',
  unlimitedStorage: () =>
    'Stores more data on the device than the default quota allows. Say what is stored and roughly how much.',
  activeTab: () =>
    'Reads the tab the user is looking at, and only after they click the toolbar icon.',
  scripting: (scope) =>
    `Runs this extension's script on ${scope} so it can make its changes to the page.`,
  tabs: (scope) =>
    `Reads tab details on ${scope} to tell which page the user is on. Name the exact property you need, because this permission shows users a browsing history warning.`,
  cookies: (scope) => `Reads cookies on ${scope}. Name the cookie and the feature that needs it.`,
  downloads: () => 'Saves a file when the user asks the extension to export one.',
  notifications: () => 'Tells the user when something they started has finished.',
  contextMenus: () => 'Adds an item to the right click menu so the user can start the extension from the page.',
  alarms: () => 'Runs a check on a schedule in the background. Say how often, and what it does.',
  webRequest: (scope) =>
    `Watches network requests on ${scope}. Say what you look at, and confirm you neither block nor change anything.`,
  declarativeNetRequest: (scope) =>
    `Applies fixed rules to requests on ${scope}. Note that users see a content blocking warning for this one.`,
  bookmarks: () => 'Reads or edits bookmarks, and only when the user asks the extension to.',
  history: () => 'Reads browsing history for a feature the user turned on themselves.',
  offscreen: () => 'Runs a short lived offscreen document for work the service worker cannot do itself.',
  sidePanel: () => 'Shows the extension in the browser side panel.',
}

const fallback = (permission: string, scope: string) =>
  `Uses the ${permission} API for a feature that affects ${scope}. Replace this line with the feature that actually needs it.`

export const buildJustifications = (
  manifest: Record<string, unknown> | null,
  findings: Finding[],
  erroredRules: string[] = [],
): Justifications => {
  const remote = findings.some((finding) => finding.ruleId === 'remote-script')
  const checkFailed = erroredRules.includes('remote-script')

  const remoteCode = checkFailed
    ? {
        usesRemoteCode: false,
        text: 'The remote code check did not finish, so the scan cannot answer this for you. Check it yourself before you fill in the form.',
      }
    : remote
    ? {
        usesRemoteCode: true,
        text: 'This package loads a script from another server. Manifest V3 wants your logic to ship inside the package, so this usually has to be removed rather than explained away.',
      }
    : {
        usesRemoteCode: false,
        text: 'No, I am not using remote code. All logic executed by this extension ships inside the reviewed package.',
      }

  if (manifest === null) return { permissions: [], remoteCode }

  const scope = describeScope(manifest)

  return {
    permissions: declaredPermissions(manifest).map((permission) => ({
      permission,
      text: TEMPLATES[permission]?.(scope) ?? fallback(permission, scope),
    })),
    remoteCode,
  }
}
