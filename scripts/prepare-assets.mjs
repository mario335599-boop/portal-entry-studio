import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const root = name => path.dirname(name==='tesseract.js-core' ? createRequire(require.resolve('tesseract.js')).resolve(`${name}/package.json`) : require.resolve(`${name}/package.json`));
const out = 'public/vendor';
await mkdir(out, { recursive: true });
const pdf = root('pdfjs-dist');
for (const part of ['cmaps', 'standard_fonts', 'wasm']) await cp(`${pdf}/${part}`, `${out}/pdf/${part}`, { recursive: true });
await cp(`${pdf}/build/pdf.worker.min.mjs`, `${out}/pdf.worker.min.mjs`);
await cp(`${root('tesseract.js')}/dist/worker.min.js`, `${out}/worker.min.js`);
await cp(root('tesseract.js-core'), `${out}/core`, { recursive: true });
for (const lang of ['jpn', 'eng']) {
  const dir = root(`@tesseract.js-data/${lang}`);
  await mkdir(`${out}/lang`, { recursive: true });
  await cp(`${dir}/4.0.0_best_int/${lang}.traineddata.gz`, `${out}/lang/${lang}.traineddata.gz`);
}
await mkdir(`${out}/licenses`, { recursive: true });
for (const pkg of ['pdfjs-dist', 'tesseract.js', 'tesseract.js-core', '@tesseract.js-data/jpn', '@tesseract.js-data/eng']) {
  for (const f of await readdir(root(pkg))) if (/license|copying/i.test(f)) await cp(`${root(pkg)}/${f}`, `${out}/licenses/${pkg.replaceAll('/', '-')}-${f}`);
  await cp(`${root(pkg)}/package.json`, `${out}/licenses/${pkg.replaceAll('/', '-')}-package.json`);
}
await writeFile(`${out}/README.txt`, 'Local PDF.js / Tesseract.js runtime and language data. No remote CDN is used. See licenses/.\n');
console.log('Local PDF/OCR assets prepared.');
