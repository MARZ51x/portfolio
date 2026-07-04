// Build web image assets from resources/profile.jpg.
// Run with: node scripts/build-images.mjs
// Outputs to public/img/ and public/ (favicon, icons, og image).
//
// This does NOT generate AI imagery — it processes the real headshot and
// composes share/icon assets with sharp. Re-run any time the source photo changes.

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'resources', 'profile.jpg');
const IMG = path.join(ROOT, 'public', 'img');
const PUB = path.join(ROOT, 'public');

// --- palette (kept in sync with styles.css) ---
const PAPER = '#f3efe6';
const INK = '#16140f';
const NAVY = '#1c2b4a';

await mkdir(IMG, { recursive: true });

// 1. Optimized full-colour portrait (square, web-sized) + a smaller variant,
//    each in WebP (preferred) and JPEG (fallback).
await sharp(SRC).resize(1000, 1000, { fit: 'cover', position: 'top' })
  .jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(IMG, 'portrait.jpg'));
await sharp(SRC).resize(560, 560, { fit: 'cover', position: 'top' })
  .jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(IMG, 'portrait-sm.jpg'));
await sharp(SRC).resize(1000, 1000, { fit: 'cover', position: 'top' })
  .webp({ quality: 80 }).toFile(path.join(IMG, 'portrait.webp'));
await sharp(SRC).resize(560, 560, { fit: 'cover', position: 'top' })
  .webp({ quality: 78 }).toFile(path.join(IMG, 'portrait-sm.webp'));
console.log('✓ portrait.{jpg,webp}, portrait-sm.{jpg,webp}');

// 2. Editorial warm-monochrome treatment for the About section.
await sharp(SRC)
  .resize(900, 900, { fit: 'cover', position: 'top' })
  .grayscale()
  .linear(1.08, -10)          // gentle contrast lift
  .tint('#e7dccb')            // warm paper-toned duotone
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile(path.join(IMG, 'portrait-mono.jpg'));
await sharp(SRC)
  .resize(900, 900, { fit: 'cover', position: 'top' })
  .grayscale()
  .linear(1.08, -10)
  .tint('#e7dccb')
  .webp({ quality: 78 })
  .toFile(path.join(IMG, 'portrait-mono.webp'));
console.log('✓ portrait-mono.{jpg,webp}');

// 3. Monogram favicon (SVG) — "AB" on navy.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${NAVY}"/>
  <text x="32" y="44" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="34" font-weight="600" fill="${PAPER}" letter-spacing="-1">AB</text>
</svg>`;
await writeFile(path.join(PUB, 'favicon.svg'), favicon, 'utf8');
console.log('✓ favicon.svg');

// 4. apple-touch-icon (180x180 PNG) from the monogram.
await sharp(Buffer.from(favicon.replace('viewBox="0 0 64 64"', 'width="180" height="180" viewBox="0 0 64 64"')))
  .png().toFile(path.join(PUB, 'apple-touch-icon.png'));
console.log('✓ apple-touch-icon.png');

// 5. Social share card (1200x630) — composed: cream bg, name + role, rounded portrait.
const W = 1200, H = 630, P = 460; // portrait box size
const card = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <rect x="0" y="0" width="10" height="${H}" fill="${NAVY}"/>
  <text x="80" y="232" font-family="Georgia, serif" font-size="34" letter-spacing="6" fill="${NAVY}">PORTFOLIO</text>
  <text x="76" y="318" font-family="Georgia, serif" font-size="54" font-weight="600" fill="${INK}">Acamar L. Baltazar</text>
  <text x="80" y="380" font-family="Georgia, serif" font-size="32" fill="#6e685c">AI/ML &amp; Automation Engineer</text>
  <text x="80" y="540" font-family="Arial, sans-serif" font-size="24" fill="#6e685c">acamar.baltazar@gmail.com</text>
</svg>`;
// rounded-rect mask for the portrait
const mask = `<svg xmlns="http://www.w3.org/2000/svg" width="${P}" height="${P}"><rect width="${P}" height="${P}" rx="28" fill="#fff"/></svg>`;
const portraitRounded = await sharp(SRC)
  .resize(P, P, { fit: 'cover', position: 'top' })
  .composite([{ input: Buffer.from(mask), blend: 'dest-in' }])
  .png().toBuffer();
await sharp(Buffer.from(card))
  .composite([{ input: portraitRounded, top: Math.round((H - P) / 2), left: W - P - 80 }])
  .png().toFile(path.join(PUB, 'og-image.png'));
console.log('✓ og-image.png');

// 6. Company / institution monogram logos (generic initial badges).
// No official brand marks are bundled — these are clean initial monograms in the
// site's identity system. Replace any file with an official SVG to use a real logo.
const LOGODIR = path.join(IMG, 'logos');
await mkdir(LOGODIR, { recursive: true });
const logos = [
  { file: 'accenture',  initials: 'A',  bg: '#5b3a8c' },  // muted plum
  { file: 'aws',        initials: 'AW', bg: '#1c2b4a' },  // navy (Advanced World Solutions Inc.)
  { file: 'academic',   initials: 'AA', bg: '#6e685c' },  // muted ink (Academic Assistant)
  { file: 'cit',        initials: 'CIT', bg: '#7a2e2e' }, // muted maroon (Cebu Institute of Technology)
  { file: 'philnits',   initials: 'FE', bg: '#2a5b66' },  // muted teal (PhilNITS FE)
  { file: 'anthropic',  initials: 'A',  bg: '#c8613f' },  // clay/coral (Anthropic — Claude certs)
];
for (const l of logos) {
  const fs = l.initials.length >= 3 ? 30 : l.initials.length === 2 ? 38 : 46;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="${l.initials} logo">
  <rect width="100" height="100" rx="24" fill="${l.bg}"/>
  <text x="50" y="50" dominant-baseline="central" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-weight="600"
        font-size="${fs}" letter-spacing="0.5" fill="${PAPER}">${l.initials}</text>
</svg>`;
  await writeFile(path.join(LOGODIR, `${l.file}.svg`), svg, 'utf8');
}
console.log(`✓ ${logos.length} monogram logos in img/logos/`);

console.log('\nAll image assets built into public/.');
