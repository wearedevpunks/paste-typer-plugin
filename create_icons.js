const fs = require('fs');

// Create a simple SVG icon and convert to base64 PNG data
function createSVGIcon(size) {
  const fontSize = Math.floor(size * 0.5);
  return `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#4CAF50"/>
  <text x="50%" y="50%" font-family="Arial" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dy=".35em">PT</text>
</svg>`.trim();
}

// For now, just create SVG files that Chrome can use
function createIcon(size, filename) {
  const svg = createSVGIcon(size);
  fs.writeFileSync(filename, svg);
  console.log(`Created ${filename}`);
}

// Create icons as SVG (Chrome accepts SVG for extension icons)
createIcon(16, 'icon16.svg');
createIcon(48, 'icon48.svg');
createIcon(128, 'icon128.svg');

console.log('\nSVG icons created!');
console.log('Note: Chrome accepts SVG icons. Update manifest.json to use .svg extensions.');
console.log('\nAlternatively, you can:');
console.log('1. Open create_icons.html in your browser to generate PNG files');
console.log('2. Or use an online SVG to PNG converter');
