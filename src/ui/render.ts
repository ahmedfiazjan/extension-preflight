import type { Finding, ScanResult } from '../scan/types'
import type { Justification } from '../scan/justifications'
import { renderExcerpt } from './render-excerpt'
import { icon, ALERT, COPY, FILE, INFO, RESCAN, TICK } from './icons'
import { track } from '../analytics'

export type ReportMeta = { fileName: string; fileCount: number; elapsedMs: number }

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

const copyButton = (label: string, getText: () => string): HTMLButtonElement => {
  const button = el('button', 'copy')
  button.type = 'button'
  button.title = label
  button.setAttribute('aria-label', label)
  button.appendChild(icon(COPY, 17))

  button.addEventListener('click', () => {
    void navigator.clipboard.writeText(getText()).then(() => {
      track({ name: 'justifications_copied' })
      button.replaceChildren(icon(TICK, 17))
      button.classList.add('done')
      setTimeout(() => {
        button.replaceChildren(icon(COPY, 17))
        button.classList.remove('done')
      }, 1600)
    })
  })

  return button
}

const reportHead = (meta: ReportMeta, onRescan: () => void): HTMLElement => {
  const head = el('div', 'report-head')

  const left = el('div', 'report-file')
  left.appendChild(icon(FILE, 18))
  left.appendChild(el('span', 'report-name', meta.fileName))
  left.appendChild(
    el('span', 'report-meta', `${meta.fileCount} files, ${Math.max(1, Math.round(meta.elapsedMs))} ms`),
  )
  head.appendChild(left)

  const again = el('button', 'ghost')
  again.type = 'button'
  again.appendChild(icon(RESCAN, 15))
  again.appendChild(document.createTextNode('Scan another'))
  again.addEventListener('click', onRescan)
  head.appendChild(again)

  return head
}

const pill = (className: string, paths: string[], text: string): HTMLElement => {
  const node = el('span', `pill ${className}`)
  node.appendChild(icon(paths, 15))
  node.appendChild(document.createTextNode(text))
  return node
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many)

const evidenceBlock = (finding: Finding): HTMLElement | null => {
  if (finding.evidence === null) return null

  const wrapper = el('div', 'evidence')
  wrapper.appendChild(
    el('div', 'evidence-file', `${finding.evidence.file} at offset ${finding.evidence.offset}`),
  )

  const code = el('pre', 'excerpt')
  code.appendChild(
    renderExcerpt(
      finding.evidence.excerpt,
      finding.evidence.matchStart,
      finding.evidence.matchLength,
    ),
  )
  wrapper.appendChild(code)

  return wrapper
}

const findingCard = (finding: Finding): HTMLElement => {
  const card = el('article', `finding ${finding.severity}`)

  const header = el('header')
  header.appendChild(el('span', 'badge', finding.severity === 'high' ? 'High risk' : 'Review'))
  header.appendChild(el('h3', undefined, finding.title))
  card.appendChild(header)

  const evidence = evidenceBlock(finding)
  if (evidence) card.appendChild(evidence)

  card.appendChild(el('p', 'why', finding.why))

  const fix = el('p', 'fix')
  fix.appendChild(el('b', undefined, 'Fix: '))
  fix.appendChild(document.createTextNode(finding.fix))
  card.appendChild(fix)

  const footer = el('footer')
  const link = el('a', undefined, 'Read the Chrome policy')
  link.href = finding.reference
  link.rel = 'noopener noreferrer'
  link.target = '_blank'
  footer.appendChild(link)
  footer.appendChild(el('span', 'confidence', finding.basis))
  card.appendChild(footer)

  return card
}

const justificationRow = (item: Justification): HTMLElement => {
  const row = el('div', 'just-row')

  const field = el('div', 'just-field')
  field.appendChild(el('div', 'just-label', item.permission))
  field.appendChild(el('div', 'just-text', item.text))
  row.appendChild(field)

  row.appendChild(copyButton(`Copy the ${item.permission} justification`, () => item.text))
  return row
}

const asPlainText = (result: ScanResult): string =>
  [
    ...result.justifications.permissions.map((item) => `${item.permission}: ${item.text}`),
    `Remote code: ${result.justifications.remoteCode.text}`,
  ].join('\n\n')

