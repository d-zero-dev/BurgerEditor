import { babel } from '@rollup/plugin-babel';

/**
 * Shared React Compiler babel wiring for `blocks`, used identically by
 * its production build (`packages/@burger-editor/blocks/rollup.config.js`)
 * and its Vitest counterpart (`vitest.config.ts`'s `blocks`/`blocks-editor`
 * projects). A config-only change (options, exclude pattern) made in only
 * one place would silently diverge the two and let a component that
 * behaves differently compiled vs. not compiled pass tests while failing
 * in production, or vice versa.
 * @param {import('@rollup/plugin-babel').RollupBabelInputPluginOptions} [overrides] -
 * Extra `@rollup/plugin-babel` options merged over the shared defaults
 * (e.g. a broader `exclude` to also skip `*.spec.tsx` in the test-only
 * caller, where compiling test-harness components buys nothing). This is
 * a shallow `Object.assign`-style spread — an array-valued option (like
 * `exclude` or `plugins`) in `overrides` replaces the default array
 * entirely, it does not concatenate with it.
 * @returns {import('rollup').Plugin}
 */
export function createReactCompilerBabelPlugin(overrides = {}) {
	return babel({
		babelHelpers: 'bundled',
		// .tsxだけでなく.tsも対象にする（client側の@rolldown/plugin-babelは
		// 既定でjt(sx?)/[cm]jtsを見ており対称になる）。JSXを含まない.ts
		// ファイルも、将来カスタムhookを置いたときに黙って最適化対象から
		// 漏れないようにする
		extensions: ['.ts', '.tsx'],
		exclude: 'node_modules/**',
		presets: ['@babel/preset-typescript'],
		plugins: ['babel-plugin-react-compiler'],
		...overrides,
	});
}

/**
 * `BGE_NO_COMPILER=1` disables React Compiler everywhere it's wired
 * (`client/vite.config.ts`, `blocks/rollup.config.js`, this file's own
 * callers) — react.dev's recommendation to keep both the compiled and
 * not-compiled paths verified in CI.
 */
export const reactCompilerDisabled = process.env.BGE_NO_COMPILER === '1';
