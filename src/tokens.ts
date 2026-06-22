/*
 * @chirag127/astro-shell — tokens (TS const)
 * Parallel to tokens.css; lets JS/TS consumers read tokens without parsing CSS.
 */
export const tokens = {
  color: {
    brand: {
      vermilion: '#c1440e',
      mustard: '#c08a26',
      cobalt: '#1a3a8f',
      ledger: '#1f2937',
      pencil: '#6b7280',
    },
    neutral: {
      0: '#ffffff',
      50: '#fafaf7',
      100: '#f4f1ea',
      200: '#e7e3d8',
      300: '#cfc9bb',
      500: '#6b6b66',
      700: '#3a3a36',
      900: '#15140f',
      1000: '#000000',
    },
  },
  font: {
    sans: "'Inter Tight', system-ui, sans-serif",
    display: "'Fraunces', Georgia, serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  text: {
    '2xs': '10px',
    xs: '11px',
    sm: '13px',
    base: '15px',
    md: '17px',
    lg: '20px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '48px',
  },
  space: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px', 8: '32px', 12: '48px', 16: '64px' },
  motion: {
    dur: { fast: '120ms', base: '200ms', slow: '360ms' },
    ease: {
      out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      in: 'cubic-bezier(0.7, 0, 0.84, 0)',
      inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
    },
  },
  bp: { sm: '480px', md: '768px', lg: '1024px', xl: '1440px' },
} as const

export type Tokens = typeof tokens
