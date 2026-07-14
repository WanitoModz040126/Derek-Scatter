// Generates simple circular "medallion" placeholder icons so the game is
// playable immediately. Swap the files in public/assets/icons/ with your
// own 133 icons whenever you're ready — just keep matching filenames, or
// update server/symbols.json to point at your new filenames.
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'assets', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const defs = [
  { file: 'sym_01.svg', name: 'Stone Rune', ring: '#8A7256', fill: '#5B4A38', glyph: 'circle' },
  { file: 'sym_02.svg', name: 'Leaf Rune', ring: '#7FA65A', fill: '#3E5C2C', glyph: 'triangle' },
  { file: 'sym_03.svg', name: 'Wave Rune', ring: '#5C9DB0', fill: '#28495A', glyph: 'wave' },
  { file: 'sym_04.svg', name: 'Flame Rune', ring: '#C97A3D', fill: '#7A3A18', glyph: 'flame' },
  { file: 'sym_05.svg', name: 'Amber Sigil', ring: '#E4B454', fill: '#8A5A1E', glyph: 'diamond' },
  { file: 'sym_06.svg', name: 'Violet Sigil', ring: '#9C6FC2', fill: '#4B2C68', glyph: 'star' },
  { file: 'sym_07.svg', name: 'Azure Sigil', ring: '#4C86D6', fill: '#1F3B6B', glyph: 'crescent' },
  { file: 'sym_08.svg', name: 'Gold Emblem', ring: '#F5D889', fill: '#9A6B12', glyph: 'sunburst' },
  { file: 'sym_09.svg', name: 'Crimson Emblem', ring: '#E36B7A', fill: '#7A1E2C', glyph: 'skull' },
  { file: 'sym_scatter.svg', name: 'Guardian Medallion', ring: '#F5D889', fill: '#1A1A24', glyph: 'guardian' },
];

function glyphPath(glyph) {
  switch (glyph) {
    case 'circle':
      return '<circle cx="60" cy="60" r="20" fill="none" stroke="#EDE6D6" stroke-width="4"/>';
    case 'triangle':
      return '<polygon points="60,40 78,78 42,78" fill="#EDE6D6"/>';
    case 'wave':
      return '<path d="M35 65 Q47 45 60 65 T85 65" fill="none" stroke="#EDE6D6" stroke-width="5" stroke-linecap="round"/>';
    case 'flame':
      return '<path d="M60 38c10 14-6 16-2 30 3 10-8 16-16 10-10-8-6-24 2-32 4 6 2 10 6 6-2-6 4-10 10-14z" fill="#EDE6D6"/>';
    case 'diamond':
      return '<polygon points="60,36 82,60 60,84 38,60" fill="#EDE6D6"/>';
    case 'star':
      return '<polygon points="60,34 67,54 88,54 71,66 78,86 60,74 42,86 49,66 32,54 53,54" fill="#EDE6D6"/>';
    case 'crescent':
      return '<path d="M70 36a26 26 0 100 48 21 21 0 010-48z" fill="#EDE6D6"/>';
    case 'sunburst':
      return '<g stroke="#EDE6D6" stroke-width="4" stroke-linecap="round">' +
        Array.from({ length: 8 })
          .map((_, i) => {
            const a = (i * Math.PI) / 4;
            const x1 = 60 + Math.cos(a) * 14;
            const y1 = 60 + Math.sin(a) * 14;
            const x2 = 60 + Math.cos(a) * 26;
            const y2 = 60 + Math.sin(a) * 26;
            return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
          })
          .join('') +
        '</g><circle cx="60" cy="60" r="10" fill="#EDE6D6"/>';
    case 'skull':
      return '<circle cx="60" cy="55" r="18" fill="#EDE6D6"/><rect x="50" y="68" width="20" height="12" rx="3" fill="#EDE6D6"/><circle cx="53" cy="53" r="4" fill="#7A1E2C"/><circle cx="67" cy="53" r="4" fill="#7A1E2C"/>';
    case 'guardian':
      return '<polygon points="60,32 84,46 84,74 60,88 36,74 36,46" fill="none" stroke="#F5D889" stroke-width="4"/><circle cx="60" cy="60" r="10" fill="#F5D889"/>';
    default:
      return '';
  }
}

for (const d of defs) {
  const svg = `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="${d.fill}" stop-opacity="1"/>
      <stop offset="100%" stop-color="#0A0C12" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <circle cx="60" cy="60" r="52" fill="url(#bg)"/>
  <circle cx="60" cy="60" r="52" fill="none" stroke="${d.ring}" stroke-width="4"/>
  <circle cx="60" cy="60" r="46" fill="none" stroke="${d.ring}" stroke-width="1.5" stroke-opacity="0.6"/>
  ${glyphPath(d.glyph)}
</svg>`;
  fs.writeFileSync(path.join(OUT, d.file), svg);
}

console.log(`Generated ${defs.length} placeholder icons in ${OUT}`);
