/**
 * Official Vector SVG Token Icons for Sivan MiniPay
 * Clean, high-resolution, pixel-crisp SVGs replacing emojis for USDT, USDC, cUSD, cNGN, and CELO.
 */

export function getUsdtSvg(size = 14): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: -2px; display: inline-block; flex-shrink: 0;">
    <circle cx="16" cy="16" r="16" fill="#26A17B"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M17.92 17.38c-.11.01-.68.04-1.92.04-1.04 0-1.74-.03-1.92-.04-4.28-.18-7.48-1.1-7.48-2.21 0-1.12 3.2-2.04 7.48-2.22v3.49c.18.01.88.04 1.92.04 1.24 0 1.81-.03 1.92-.04v-3.49c4.27.18 7.47 1.1 7.47 2.22 0 1.11-3.2 2.03-7.47 2.21zm0-4.99V9.9h5.54V6.5H8.54V9.9h5.54v2.5C9.37 12.6 6 13.86 6 15.34c0 1.48 3.37 2.74 8.08 2.95v7.21h3.84v-7.21c4.7-.21 8.08-1.47 8.08-2.95 0-1.48-3.38-2.74-8.08-2.95z" fill="#FFFFFF"/>
  </svg>`;
}

export function getUsdcSvg(size = 14): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: -2px; display: inline-block; flex-shrink: 0;">
    <circle cx="16" cy="16" r="16" fill="#2775CA"/>
    <path d="M18.8 8.8c3.2 1.4 5.2 4.4 5.2 8s-2 6.6-5.2 8l-1-1.8c2.4-1.1 3.9-3.4 3.9-6.2s-1.5-5.1-3.9-6.2l1-1.8zM13.2 8.8l1 1.8c-2.4 1.1-3.9 3.4-3.9 6.2s1.5 5.1 3.9 6.2l-1 1.8c-3.2-1.4-5.2-4.4-5.2-8s2-6.6 5.2-8z" fill="#FFFFFF" opacity="0.75"/>
    <path d="M16.9 11.2v-1.8h-1.8v1.8c-2 .25-3.1 1.35-3.1 2.9 0 1.8 1.45 2.5 3.5 2.8 1.6.25 2 .6 2 1.25 0 .75-.65 1.25-1.8 1.25-1.2 0-1.95-.5-2.1-1.45H12c.15 1.6 1.25 2.7 3.1 2.95v2h1.8v-2c2.1-.25 3.25-1.45 3.25-3 0-1.8-1.35-2.55-3.55-2.85-1.55-.25-1.95-.6-1.95-1.2 0-.65.6-1.15 1.65-1.15 1.1 0 1.75.45 1.9 1.25h1.6c-.15-1.45-1.05-2.5-2.9-2.75z" fill="#FFFFFF"/>
  </svg>`;
}

export function getCusdSvg(size = 14): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: -2px; display: inline-block; flex-shrink: 0;">
    <circle cx="16" cy="16" r="16" fill="#10B981"/>
    <circle cx="11" cy="12" r="4.2" stroke="#FFFFFF" stroke-width="1.6" fill="none" opacity="0.6"/>
    <circle cx="21" cy="20" r="4.2" stroke="#FFFFFF" stroke-width="1.6" fill="none" opacity="0.6"/>
    <path d="M16.8 11.2v-1.8h-1.6v1.8c-1.8.2-2.8 1.2-2.8 2.6 0 1.6 1.3 2.2 3.1 2.5 1.4.2 1.8.5 1.8 1.1 0 .7-.6 1.1-1.6 1.1-1.1 0-1.7-.4-1.9-1.3H12.2c.15 1.4 1.1 2.4 2.8 2.6v1.8h1.6v-1.8c1.9-.2 2.9-1.3 2.9-2.7 0-1.6-1.2-2.3-3.2-2.5-1.4-.2-1.7-.5-1.7-1.1 0-.6.5-1 1.5-1 1 0 1.6.4 1.7 1.1h1.6c-.1-1.3-.9-2.2-2.6-2.5z" fill="#FFFFFF"/>
  </svg>`;
}

export function getCngnSvg(size = 14): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: -2px; display: inline-block; flex-shrink: 0;">
    <circle cx="16" cy="16" r="16" fill="#008751"/>
    <path d="M10 8.5h2.4l7.2 11.4V8.5H22v15h-2.4l-7.2-11.4v11.4H10v-15z" fill="#FFFFFF"/>
    <path d="M8.5 13.2h15v1.8h-15v-1.8zm0 3.8h15v1.8h-15v-1.8z" fill="#FFFFFF"/>
  </svg>`;
}

export function getCeloSvg(size = 14): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: -2px; display: inline-block; flex-shrink: 0;">
    <circle cx="16" cy="16" r="16" fill="#FCFF52"/>
    <circle cx="13" cy="13" r="5.5" stroke="#000000" stroke-width="2.2" fill="none"/>
    <circle cx="19" cy="19" r="5.5" stroke="#000000" stroke-width="2.2" fill="none"/>
  </svg>`;
}

export function getTokenIconSvg(symbol: string, size = 14): string {
  switch (symbol.toUpperCase()) {
    case 'USDT':
      return getUsdtSvg(size);
    case 'USDC':
      return getUsdcSvg(size);
    case 'CUSD':
      return getCusdSvg(size);
    case 'CNGN':
      return getCngnSvg(size);
    case 'CELO':
      return getCeloSvg(size);
    default:
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>`;
  }
}
