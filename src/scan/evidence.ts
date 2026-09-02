import type { Evidence } from './types'

const CONTEXT_CHARS = 120

export const makeEvidence = (
  file: string,
  text: string,
  offset: number,
  matchLength: number,
): Evidence => {
  const start = Math.max(0, offset - CONTEXT_CHARS)
  const end = Math.min(text.length, offset + matchLength + CONTEXT_CHARS)

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
