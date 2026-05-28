import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(dirname, 'src');
const outDir = path.join(dirname, 'dist');

const pkg = JSON.parse(await fs.readFile(path.join(dirname, 'package.json'), 'utf8'));

const banner = `/**
* BurgerEditor v${pkg.version}
*
* Copyright: ${pkg.author}
* License: ${pkg.license}
*/`;

const header = ';(function () {';
const footer = '})();';

const output = 'bge_functions.min';
const input = path.join(srcDir, 'bge-functions.ts');

await build({
	configFile: false,
	logLevel: 'warn',
	build: {
		outDir,
		emptyOutDir: false,
		lib: {
			entry: { [output]: input },
			fileName: (_, entryName) => `${entryName}.js`,
			name: 'BgE',
			formats: ['iife'],
		},
	},
});

const file = path.join(outDir, `${output}.js`);
const script = await fs.readFile(file, 'utf8');
await fs.writeFile(file, `${banner}\n${header}${script}${footer}`);
