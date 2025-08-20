import { describe, it, expect } from 'vitest'
import i18n from '../i18n'

describe('i18n language switching and RTL side-effects', () => {
  it('sets dir=ltr for English and dir=rtl for Arabic, and persists language', async () => {
    await i18n.changeLanguage('en')
    expect(document.documentElement.dir).toBe('ltr')
    expect(document.documentElement.lang).toMatch(/^en/)

    await i18n.changeLanguage('ar')
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('ar')

    const stored = window.localStorage.getItem('i18nextLng')
    expect(stored?.startsWith('ar')).toBe(true)
  })
})
