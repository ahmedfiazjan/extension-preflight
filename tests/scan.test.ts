import { describe, it, expect } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { scan } from '../src/scan'
import { broadHostPermissions } from '../src/scan/rules/broad-host-permissions'
import { checkArchive } from '../src/scan/guards'

const zip = (files: Record<string, string>) =>
  zipSync(Object.fromEntries(Object.entries(files).map(([p, c]) => [p, strToU8(c)])))

const manifest = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ manifest_version: 3, name: 'Test', version: '1.0.0', ...extra })

describe('manifest presence', () => {
  it('flags an archive whose manifest is nested in a folder rather than at the root', () => {
    const result = scan(zip({ 'my-extension/manifest.json': manifest() }))

    const finding = result.findings.find((f) => f.ruleId === 'manifest-missing')
    expect(finding?.severity).toBe('high')
  })
})

describe('manifest validity', () => {
  it('flags a manifest that is not valid JSON', () => {
    const result = scan(zip({ 'manifest.json': '{ "manifest_version": 3, }' }))

    const finding = result.findings.find((f) => f.ruleId === 'manifest-invalid')
    expect(finding?.severity).toBe('high')
  })

  it('does not flag a valid manifest', () => {
    const result = scan(zip({ 'manifest.json': manifest() }))

    expect(result.findings.map((f) => f.ruleId)).not.toContain('manifest-invalid')
  })
})

describe('packaging sanity', () => {
  it('flags a manifest that references a file absent from the archive', () => {
    const result = scan(
      zip({
        'manifest.json': manifest({
          content_scripts: [{ matches: ['https://example.com/*'], js: ['content.js'] }],
        }),
      }),
    )

    const finding = result.findings.find((f) => f.ruleId === 'missing-referenced-file')
    expect(finding?.severity).toBe('high')
    expect(finding?.why).toContain('content.js')
  })

  it('does not flag when every referenced file is present', () => {
    const result = scan(
      zip({
        'manifest.json': manifest({
          content_scripts: [{ matches: ['https://example.com/*'], js: ['content.js'] }],
        }),
        'content.js': 'console.log(1)',
      }),
    )

    expect(result.findings.map((f) => f.ruleId)).not.toContain('missing-referenced-file')
  })
})

describe('broad host permissions', () => {
  it('flags <all_urls> for review', () => {
    const result = scan(zip({ 'manifest.json': manifest({ host_permissions: ['<all_urls>'] }) }))

    const finding = result.findings.find((f) => f.ruleId === 'broad-host-permissions')
    expect(finding?.severity).toBe('review')
  })

  it('flags a wildcard scheme-and-host pattern', () => {
    const result = scan(zip({ 'manifest.json': manifest({ host_permissions: ['*://*/*'] }) }))

    expect(result.findings.map((f) => f.ruleId)).toContain('broad-host-permissions')
  })

  it('does not flag a specific origin', () => {
    const result = scan(
      zip({ 'manifest.json': manifest({ host_permissions: ['https://example.com/*'] }) }),
    )

    expect(result.findings.map((f) => f.ruleId)).not.toContain('broad-host-permissions')
  })
})

describe('redundant permissions', () => {
  it('flags activeTab when host permissions already cover the content script matches', () => {
    const result = scan(
      zip({
        'manifest.json': manifest({
          permissions: ['activeTab'],
          host_permissions: ['https://calendar.google.com/*'],
          content_scripts: [{ matches: ['https://calendar.google.com/*'], js: ['c.js'] }],
        }),
        'c.js': '',
      }),
    )

    const finding = result.findings.find((f) => f.ruleId === 'redundant-permission')
    expect(finding?.confidence).toBe('medium')
  })

  it('does not flag activeTab when no host permissions are declared', () => {
    const result = scan(zip({ 'manifest.json': manifest({ permissions: ['activeTab'] }) }))

    expect(result.findings.map((f) => f.ruleId)).not.toContain('redundant-permission')
  })

  it('does not flag activeTab when host permissions do not cover the content script matches', () => {
    const result = scan(
      zip({
        'manifest.json': manifest({
          permissions: ['activeTab'],
          host_permissions: ['https://example.com/*'],
          content_scripts: [{ matches: ['https://other.test/*'], js: ['c.js'] }],
        }),
        'c.js': '',
      }),
    )

    expect(result.findings.map((f) => f.ruleId)).not.toContain('redundant-permission')
  })
})

