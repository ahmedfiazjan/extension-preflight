export type RejectionCode =
  | 'not-an-archive'
  | 'empty-archive'
  | 'unsafe-path'
  | 'too-many-entries'
  | 'too-large'
  | 'suspicious-compression'
  | 'unreadable-entry'

export type Rejection = { code: RejectionCode; message: string }

export type ArchiveEntry = {
  name: string
  compressedSize: number
  originalSize: number
}

export const MAX_ENTRIES = 5000
export const MAX_TOTAL_UNCOMPRESSED = 200 * 1024 * 1024
export const MAX_COMPRESSION_RATIO = 200
export const RATIO_CHECK_FLOOR = 4 * 1024 * 1024

const hasUnsafePath = (name: string) =>
  name.startsWith('/') ||
  name.startsWith('\\') ||
  /^[a-zA-Z]:/.test(name) ||
  name.split(/[/\\]/).includes('..')

export const checkArchive = (entries: ArchiveEntry[]): Rejection | null => {
  if (entries.length === 0) {
    return { code: 'empty-archive', message: 'This ZIP is empty. There are no files inside it to check.' }
  }

  if (entries.length > MAX_ENTRIES) {
    return {
      code: 'too-many-entries',
      message: `This ZIP lists ${entries.length} files, well past the ${MAX_ENTRIES} this tool will open. A real extension package holds a few dozen. Check you zipped the right folder.`,
    }
  }

  const unsafe = entries.find((entry) => hasUnsafePath(entry.name))
  if (unsafe) {
    return {
      code: 'unsafe-path',
      message: `One file in this ZIP has an unsafe path: ${unsafe.name}. Extension packages only use plain relative paths, so this was not built by a normal packaging step.`,
    }
  }

  const total = entries.reduce((sum, entry) => sum + entry.originalSize, 0)
  if (total > MAX_TOTAL_UNCOMPRESSED) {
    return {
      code: 'too-large',
      message: `This ZIP expands to about ${Math.round(total / 1024 / 1024)}MB, past the ${MAX_TOTAL_UNCOMPRESSED / 1024 / 1024}MB this tool will open. Extension packages are normally under a few megabytes.`,
    }
  }

  const bomb = entries.find((entry) => {
    if (entry.originalSize < RATIO_CHECK_FLOOR) return false
    if (entry.compressedSize === 0) return true
    return entry.originalSize / entry.compressedSize > MAX_COMPRESSION_RATIO
  })
  if (bomb) {
    return {
      code: 'suspicious-compression',
      message: `The file ${bomb.name} expands more than ${MAX_COMPRESSION_RATIO} times over. That pattern belongs to a decompression bomb, not to extension code, so the scan stopped before opening it.`,
    }
  }

  return null
}
