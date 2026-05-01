/**
 * Build a dark-mode wordmark PNG from Firebase `onboard.logo.png` (or a local/input file).
 *
 * Candidate HTML email footers use Firebase URL from `resolveOnboardEmailFooterLogoUrl()` (`email.ts`).
 * This script still emits:
 *   public/email-brand/fdx-onboard-footer-dark.png — optional purple→white variant for other uses.
 *
 * Source priority:
 *   1) Local file scripts/email-brand/input/image_17.png if it exists (designer override)
 *   2) Else URL from FDX_ONBOARD_LOGO_URL env
 *   3) Else default Firebase download URL (see `DEFAULT_FIREBASE_DOWNLOAD` below).
 *
 * npm run email:brand
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.join(__dirname, 'input', 'image_17.png');
const repoRoot = path.join(__dirname, '..', '..');
const outDark = path.join(repoRoot, 'public', 'email-brand', 'fdx-onboard-footer-dark.png');

const DEFAULT_FIREBASE_DOWNLOAD =
  'https://firebasestorage.googleapis.com/v0/b/studio-3449665797-2559e.firebasestorage.app/o/onboard.logo.png?alt=media&token=12ad7307-ea89-4458-b2f5-59b7765350cc';

/** @returns {[number,number,number]} h 0–360, s,l 0–1 */
function rgbToHsl(r, g, b) {
  let rr = r / 255,
    gg = g / 255,
    bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rr:
        h = (gg - bb) / d + (gg < bb ? 6 : 0);
        break;
      case gg:
        h = (bb - rr) / d + 2;
        break;
      default:
        h = (rr - gg) / d + 4;
    }
    h /= 6;
  }

  return [h * 360, s, l];
}

function distToFedExPurpleSquared(r, g, b) {
  const pr = 77,
    pg = 20,
    pb = 140;
  const dr = r - pr,
    dg = g - pg,
    db = b - pb;
  return dr * dr + dg * dg + db * db;
}

function isStrongOrangeAccent(r, g, b, a, h, s, l) {
  if (a < 12) return false;
  if (h >= 8 && h <= 55 && s > 0.28 && r > 120 && r > g) return true;
  if (h <= 62 && h >= 10 && s > 0.4 && r > 170 && r > g * 1.1) return true;
  return false;
}

function isPurpleGraphic(r, g, b, a, h, s, l) {
  if (a < 10) return false;
  if (h >= 246 && h <= 334 && s > 0.14) return true;
  if (distToFedExPurpleSquared(r, g, b) < 120 * 120) return true;
  if (h >= 250 && h <= 320 && s > 0.08 && l < 0.45 && b > r * 0.9 && r > g) return true;
  return false;
}

function shouldRecolorPurpleToWhite(r, g, b, a) {
  const [hue, sat, lum] = rgbToHsl(r, g, b);
  if (isStrongOrangeAccent(r, g, b, a, hue, sat, lum)) return false;
  if (!isPurpleGraphic(r, g, b, a, hue, sat, lum)) return false;
  return true;
}

async function loadImageBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url.slice(0, 80)}...`);
  return Buffer.from(await res.arrayBuffer());
}

async function resolveTrimmedSharp() {
  if (fs.existsSync(inputPath)) {
    console.log(`Using local source: ${path.relative(repoRoot, inputPath)}`);
    return sharp(inputPath).ensureAlpha().trim();
  }

  const downloadUrl =
    process.env.FDX_ONBOARD_LOGO_URL?.trim() || DEFAULT_FIREBASE_DOWNLOAD;
  console.log('Downloading onboarding logo:', downloadUrl.split('?')[0], '…');
  const buf = await loadImageBuffer(downloadUrl);
  return sharp(buf).ensureAlpha().trim();
}

async function main() {
  try {
    await fs.promises.mkdir(path.dirname(outDark), { recursive: true });

    const trimmed = await resolveTrimmedSharp();

    const { data, info } = await trimmed.clone().raw().toBuffer({ resolveWithObject: true });
    const copy = Buffer.from(data);

    const { channels } = info;
    if (channels !== 4) throw new Error('Expected RGBA after ensureAlpha');

    const width = info.width;
    const height = info.height;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = copy[i],
          gch = copy[i + 1],
          bch = copy[i + 2],
          a = copy[i + 3];
        if (shouldRecolorPurpleToWhite(r, gch, bch, a)) {
          copy[i] = 255;
          copy[i + 1] = 255;
          copy[i + 2] = 255;
        }
      }
    }

    await sharp(copy, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .ensureAlpha()
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(outDark);

    console.log('Wrote', path.relative(repoRoot, outDark));
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    console.error(`
If download failed (token revoked), either:
  - Place scripts/email-brand/input/image_17.png and re-run, or
  - FDX_ONBOARD_LOGO_URL="https://firebasestorage.googleapis.com/v0/b/.../onboard.logo.png?alt=media&token=NEWTOKEN" npm run email:brand`);
    process.exitCode = 1;
  }
}

await main();