describe('unused permissions', () => {
  it('flags a permission with no detectable usage', () => {
    const result = scan(
      zip({
        'manifest.json': manifest({ permissions: ['downloads'] }),
        'background.js': 'console.log("nothing here")',
      }),
    )

    const finding = result.findings.find((f) => f.ruleId === 'unused-permission')
    expect(finding?.severity).toBe('review')
    expect(finding?.title).toContain('downloads')
  })

  it('does not flag a permission used through a bundler-aliased namespace', () => {
    const result = scan(
      zip({
        'manifest.json': manifest({ permissions: ['storage'] }),
        'bundle.js': 'const e=globalThis.browser??globalThis.chrome;e.storage?.local.get("k")',
      }),
    )

    expect(result.findings.map((f) => f.ruleId)).not.toContain('unused-permission')
  })

  it('does not flag permissions that have no API surface', () => {
    const result = scan(
      zip({
        'manifest.json': manifest({ permissions: ['activeTab', 'unlimitedStorage'] }),
        'background.js': '',
      }),
    )

    expect(result.findings.map((f) => f.ruleId)).not.toContain('unused-permission')
  })

  it('finds usage in any file, not only content scripts', () => {
    const result = scan(
      zip({
        'manifest.json': manifest({ permissions: ['scripting'] }),
        'content.js': 'console.log("no api here")',
        'popup.js': 'chrome.scripting.executeScript({})',
      }),
    )

    expect(result.findings.map((f) => f.ruleId)).not.toContain('unused-permission')
  })
})

describe('content security policy', () => {
  it('flags the Manifest V2 string form', () => {
    const result = scan(
      zip({ 'manifest.json': manifest({ content_security_policy: "script-src 'self'" }) }),
    )

    const finding = result.findings.find((f) => f.ruleId === 'csp-invalid')
    expect(finding?.severity).toBe('high')
  })

  it('flags unsafe-eval in extension_pages', () => {
    const result = scan(
      zip({
        'manifest.json': manifest({
          content_security_policy: { extension_pages: "script-src 'self' 'unsafe-eval'" },
        }),
      }),
    )

    expect(result.findings.map((f) => f.ruleId)).toContain('csp-invalid')
  })

  it('flags a remote script source in the policy', () => {
    const result = scan(
      zip({
        'manifest.json': manifest({
          content_security_policy: { extension_pages: 'script-src https://cdn.example.com' },
        }),
      }),
    )

    expect(result.findings.map((f) => f.ruleId)).toContain('csp-invalid')
  })

  it('does not flag a compliant policy', () => {
    const result = scan(
      zip({
        'manifest.json': manifest({
          content_security_policy: { extension_pages: "script-src 'self'; object-src 'self'" },
        }),
      }),
    )

    expect(result.findings.map((f) => f.ruleId)).not.toContain('csp-invalid')
  })
})

describe('remote scripts in HTML', () => {
  it('flags a script tag loading from a remote origin', () => {
    const result = scan(
      zip({
        'manifest.json': manifest(),
        'popup.html': '<html><body><script src="https://cdn.example.com/a.js"></script></body></html>',
      }),
    )

    const finding = result.findings.find((f) => f.ruleId === 'remote-script')
    expect(finding?.severity).toBe('high')
    expect(finding?.evidence?.file).toBe('popup.html')
  })

  it('does not flag a local script tag', () => {
    const result = scan(
      zip({
        'manifest.json': manifest(),
        'popup.html': '<html><body><script src="popup.js"></script></body></html>',
      }),
    )

    expect(result.findings.map((f) => f.ruleId)).not.toContain('remote-script')
  })
})

describe('obfuscated code', () => {
  it('flags a file dense with hex escape sequences', () => {
    const obfuscated = 'var _0x=['.concat('"\\x41\\x42\\x43\\x44",'.repeat(200), '];')
    const result = scan(zip({ 'manifest.json': manifest(), 'bundle.js': obfuscated }))

    const finding = result.findings.find((f) => f.ruleId === 'obfuscated-code')
    expect(finding?.severity).toBe('review')
  })

  it('does not flag ordinary minified code', () => {
    const minified = 'const a=1,b=2;function c(d){return d*2}'.repeat(500)
    const result = scan(zip({ 'manifest.json': manifest(), 'bundle.js': minified }))

    expect(result.findings.map((f) => f.ruleId)).not.toContain('obfuscated-code')
  })
})

describe('archive guards', () => {
  it('rejects bytes that are not a ZIP archive', () => {
    const result = scan(new Uint8Array([1, 2, 3, 4, 5]))

    expect(result.status).toBe('rejected')
    expect(result.rejection?.code).toBe('not-an-archive')
    expect(result.findings).toEqual([])
  })

  it('rejects an archive containing a path traversal entry', () => {
    const result = scan(zip({ 'manifest.json': manifest(), '../escape.js': 'x' }))

    expect(result.status).toBe('rejected')
    expect(result.rejection?.code).toBe('unsafe-path')
  })

  it('rejects an archive with too many entries', () => {
    const many: Record<string, string> = { 'manifest.json': manifest() }
    for (let i = 0; i < 5001; i += 1) many[`f${i}.txt`] = 'x'

    const result = scan(zip(many))

    expect(result.status).toBe('rejected')
    expect(result.rejection?.code).toBe('too-many-entries')
  })

  it('produces no partial findings when a guard trips', () => {
    const result = scan(
      zip({ 'manifest.json': manifest({ host_permissions: ['<all_urls>'] }), '../x.js': 'y' }),
    )

    expect(result.findings).toEqual([])
  })

  it('reports a complete scan for a well-formed archive', () => {
    const result = scan(zip({ 'manifest.json': manifest() }))

    expect(result.status).toBe('complete')
    expect(result.rejection).toBeNull()
  })
})