const justificationsSection = (result: ScanResult): HTMLElement => {
  const section = el('section', 'justifications')

  const head = el('div', 'just-head')
  const intro = el('div')
  intro.appendChild(el('h2', undefined, 'Permission justifications'))
  intro.appendChild(
    el(
      'p',
      undefined,
      'The Developer Dashboard makes you justify every permission before you can submit. These drafts come from your own manifest.',
    ),
  )
  head.appendChild(intro)

  const all = el('button', 'copy ghost')
  all.type = 'button'
  all.style.width = 'auto'
  all.style.padding = '0 14px'
  all.appendChild(icon(COPY, 15))
  all.appendChild(document.createTextNode('Copy all'))
  all.addEventListener('click', () => {
    void navigator.clipboard.writeText(asPlainText(result)).then(() => {
      track({ name: 'justifications_copied' })
      all.replaceChildren(icon(TICK, 15), document.createTextNode('Copied'))
      all.classList.add('done')
      setTimeout(() => {
        all.replaceChildren(icon(COPY, 15), document.createTextNode('Copy all'))
        all.classList.remove('done')
      }, 1600)
    })
  })
  head.appendChild(all)
  section.appendChild(head)

  const caveat = el('div', 'caveat')
  caveat.appendChild(icon(INFO, 15))
  caveat.appendChild(
    el(
      'p',
      undefined,
      'Starting points, not approved wording. Google publishes no template and no confirmed examples, so edit each one to say what your extension actually does.',
    ),
  )
  section.appendChild(caveat)

  for (const item of result.justifications.permissions) {
    section.appendChild(justificationRow(item))
  }

  const remote = el('div', 'just-row remote')
  const field = el('div', 'just-field')
  field.appendChild(el('div', 'just-label', 'Are you using remote code?'))
  field.appendChild(el('div', 'just-text', result.justifications.remoteCode.text))
  remote.appendChild(field)
  remote.appendChild(
    copyButton('Copy the remote code answer', () => result.justifications.remoteCode.text),
  )
  section.appendChild(remote)

  return section
}

const cleanBlock = (checksPassed: number): HTMLElement => {
  const clean = el('div', 'clean')

  const badge = el('div', 'clean-mark')
  badge.appendChild(icon(TICK, 19))
  clean.appendChild(badge)

  const body = el('div')
  body.appendChild(
    el('strong', undefined, `Nothing to fix. All ${checksPassed} checks came back clean.`),
  )
  body.appendChild(
    el(
      'p',
      undefined,
      'That is not a promise of approval. This tool reads your package, so it cannot see your store listing, your privacy policy, or whether your extension works.',
    ),
  )
  clean.appendChild(body)

  return clean
}

export const renderResult = (
  result: ScanResult,
  meta: ReportMeta,
  onRescan: () => void,
): HTMLElement => {
  const root = el('div', 'report')

  if (result.status === 'rejected') {
    const error = el('section', 'input-error')
    error.appendChild(el('h2', undefined, 'That file could not be read'))
    error.appendChild(
      el('p', undefined, result.rejection?.message ?? 'Something about this file stopped the scan.'),
    )
    error.appendChild(
      el('p', 'note', 'Nothing was wrong with your extension. The problem is the file itself.'),
    )
    root.appendChild(error)
    return root
  }

  root.appendChild(reportHead(meta, onRescan))

  const high = result.findings.filter((f) => f.severity === 'high')
  const review = result.findings.filter((f) => f.severity === 'review')

  const summary = el('div', 'summary')
  if (high.length > 0) {
    summary.appendChild(pill('high', ALERT, `${high.length} high risk`))
  }
  if (review.length > 0) {
    summary.appendChild(pill('review', INFO, `${review.length} to review`))
  }
  summary.appendChild(
    pill(
      'pass',
      TICK,
      `${result.checksPassed} ${plural(result.checksPassed, 'check', 'checks')} passed`,
    ),
  )
  root.appendChild(summary)

  if (result.erroredRules.length > 0) {
    root.appendChild(
      el(
        'p',
        'incomplete',
        `${result.erroredRules.length} ${plural(result.erroredRules.length, 'check', 'checks')} could not run: ${result.erroredRules.join(', ')}. Treat this report as incomplete, not as a pass.`,
      ),
    )
  }

  if (result.findings.length === 0) {
    root.appendChild(cleanBlock(result.checksPassed))
  }

  for (const finding of [...high, ...review]) root.appendChild(findingCard(finding))

  root.appendChild(justificationsSection(result))

  if (result.findings.length > 0) {
    root.appendChild(
      el(
        'p',
        'disclaimer',
        'A clean scan is not a promise of approval. This tool reads your package, so it cannot see your store listing, your privacy policy, or whether your extension works.',
      ),
    )
  }

  return root
}
