const fs = require('fs');
const path = require('path');

// Simple SVG icon generator
function generateSVGIcon(size, text, color = '#2563eb') {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${color}" rx="${size * 0.1}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${text}</text>
</svg>`;

  return svg;
}

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

console.log('Generating PWA icons...');

// Generate all icon sizes
iconSizes.forEach(size => {
  const svg = generateSVGIcon(size, 'JC');
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  fs.writeFileSync(filepath, svg);
  console.log(`Generated ${filename}`);
});

// Generate special icons
const specialIcons = [
  { name: 'new-job-192', size: 192, text: '+', color: '#10b981' },
  { name: 'time-192', size: 192, text: '⏱', color: '#f59e0b' },
  { name: 'badge-72', size: 72, text: 'JC', color: '#dc2626' },
];

specialIcons.forEach(({ name, size, text, color }) => {
  const svg = generateSVGIcon(size, text, color);
  const filename = `${name}.svg`;
  const filepath = path.join(iconsDir, filename);
  fs.writeFileSync(filepath, svg);
  console.log(`Generated ${filename}`);
});

// Generate favicon
const faviconSVG = generateSVGIcon(32, 'JC');
fs.writeFileSync(path.join(iconsDir, 'favicon.svg'), faviconSVG);

// Generate PNG-like placeholder (SVG for simplicity)
const pngIcons = [16, 32];
pngIcons.forEach(size => {
  const svg = generateSVGIcon(size, size <= 32 ? 'J' : 'JC');
  const filename = `favicon-${size}x${size}.png`;
  const filepath = path.join(iconsDir, filename);
  // For real implementation, you'd convert SVG to PNG
  fs.writeFileSync(filepath.replace('.png', '.svg'), svg);
  console.log(`Generated ${filename} (SVG placeholder)`);
});

// Generate Apple touch icon
const appleTouchSVG = generateSVGIcon(180, 'JC', '#2563eb');
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), appleTouchSVG);

console.log('✅ PWA icons generated successfully!');
console.log('⚠️  Note: These are SVG placeholders. For production, convert to actual PNG files.');