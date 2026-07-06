/**
 * Generates the iOS app icon and splash screens for RenoMargin.
 *
 * Design: three ascending "margin" bars sheltered by a roofline —
 * renovation + profit in one mark. Pure geometry, no font dependencies.
 *
 * Usage: node scripts/generate-ios-assets.js
 */
const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch {
  sharp = require(path.join(__dirname, '..', 'node_modules', 'next', 'node_modules', 'sharp'));
}

const ICON_DIR = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
const SPLASH_DIR = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');

// The mark, drawn on a 1024x1024 canvas.
function markSvg({ size, withWordmark }) {
  const s = size / 1024; // scale factor
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e3a5f"/>
    </linearGradient>
    <linearGradient id="bars" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#34d399"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>

  <!-- roofline -->
  <path d="M ${222 * s} ${430 * s} L ${512 * s} ${218 * s} L ${802 * s} ${430 * s}"
        fill="none" stroke="#f8fafc" stroke-width="${52 * s}"
        stroke-linecap="round" stroke-linejoin="round"/>

  <!-- ascending margin bars -->
  <rect x="${300 * s}" y="${610 * s}" width="${110 * s}" height="${196 * s}" rx="${24 * s}" fill="#475569"/>
  <rect x="${457 * s}" y="${530 * s}" width="${110 * s}" height="${276 * s}" rx="${24 * s}" fill="#64748b"/>
  <rect x="${614 * s}" y="${440 * s}" width="${110 * s}" height="${366 * s}" rx="${24 * s}" fill="url(#bars)"/>
  ${withWordmark ? `
  <text x="50%" y="${920 * s}" font-family="Arial, Helvetica, sans-serif"
        font-size="${86 * s}" font-weight="bold" fill="#f8fafc"
        text-anchor="middle" letter-spacing="${2 * s}">RenoMargin</text>` : ''}
</svg>`;
}

async function main() {
  // App icon: 1024x1024, no wordmark (iOS icons should be text-free)
  const icon = Buffer.from(markSvg({ size: 1024, withWordmark: false }));
  await sharp(icon).png().toFile(path.join(ICON_DIR, 'AppIcon-512@2x.png'));
  console.log('✓ AppIcon-512@2x.png (1024x1024)');

  // Splash: 2732x2732 with the mark centered at 40% scale + wordmark
  const splashSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
  <rect width="2732" height="2732" fill="#0f172a"/>
</svg>`);
  const markPng = await sharp(Buffer.from(markSvg({ size: 900, withWordmark: true })))
    .png()
    .toBuffer();
  const splash = await sharp(splashSvg)
    .composite([{ input: markPng, gravity: 'center' }])
    .png()
    .toBuffer();

  for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    fs.writeFileSync(path.join(SPLASH_DIR, name), splash);
    console.log(`✓ ${name} (2732x2732)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
