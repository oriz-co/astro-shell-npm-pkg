// @chirag127/astro-shell — auth-gate unit tests.
import { afterEach, describe, expect, it } from 'vitest'
import {
  AUTH_COOKIE,
  AUTH_ORIGIN,
  authGateInit,
  readAuthCookie,
  signInUrl,
  signOutUrl,
} from '../auth-gate'

function setCookie(value: string) {
  // happy-dom honours document.cookie writes per spec.
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(value)}; path=/`
}

afterEach(() => {
  // clear cookie between tests
  document.cookie = `${AUTH_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
})

describe('auth-gate constants', () => {
  it('uses auth.oriz.in as the central origin', () => {
    expect(AUTH_ORIGIN).toBe('https://auth.oriz.in')
  })
  it('uses oriz_auth as the cookie name', () => {
    expect(AUTH_COOKIE).toBe('oriz_auth')
  })
})

describe('readAuthCookie', () => {
  it('returns null when no cookie is present', () => {
    expect(readAuthCookie()).toBeNull()
  })
  it('decodes a valid JSON cookie', () => {
    setCookie(JSON.stringify({ uid: 'u1', email: 'a@oriz.in', displayName: 'A' }))
    const u = readAuthCookie()
    expect(u?.email).toBe('a@oriz.in')
    expect(u?.displayName).toBe('A')
  })
  it('returns null when the cookie is expired', () => {
    setCookie(JSON.stringify({ uid: 'u1', exp: 1 }))
    expect(readAuthCookie()).toBeNull()
  })
  it('returns null when the cookie is unparseable', () => {
    setCookie('not-json')
    expect(readAuthCookie()).toBeNull()
  })
})

describe('signInUrl / signOutUrl', () => {
  it('builds a sign-in URL with an explicit return target', () => {
    expect(signInUrl('https://lore.oriz.in/x')).toBe(
      'https://auth.oriz.in/sign-in?return=https%3A%2F%2Flore.oriz.in%2Fx'
    )
  })
  it('builds a sign-out URL with an explicit return target', () => {
    expect(signOutUrl('https://lore.oriz.in/x')).toBe(
      'https://auth.oriz.in/sign-out?return=https%3A%2F%2Flore.oriz.in%2Fx'
    )
  })
})

describe('authGateInit', () => {
  it('returns a self-invoking IIFE string', () => {
    const s = authGateInit()
    expect(s).toMatch(/^\(function\(\)\{/)
    expect(s).toMatch(/\}\)\(\);$/)
  })
  it('embeds the central origin and cookie name', () => {
    const s = authGateInit()
    expect(s).toContain(AUTH_ORIGIN)
    expect(s).toContain(AUTH_COOKIE)
  })
})