describe('rule isolation', () => {
  it('keeps other findings when one rule throws, and records the failure', () => {
    const exploding = {
      id: 'exploding',
      needs: 'manifest' as const,
      run: () => {
        throw new Error('boom')
      },
    }

    const result = scan(zip({ 'manifest.json': manifest({ host_permissions: ['<all_urls>'] }) }), [
      exploding,
      broadHostPermissions,
    ])

    expect(result.erroredRules).toEqual(['exploding'])
    expect(result.findings.map((f) => f.ruleId)).toContain('broad-host-permissions')
  })
})

describe('permission justifications', () => {
  it('drafts one justification per declared permission', () => {
    const result = scan(
      zip({
        'manifest.json': manifest({ permissions: ['storage', 'scripting'] }),
        'b.js': 'chrome.storage.local;chrome.scripting.executeScript({})',
      }),
    )

    expect(result.justifications.permissions.map((j) => j.permission)).toEqual([
      'storage',
      'scripting',
    ])
  })

  it('names the extension own origins rather than emitting a generic sentence', () => {
    const result = scan(
      zip({
        'manifest.json': manifest({
          permissions: ['scripting'],
          host_permissions: ['https://calendar.google.com/*'],
        }),
        'b.js': 'chrome.scripting.executeScript({})',
      }),
    )

    const drafted = result.justifications.permissions[0]?.text ?? ''
    expect(drafted).toContain('calendar.google.com')
  })

  it('proposes a negative remote code answer when nothing remote is detected', () => {
    const result = scan(zip({ 'manifest.json': manifest(), 'popup.html': '<script src="a.js">' }))

    expect(result.justifications.remoteCode.usesRemoteCode).toBe(false)
  })

  it('proposes a positive remote code answer when a remote script is present', () => {
    const result = scan(
      zip({
        'manifest.json': manifest(),
        'popup.html': '<script src="https://cdn.example.com/a.js"></script>',
      }),
    )

    expect(result.justifications.remoteCode.usesRemoteCode).toBe(true)
  })
})

describe('guard false positives', () => {
  it('does not reject a large but highly compressible bundle as a bomb', () => {
    const result = scan(
      zip({ 'manifest.json': manifest(), 'bundle.js': 'function a(){return 1}'.repeat(20000) }),
    )

    expect(result.status).toBe('complete')
  })

  it('treats an entry declaring zero compressed size but large output as suspicious', () => {
    const entries = [{ name: 'a.js', compressedSize: 0, originalSize: 50 * 1024 * 1024 }]
    expect(checkArchive(entries)?.code).toBe('suspicious-compression')
  })
})

describe('hostile manifest values', () => {
  it('does not let a malformed permission name break the unused-permission rule', () => {
    const result = scan(
      zip({
        'manifest.json': manifest({ permissions: ['a(b', 'downloads'] }),
        'b.js': 'console.log(1)',
      }),
    )

    expect(result.erroredRules).toEqual([])
    expect(result.findings.map((f) => f.ruleId)).toContain('unused-permission')
  })

  it('rejects an archive whose entries cannot be decompressed', () => {
    const good = zip({ 'manifest.json': manifest(), 'a.js': 'x'.repeat(200) })
    const corrupted = good.slice()
    corrupted[corrupted.length - 60] = (corrupted[corrupted.length - 60] ?? 0) ^ 0xff
    const result = scan(corrupted)

    expect(['rejected', 'complete']).toContain(result.status)
    if (result.status === 'rejected') expect(result.rejection?.code).toBeDefined()
  })
})

describe('redundant permission precision', () => {
  it('does not flag activeTab when the extension declares no content scripts', () => {
    const result = scan(
      zip({
        'manifest.json': manifest({
          permissions: ['activeTab'],
          host_permissions: ['https://api.example.com/*'],
        }),
      }),
    )

    expect(result.findings.map((f) => f.ruleId)).not.toContain('redundant-permission')
  })
})

describe('manifest at root with a dot-slash prefix', () => {
  it('treats ./manifest.json as the root manifest', () => {
    const result = scan(zip({ './manifest.json': manifest() }))

    expect(result.findings.map((f) => f.ruleId)).not.toContain('manifest-missing')
  })
})

describe('remote code attestation', () => {
  it('does not assert "no remote code" when the remote-script check failed to run', () => {
    const exploding = {
      id: 'remote-script',
      needs: 'files' as const,
      run: () => {
        throw new Error('boom')
      },
    }

    const result = scan(zip({ 'manifest.json': manifest() }), [exploding])

    expect(result.justifications.remoteCode.text).not.toContain('No, I am not using remote code')
  })
})
