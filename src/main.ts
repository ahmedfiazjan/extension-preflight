import './style.css'
import { renderResult } from './ui/render'
import { track } from './analytics'
import type { WorkerResponse } from './worker'
import type { ScanResult } from './scan/types'

const SCAN_TIMEOUT_MS = 15000

const dropZone = document.querySelector<HTMLElement>('#drop')
const fileInput = document.querySelector<HTMLInputElement>('#file')
const output = document.querySelector<HTMLElement>('#output')

if (!dropZone || !fileInput || !output) throw new Error('Page markup is missing required elements')

const show = (node: HTMLElement) => {
  output.replaceChildren(node)
}

const message = (title: string, detail: string) => {
  const section = document.createElement('section')
  section.className = 'input-error'
  const heading = document.createElement('h2')
  heading.textContent = title
  const body = document.createElement('p')
  body.textContent = detail
  section.append(heading, body)
  show(section)
}

const runScan = (bytes: ArrayBuffer) =>
  new Promise<ScanResult>((resolve, reject) => {
    let worker: Worker

    try {
      worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    } catch {
      reject(new Error('This browser could not start the scanner. Try a recent desktop browser.'))
      return
    }

    const timer = setTimeout(() => {
      worker.terminate()
      reject(new Error('The scan ran too long and was stopped. That usually means the ZIP is malformed.'))
    }, SCAN_TIMEOUT_MS)

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      clearTimeout(timer)
      worker.terminate()
      if (event.data.ok) resolve(event.data.result)
      else reject(new Error(event.data.message))
    }

    worker.onerror = () => {
      clearTimeout(timer)
      worker.terminate()
      reject(new Error('The scanner stopped before it finished.'))
    }

    worker.postMessage(bytes, [bytes])
  })

let latestRequest = 0

const handleFile = async (file: File) => {
  const request = latestRequest + 1
  latestRequest = request

  const started = performance.now()
  track({ name: 'scan_started' })
  message('Scanning your package', `Reading ${file.name}. This takes about a second.`)

  try {
    const result = await runScan(await file.arrayBuffer())
    if (request !== latestRequest) return

    if (result.status === 'rejected') {
      track({ name: 'scan_failed', reason: result.rejection?.code ?? 'unknown' })
    } else {
      for (const ruleId of result.erroredRules) track({ name: 'rule_errored', ruleId })
      track({
        name: 'scan_completed',
        high: result.findings.filter((f) => f.severity === 'high').length,
        review: result.findings.filter((f) => f.severity === 'review').length,
        erroredRules: result.erroredRules.length,
      })
    }

    show(
      renderResult(
        result,
        { fileName: file.name, fileCount: result.fileCount, elapsedMs: performance.now() - started },
        () => fileInput.click(),
      ),
    )
  } catch (error) {
    if (request !== latestRequest) return
    track({ name: 'scan_failed', reason: 'scan-aborted' })
    message(
      'The scan did not finish',
      error instanceof Error ? error.message : 'Something stopped the scan before it could report.',
    )
  }
}

const accept = (files: FileList | null) => {
  const file = files?.[0]
  fileInput.value = ''
  if (file) void handleFile(file)
}

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault()
  dropZone.classList.add('over')
})

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'))

dropZone.addEventListener('drop', (event) => {
  event.preventDefault()
  dropZone.classList.remove('over')
  accept(event.dataTransfer?.files ?? null)
})

dropZone.addEventListener('click', () => fileInput.click())

dropZone.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  fileInput.click()
})
fileInput.addEventListener('change', () => accept(fileInput.files))
