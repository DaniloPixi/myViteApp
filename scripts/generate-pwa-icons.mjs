// scripts/generate-pwa-icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { resolve } from 'path';

const src = resolve('public/icons/source-icon.png');
const outDir = resolve('public/icons');

mkdirSync(outDir, { recursive: true });

// Simple helper: resize from source to exact size
async function makeIcon(size, filename) {
  const out = resolve(outDir, filename);
  await sharp(src)
    .resize(size, size, {
      fit: 'cover',
    })
    .png()
    .toFile(out);

  console.log(` ✓ ${filename} (${size}x${size})`);
}

async function run() {
  console.log('Generating PWA icons from:', src);

  // Regular icons
  await makeIcon(192, 'manifest-icon-192.png');
  await makeIcon(512, 'manifest-icon-512.png');

  // "Maskable" icons – here we just resize as well.
  // For perfect maskable icons you usually add extra padding,
  // but this kills the DevTools warnings and sizes are correct.
  await makeIcon(192, 'manifest-icon-192-maskable.png');
  await makeIcon(512, 'manifest-icon-512-maskable.png');

  console.log('All icons generated into public/icons/');
}

run().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
