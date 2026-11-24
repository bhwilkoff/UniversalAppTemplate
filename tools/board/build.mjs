// Builds assets/vendor/excalidraw-<version>/ from the pinned packages in
// package.json: one ES module the board imports (React, ReactDOM, and
// Excalidraw together), the chunks Excalidraw loads only when needed
// (other languages, Mermaid, math), Excalidraw's stylesheet, and its
// license. Fonts are not copied: the page points Excalidraw at the same
// version's fonts on jsDelivr, which are fixed files that never change.
//
//   cd tools/board && npm ci && node build.mjs
import { build } from 'esbuild';
import { readFileSync, writeFileSync, rmSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(here, 'node_modules/@excalidraw/excalidraw/package.json'), 'utf8'));
const out = join(here, '../../assets/vendor', 'excalidraw-' + pkg.version);

// Excalidraw's phone layout (no styles, zoom, or people) starts at 730 wide, or
// at 500 tall under 1000 wide. A laptop's Meet stage beside the panel is about
// 816 by 460 (measured November 24, 2026), so those limits are lower here: a
// phone still gets it, and a stage gets the whole board.
const LIMITS = [/\bNE=730,FE=1e3,BE=500\b/, 'NE=560,FE=1e3,BE=320'];
let patched = 0;
const laptopStage = { name: 'laptop-stage', setup(b) {
  b.onLoad({ filter: /@excalidraw[\\/]excalidraw[\\/]dist[\\/]prod[\\/].*\.js$/ }, (args) => {
    let contents = readFileSync(args.path, 'utf8');
    if (LIMITS[0].test(contents)) { contents = contents.replace(LIMITS[0], LIMITS[1]); patched++; }
    return { contents, loader: 'js' };
  });
} };

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
await build({
  entryPoints: { excalidraw: join(here, 'entry.mjs') },
  bundle: true,
  splitting: true,
  format: 'esm',
  minify: true,
  outdir: out,
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
  logLevel: 'warning',
  plugins: [laptopStage]
});
if (patched !== 1) throw new Error('Excalidraw’s phone-layout limits were not found (' + patched + '); read its constants again.');
copyFileSync(join(here, 'node_modules/@excalidraw/excalidraw/dist/prod/index.css'), join(out, 'excalidraw.css'));
const license = readFileSync(join(here, 'EXCALIDRAW-LICENSE.txt'), 'utf8');
const react = readFileSync(join(here, 'node_modules/react/LICENSE'), 'utf8');
writeFileSync(join(out, 'LICENSE.txt'),
  'Excalidraw ' + pkg.version + ' (https://github.com/excalidraw/excalidraw)\n\n' + license +
  '\n\nReact and React DOM 19.2.5 (https://github.com/facebook/react)\n\n' + react +
  '\n\nExcalidraw\'s own dependencies carry their licenses in their packages. When this was built ' +
  '(October 3, 2026) every one was under a permissive license: MIT, ISC, Apache-2.0, BSD-3-Clause ' +
  '(d3 and source-map-js), CC0-1.0 (fractional-indexing), the Unlicense (robust-predicates), 0BSD ' +
  '(tslib), Zlib, or MPL-2.0 or Apache-2.0 at the user\'s choice.\n');
console.log('Built', out);
