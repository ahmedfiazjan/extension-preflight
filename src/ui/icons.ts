const NS = 'http://www.w3.org/2000/svg'

export const icon = (paths: string[], size = 15): SVGSVGElement => {
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', '0 0 20 20')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.7')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')

  for (const d of paths) {
    const path = document.createElementNS(NS, 'path')
    path.setAttribute('d', d)
    svg.appendChild(path)
  }

  return svg
}

export const TICK = ['m4.5 10.5 3.5 3.5 7.5-8']
export const ALERT = ['M10 3.5 2.8 16h14.4L10 3.5Z', 'M10 8v3.2', 'M10 13.6h.01']
export const INFO = [
  'M17.2 10a7.2 7.2 0 1 1-14.4 0 7.2 7.2 0 0 1 14.4 0Z',
  'M10 6.6v4',
  'M10 13.4h.01',
]
export const COPY = ['M16.5 7h-8a1.5 1.5 0 0 0-1.5 1.5v8a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 16.5 7Z', 'M13 4.5H4.5a1 1 0 0 0-1 1V14']
export const RESCAN = ['M16.5 10a6.5 6.5 0 1 1-1.9-4.6', 'M16.5 3.5V7H13']
export const FILE = ['M5 2.5h6l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z', 'M11 2.5v4h4']
