// Generates splash_logo.png at each Android screen density.
// Run once from project root: node scripts/generate-splash.js
// Requires: sharp (already in dependencies)
const sharp = require('sharp');
const path = require('path');

const DENSITIES = [
  { suffix: 'hdpi',    scale: 1.5 },
  { suffix: 'xhdpi',   scale: 2   },
  { suffix: 'xxhdpi',  scale: 3   },
  { suffix: 'xxxhdpi', scale: 4   },
];

// Canvas at mdpi (1x): 320×80dp — wide enough for "PERIPHERY" at 32dp + letterSpacing 6
const BASE_W = 320;
const BASE_H = 80;

async function generate() {
  for (const { suffix, scale } of DENSITIES) {
    const w = Math.round(BASE_W * scale);
    const h = Math.round(BASE_H * scale);
    const fontSize = Math.round(32 * scale);
    const letterSpacing = Math.round(6 * scale);

    // SVG text centered both axes; dominant-baseline="central" aligns the
    // optical midpoint of the glyphs to y="50%" rather than the baseline
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <text
        x="50%"
        y="50%"
        font-family="sans-serif"
        font-size="${fontSize}"
        font-weight="700"
        letter-spacing="${letterSpacing}"
        fill="#D97757"
        text-anchor="middle"
        dominant-baseline="central"
      >PERIPHERY</text>
    </svg>`;

    const out = path.join(
      __dirname,
      `../android/app/src/main/res/drawable-${suffix}/splash_logo.png`
    );

    await sharp(Buffer.from(svg)).png().toFile(out);
    console.log(`  ✓ ${suffix}: ${w}×${h}px  →  ${out.split('res/')[1]}`);
  }
}

generate().catch((err) => { console.error(err); process.exit(1); });
