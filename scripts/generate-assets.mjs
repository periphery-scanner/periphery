#!/usr/bin/env node
/**
 * Periphery — Brand Asset Generator
 *
 * Generates all icon and splash PNGs from pure math + embedded SVG.
 * Run once before expo prebuild whenever brand assets change.
 *
 *   npm run generate-assets
 *
 * Requires:  npm install --save-dev sharp
 *
 * Outputs:
 *   assets/icon.png              1024×1024  gradient (light/warm center → dark indigo edge)
 *   assets/adaptive-icon-bg.png  1024×1024  same gradient (adaptive background layer)
 *   assets/adaptive-icon-fg.png  1024×1024  fully transparent (no foreground element)
 *   assets/splash-text.png       1200×360   "Periphery" in deep indigo, transparent background
 */

import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dir, '..', 'assets');
mkdirSync(ASSETS, { recursive: true });

const SIZE = 1024;

// ── Brand palette ──────────────────────────────────────────────────────────
//   Gradient runs center → edge: warm coral-cream to saturated dark indigo.
//   Visual intent: the inside of a paper lantern — warm, diffuse, receding.
//
//   Five principal stops (user-specified), plus four intermediate stops
//   placed between each pair to prevent banding across the hue transitions.

const STOPS = [
  // t     R    G    B      hex        description
  [0.00, [237, 212, 176]], // #EDD4B0  center: warm coral-cream
  [0.12, [192, 187, 157]], // ~#C0BB9D transitional warm-muted
  [0.25, [143, 160, 136]], // #8FA088  desaturated muted sage
  [0.38, [110, 128, 126]], // ~#6E807E transitional sage → slate
  [0.50, [ 79,  98, 117]], // #4F6275  softer warm slate
  [0.62, [ 63,  79, 105]], // ~#3F4F69 transitional slate → deep indigo
  [0.75, [ 45,  58,  92]], // #2D3A5C  transitional indigo-slate
  [0.88, [ 35,  44,  76]], // ~#232C4C transitional deep indigo
  [1.00, [ 26,  31,  61]], // #1A1F3D  edge: saturated warm-leaning indigo
];

// ── Maths ──────────────────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }

// Cubic smoothstep eliminates visible discontinuities at stop boundaries.
function smoothstep(t) { return t * t * (3 - 2 * t); }

// Map normalized radial distance [0, 1] → interpolated RGB triple.
// t = 0 at center, t = 1 at the corner of the square (diagonal = √2/2 × SIZE).
function gradientRGB(dist) {
  const d = Math.min(1, Math.max(0, dist));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0, c0] = STOPS[i];
    const [t1, c1] = STOPS[i + 1];
    if (d >= t0 && d <= t1) {
      const s = smoothstep((d - t0) / (t1 - t0));
      return [
        Math.round(lerp(c0[0], c1[0], s)),
        Math.round(lerp(c0[1], c1[1], s)),
        Math.round(lerp(c0[2], c1[2], s)),
      ];
    }
  }
  return [...STOPS[STOPS.length - 1][1]];
}

// ── Pixel buffer generators ────────────────────────────────────────────────

const diagHalf = (Math.SQRT2 / 2) * SIZE;

function makeGradientBuffer() {
  const buf = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i   = (y * SIZE + x) * 4;
      const dist = Math.sqrt((x - SIZE / 2) ** 2 + (y - SIZE / 2) ** 2) / diagHalf;
      const [r, g, b] = gradientRGB(dist);
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
    }
  }
  return buf;
}

// ── Main ───────────────────────────────────────────────────────────────────

const RAW = { raw: { width: SIZE, height: SIZE, channels: 4 } };
const PNG = { compressionLevel: 9 };

async function main() {
  console.log('Generating Periphery brand assets…\n');

  // Full icon and adaptive background are the same gradient image.
  process.stdout.write('  assets/icon.png                ');
  const gradBuf = makeGradientBuffer();
  await sharp(gradBuf, RAW).png(PNG).toFile(join(ASSETS, 'icon.png'));
  console.log('✓');

  process.stdout.write('  assets/adaptive-icon-bg.png    ');
  await sharp(gradBuf, RAW).png(PNG).toFile(join(ASSETS, 'adaptive-icon-bg.png'));
  console.log('✓');

  // Adaptive foreground: fully transparent. No pinpoint in this version.
  // Kept as a file because app.json references it; the system composites nothing.
  process.stdout.write('  assets/adaptive-icon-fg.png    ');
  await sharp(Buffer.alloc(SIZE * SIZE * 4, 0), RAW).png(PNG)
    .toFile(join(ASSETS, 'adaptive-icon-fg.png'));
  console.log('✓');

  // Splash text: "Periphery" in deep indigo on transparent background.
  // app.json sets splash.backgroundColor = #EDD4B0 so the coral-cream fills
  // the screen; the indigo text composites over it, mirroring the icon's center color.
  process.stdout.write('  assets/splash-text.png         ');
  const splashSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="360">` +
    `<text x="600" y="265" text-anchor="middle" ` +
    `font-family="Helvetica Neue,Helvetica,Arial,sans-serif" ` +
    `font-weight="200" font-size="160" letter-spacing="10" ` +
    `fill="#1A1F3D">Periphery</text>` +
    `</svg>`
  );
  await sharp(splashSvg).png().toFile(join(ASSETS, 'splash-text.png'));
  console.log('✓');

  console.log('\nAll assets written to assets/');
  console.log('Next: npx expo prebuild --clean --platform android\n');
}

main().catch(err => {
  console.error('\n✗', err.message);
  if (/svg|librsvg|vips/i.test(err.message)) {
    console.error(
      '\nSVG text rendering failed. Fallback: in app.json set\n' +
      'splash.image to "./assets/icon.png" and resizeMode to "contain".\n'
    );
  }
  process.exit(1);
});
