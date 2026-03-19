import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

function toPublicWebPath(absolutePublicPath: string) {
  const publicDir = path.resolve(process.cwd(), 'public');
  const rel = path.relative(publicDir, absolutePublicPath).replaceAll('\\', '/');
  return `/${rel}`;
}

export async function GET() {
  const framesDir = path.resolve(
    process.cwd(),
    'public',
    'assets',
    'network-map.webp'
  );

  const entries = await fs.readdir(framesDir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.webp'))
    .map((e) => path.join(framesDir, e.name));

  // Sort by frame number in filename when possible
  files.sort((a, b) => {
    const an = path.basename(a);
    const bn = path.basename(b);
    const am = an.match(/frame_(\d+)/i);
    const bm = bn.match(/frame_(\d+)/i);
    const ai = am ? Number(am[1]) : 0;
    const bi = bm ? Number(bm[1]) : 0;
    return ai - bi || an.localeCompare(bn);
  });

  return NextResponse.json({
    frames: files.map(toPublicWebPath),
  });
}

