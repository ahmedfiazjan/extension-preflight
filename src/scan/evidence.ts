import type { Evidence } from './types'

const CONTEXT_CHARS = 120

export const makeEvidence = (
  file: string,
  text: string,
  offset: number,
  matchLength: number,
): Evidence => {
  const windowStart = Math.max(0, offset - CONTEXT_CHARS)
  const windowEnd = Math.min(text.length, offset + matchLength + CONTEXT_CHARS)

  const firstBreak = text.indexOf('\n', windowStart)
  const lastBreak = text.lastIndexOf('\n', windowEnd)

  const start =
    windowStart > 0 && firstBreak !== -1 && firstBreak < offset ? firstBreak + 1 : windowStart
  const end =
    windowEnd < text.length && lastBreak > offset + matchLength ? lastBreak : windowEnd

  return {
    file,
    offset,
    excerpt: text.slice(start, end),
    matchStart: offset - start,
    matchLength,
  }
}

export const locate = (text: string, needle: string): number => {
  const index = text.indexOf(needle)
  return index === -1 ? 0 : index
}
