import { scan } from './scan'
import type { ScanResult } from './scan/types'

export type WorkerResponse =
  | { ok: true; result: ScanResult }
  | { ok: false; message: string }

self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  let response: WorkerResponse

  try {
    response = { ok: true, result: scan(new Uint8Array(event.data)) }
  } catch (error) {
    response = {
      ok: false,
      message: error instanceof Error ? error.message : 'The scan failed unexpectedly.',
    }
  }

  self.postMessage(response)
}
