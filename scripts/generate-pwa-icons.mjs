// scripts/generate-pwa-icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { resolve } from 'path';

const src = resolve('public/icons/source-icon.png');
const outDir = resolve('public/icons');

mkdirSync(outDir, { recursive: true });

async function makeIcon(size, filename) {
  const out = resolve(outDir, filename);
  await sharp(src)
    .resize(size, size, {
      fit: 'cover', // good for square app icons
    })
    .png()
    .toFile(out);

  console.log(` ✓ ${filename} (${size}x${size})`);
}

// For notification icon, we "contain" the image inside a square
// with transparent padding, so the shape isn't cropped.
async function makeNotificationIcon(size, filename) {
  const out = resolve(outDir, filename);
  await sharp(src)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(out);

  console.log(` ✓ ${filename} (${size}x${size}) [notification]`);
}

async function run() {
  console.log('Generating PWA icons from:', src);

  // Regular icons
  await makeIcon(192, 'manifest-icon-192.png');
  await makeIcon(512, 'manifest-icon-512.png');

  // Maskable icons
  await makeIcon(192, 'manifest-icon-192-maskable.png');
  await makeIcon(512, 'manifest-icon-512-maskable.png');

  // Notification icon (used in push notifications)
  await makeNotificationIcon(96, 'notification-icon2.png');

  console.log('All icons generated into public/icons/');
}

run().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
