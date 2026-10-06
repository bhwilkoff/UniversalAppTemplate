#!/usr/bin/env node
// The founding apps' screenshots, straight from their App Store listings,
// so every app is shown on the same device: the iPhone.
//
//   node tools/app-shots.mjs            (from the site folder, on a Mac)
//
// For each app it asks Apple's public lookup for its listing (by bundle
// id), takes the first two iPhone screenshots, asks Apple's image server
// for a 600-pixel-wide WebP of each, and writes them to assets/apps/ as
// <app>-1.webp and <app>-2.webp. It then shows every app as a phone on
// the home page and in assets/apps-lib.js, and rewrites the sources in
// assets/apps/README.md. Review the pictures, then commit and push.
// It needs no key, and it sends nothing but the lookups and downloads.
import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APPS = [
  { key: 'archive-watch', name: 'Archive Watch', bundle: 'app.archivewatch.tvos' },
  { key: 'tidbits-trivia', name: 'Tidbits Trivia', bundle: 'com.learningischange.tidbitstrivia' },
  { key: 'bsky-dreams', name: 'Bsky Dreams', bundle: 'app.bskydreams.ios' },
  { key: 'boba-playbook', name: 'BOBA Playbook', bundle: 'app.bobaplaybook.ios' }
];
const WIDTH = 600;

async function listing(app) {
  const r = await fetch(`https://itunes.apple.com/lookup?bundleId=${app.bundle}&country=us&entity=software`);
  const j = await r.json();
  let hit = (j.results || [])[0];
  if (!hit || !(hit.screenshotUrls || []).length) {
    const s = await (await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(app.name)}&entity=software&country=us&limit=10`)).json();
    hit = (s.results || []).find(x => x.trackName.toLowerCase().startsWith(app.name.toLowerCase()) && (x.screenshotUrls || []).length);
  }
  if (!hit) throw new Error(`${app.name}: no App Store listing with iPhone screenshots was found.`);
  return hit;
}

// https://is1-ssl.mzstatic.com/image/thumb/.../392x696bb.jpg -> 600x0w.webp
function sized(url) { return url.replace(/\/[^/]+$/, `/${WIDTH}x0w.webp`); }

function webpSize(buf) {
  // VP8X carries the canvas size; VP8 and VP8L carry it in their headers.
  const kind = buf.toString('ascii', 12, 16);
  if (kind === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
  if (kind === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return [1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff)]; }
  return [WIDTH, Math.round(WIDTH * 2.17)];
}

const sources = [];
const sizes = {};
for (const app of APPS) {
  const hit = await listing(app);
  const urls = hit.screenshotUrls.slice(0, 2);
  for (let i = 0; i < urls.length; i++) {
    const r = await fetch(sized(urls[i]));
    if (!r.ok) throw new Error(`${app.name}: screenshot ${i + 1} answered ${r.status}.`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.toString('ascii', 8, 12) !== 'WEBP') throw new Error(`${app.name}: screenshot ${i + 1} did not come back as WebP.`);
    writeFileSync(join(ROOT, 'assets/apps', `${app.key}-${i + 1}.webp`), buf);
    sizes[`${app.key}-${i + 1}`] = webpSize(buf);
    sources.push(`| ${app.key}-${i + 1}.webp | ${hit.trackName}, App Store (id${hit.trackId}), iPhone screenshot ${i + 1} |`);
  }
  console.log(`${hit.trackName}: ${urls.length} iPhone screenshots`);
}

// Every app is a phone now.
const libPath = join(ROOT, 'assets/apps-lib.js');
writeFileSync(libPath, readFileSync(libPath, 'utf8').replace("'archive-watch': { wide: true, n: 2 }", "'archive-watch': { n: 2 }"));
const homePath = join(ROOT, 'index.html');
let home = readFileSync(homePath, 'utf8').replace('<li class="shot-tv">', '<li class="shot-phone">');
for (const app of APPS) {
  const [w, h] = sizes[`${app.key}-1`];
  home = home.replace(new RegExp(`(src="/assets/apps/${app.key}-1\\.webp") width="\\d+" height="\\d+"`), `$1 width="${w}" height="${h}"`);
}
home = home.replace(/alt="Archive Watch on a television[^"]*"/, 'alt="Archive Watch on an iPhone."');
writeFileSync(homePath, home);

const readmePath = join(ROOT, 'assets/apps/README.md');
const readme = readFileSync(readmePath, 'utf8').replace(/\| File \| Source \|[\s\S]*$/, '| File | Source |\n|---|---|\n' + sources.join('\n') + '\n');
writeFileSync(readmePath, readme);
console.log('Written to assets/apps/. Look at them, then commit and push.');
