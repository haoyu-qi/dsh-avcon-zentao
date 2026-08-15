import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL('../src/client/AppFrame.module.css', import.meta.url)), 'utf8')

describe('AppFrame energy background styles', () => {
  it('keeps the animated layer non-interactive and theme-specific', () => {
    expect(css).toMatch(/\.stormLayer\s*\{[^}]*pointer-events:\s*none;/s)
    expect(css).toContain("content: url('/avcon-energy-ribbon-red.png?v=1')")
    expect(css).toMatch(/\.stormRibbonLower\s*\{[^}]*19s[^}]*infinite/s)
    expect(css).toMatch(/\.stormRibbonUpper\s*\{[^}]*27s[^}]*infinite/s)
  })

  it('stops both energy animations for reduced-motion users', () => {
    const reducedMotion = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reducedMotion).toMatch(/\.stormRibbon\s*\{[^}]*animation:\s*none;/s)
  })
})
