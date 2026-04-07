// scripts/generate-pwa-icons.mjs
import sharp from 'sharp';
import { access, mkdir } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { resolve } from 'path';

const src = resolve('public/icons/source-icon.png');
const preferredStatusBarSrc = resolve('public/icons/notification-statusbar-source.png');
const outDir = resolve('public/icons');

async function fileExists(filePath) {
  try {
    await access(filePath, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensureFile(filePath, label) {
  if (!(await fileExists(filePath))) {
    throw new Error(`${label} not found/readable at: ${filePath}`);
  }
}

async function makeIcon(size, filename) {
  const out = resolve(outDir, filename);
  await sharp(src)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(out);

  console.log(` ✓ ${filename} (${size}x${size})`);
}

// Rich notification icon (drawer)
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

/**
 * Build a status-bar-safe icon:
 * - transparent background
 * - white foreground only
 * - no opaque full-bleed square
 *
 * If dedicated source exists, use it.
 * Otherwise fallback to app icon and derive mask from luminance.
 */
async function makeStatusBarIcon(size, filename, statusBarSourcePath) {
  const out = resolve(outDir, filename);

  const base = sharp(statusBarSourcePath).resize(size, size, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });

  // Use existing alpha if meaningful; otherwise derive from brightness.
  const stats = await base.clone().ensureAlpha().stats();
  const alphaChannel = stats.channels[3];
  const hasUsefulAlpha = alphaChannel.min < 255;

  const alpha = hasUsefulAlpha
    ? await base.clone().ensureAlpha().extractChannel('alpha').toBuffer()
    : await base
        .clone()
        .grayscale()
        .threshold(140) // tune if needed
        .extractChannel(0)
        .toBuffer();

  // Compose white RGB + extracted alpha
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .joinChannel(alpha)
    .png()
    .toFile(out);

  console.log(` ✓ ${filename} (${size}x${size}) [status-bar]`);
}

async function run() {
  await mkdir(outDir, { recursive: true });

  await ensureFile(src, 'App source icon');

  const hasDedicatedStatusBarSrc = await fileExists(preferredStatusBarSrc);
  const statusBarSrcToUse = hasDedicatedStatusBarSrc ? preferredStatusBarSrc : src;

  if (hasDedicatedStatusBarSrc) {
    console.log('Using dedicated status-bar source:', preferredStatusBarSrc);
  } else {
    console.warn(
      '⚠ notification-statusbar-source.png not found; falling back to source-icon.png. ' +
        'For best Android status-bar results, add public/icons/notification-statusbar-source.png ' +
        '(transparent background + white glyph only).'
    );
  }

  console.log('Generating PWA icons...');

  // App/manifest icons
  await makeIcon(192, 'manifest-icon-192.png');
  await makeIcon(512, 'manifest-icon-512.png');

  // Maskable icons
  await makeIcon(192, 'manifest-icon-192-maskable.png');
  await makeIcon(512, 'manifest-icon-512-maskable.png');

  // Drawer notification icon
  await makeNotificationIcon(96, 'notification-icon2.png');

  // Status-bar-safe variants
  await makeStatusBarIcon(96, 'notification-statusbar.png', statusBarSrcToUse);
  await makeStatusBarIcon(72, 'notification-statusbar-72.png', statusBarSrcToUse);
  await makeStatusBarIcon(48, 'notification-statusbar-48.png', statusBarSrcToUse);

  console.log('All icons generated into public/icons/');
}

run().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});