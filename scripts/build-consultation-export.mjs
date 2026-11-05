import { build } from 'esbuild';
import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const directory = 'server/generated';
await mkdir(directory, { recursive: true });
const assets = (await readdir('dist/assets')).filter(name => /^index-.*\.css$/.test(name));
if (assets.length !== 1) throw new Error('Build frontend CSS before consultation renderer');
const css = await readFile(path.join('dist/assets', assets[0]), 'utf8');
const fontRoot = 'node_modules/@fontsource/noto-sans-tc';
let fontCSS = (await readFile(path.join(fontRoot, '400.css'), 'utf8')).replaceAll('font-display: swap', 'font-display: block');
const fonts = [...new Set([...fontCSS.matchAll(/url\(([^)]+)\)/g)].map(m => m[1].replaceAll(/["']/g, '')))];
for (const font of fonts) {
  const bytes = await readFile(path.join(fontRoot, font));
  fontCSS = fontCSS.replaceAll(font, `data:font/woff2;base64,${bytes.toString('base64')}`);
}
const sourceFiles = ['src/consultation/natalRender.tsx','src/logic/engine.ts','src/logic/constants.ts',
  'src/components/Chart/PalaceGrid.tsx','src/components/PalaceCard.tsx','src/components/CenterInfoBoard.tsx','package-lock.json'];
const digest = createHash('sha256');
for (const file of sourceFiles) digest.update(await readFile(file));
digest.update(css); digest.update(fontCSS);
const revision = `natal-v1-${digest.digest('hex').slice(0,16)}`;
await build({ entryPoints:['src/consultation/natalRender.tsx'], outfile: path.join(directory, 'natal-render.mjs'),
  bundle:true, platform:'node', format:'esm', jsx:'automatic',
  // CJS React/DOM dependencies need native Node require when bundled into ESM.
  banner:{ js:"import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
  define:{ 'process.env.NODE_ENV':'"production"', __CONSULTATION_RENDER_VERSION__:JSON.stringify(revision) },
});
await writeFile(path.join(directory, 'natal-chart.css'), `${fontCSS}\n${css}`);
await copyFile(path.join(fontRoot, 'LICENSE'), path.join(directory, 'NotoSansTC-LICENSE.txt'));
console.log(`Consultation renderer: ${revision}; self-contained fonts and CSS ready`);
