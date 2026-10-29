import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as sass from 'sass';
import { build } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(dirname, 'src');
const jsOutDir = path.join(dirname, 'dist', 'js');
const cssOutDir = path.join(dirname, 'dist', 'css', 'admin');

const pkg = JSON.parse(await fs.readFile(path.join(dirname, 'package.json'), 'utf8'));

const banner = `/**
* BurgerEditor v${pkg.version}
*
* Copyright: ${pkg.author}
* License: ${pkg.license}
*/`;

const header = ';(function () {';
const footer = '})();';

const entries = {
	'admin/burger_editor': path.join(srcDir, 'js', 'admin', 'index.ts'),
};

for (const [output, input] of Object.entries(entries)) {
	await build({
		configFile: false,
		logLevel: 'warn',
		define: {
			__BGE_VERSION__: JSON.stringify(pkg.version),
		},
		build: {
			outDir: jsOutDir,
			emptyOutDir: false,
			lib: {
				entry: { [output]: input },
				fileName: (_, entryName) => `${entryName}.js`,
				name: 'BgE',
				formats: ['iife'],
			},
		},
	});
	const file = path.join(jsOutDir, `${output}.js`);
	const script = await fs.readFile(file, 'utf8');
	// tsc は define.d.ts の宣言で通り、テストは vitest.config.ts の define で通るため、
	// ここの define が漏れたことは成果物を見ないと検出できない
	if (script.includes('__BGE_VERSION__')) {
		throw new Error(`${file}: __BGE_VERSION__ is not replaced`);
	}
	await fs.writeFile(file, `${banner}\n${header}${script}${footer}`);
}

const result = sass.compile(path.join(srcDir, 'css', 'burger_editor.scss'), {
	style: 'expanded',
});
await fs.mkdir(cssOutDir, { recursive: true });
await fs.writeFile(path.join(cssOutDir, 'burger_editor.css'), `${result.css}\n`);

// フォント（FontAwesome / bge-ui-icons）を dist/fonts へコピー
await fs.cp(path.join(srcDir, 'fonts'), path.join(dirname, 'dist', 'fonts'), {
	recursive: true,
});
