export const renderExcerpt = (
  excerpt: string,
  matchStart: number,
  matchLength: number,
): DocumentFragment => {
  const fragment = document.createDocumentFragment()

  const start = Math.max(0, Math.min(matchStart, excerpt.length))
  const end = Math.max(start, Math.min(start + matchLength, excerpt.length))

  fragment.appendChild(document.createTextNode(excerpt.slice(0, start)))

  const mark = document.createElement('mark')
  mark.appendChild(document.createTextNode(excerpt.slice(start, end)))
  fragment.appendChild(mark)

  fragment.appendChild(document.createTextNode(excerpt.slice(end)))

  return fragment
}
