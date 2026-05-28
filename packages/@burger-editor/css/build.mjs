import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import { globSync } from 'glob';
import postcss from 'postcss';
import base64 from 'postcss-base64';
import calc from 'postcss-calc';
import colorFunction from 'postcss-color-function';
import customMedia from 'postcss-custom-media';
import atImport from 'postcss-import';
import math from 'postcss-math';
import * as sass from 'sass';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const sassDir = path.join(dirname, 'src', 'sass');
const blocksSrcDir = path.resolve(dirname, '..', 'blocks', 'src');

const processor = postcss([
	atImport(),
	customMedia(),
	math(),
	calc(),
	colorFunction(),
	autoprefixer(),
	base64({
		pattern: '/<svg.*</svg>/i',
		prepend: 'data:image/svg+xml;base64,',
	}),
	cssnano(),
]);

/**
 * @param {string[]} files
 * @returns {string}
 */
function toImports(files) {
	return files.map((file) => `@import "${path.join(blocksSrcDir, file)}";`).join('\n');
}

/**
 * @param {string} css
 * @param {string} outFileName
 */
async function emit(css, outFileName) {
	const result = await processor.process(css, { from: undefined, to: undefined });
	await fs.writeFile(path.join(dirname, outFileName), result.css);
}

const blockScssFiles = globSync('block/**/style.scss', { cwd: blocksSrcDir });
const typeScssFiles = globSync('type/**/style.scss', { cwd: blocksSrcDir });

let defaultScss = await fs.readFile(path.join(sassDir, 'bge_style_default.scss'), 'utf8');
defaultScss = defaultScss
	.replace(/\/\*\s*@SCSS_FILES_BLOCK\s*\*\//, toImports(blockScssFiles))
	.replace(/\/\*\s*@SCSS_FILES_TYPE\s*\*\//, toImports(typeScssFiles));

const defaultCss = sass.compileString(defaultScss, {
	loadPaths: [sassDir],
	style: 'expanded',
}).css;

const sampleCss = sass.compile(path.join(sassDir, 'bge_style.scss'), {
	loadPaths: [sassDir],
	style: 'expanded',
}).css;

await emit(defaultCss, 'bge_style_default.css');
await emit(sampleCss, 'bge_style.css');
