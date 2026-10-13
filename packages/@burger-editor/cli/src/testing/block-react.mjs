// `node --import` で読み込む、react / react-dom を解決できない環境の再現用フック。
//
// peer 依存を自動導入しないパッケージマネージャー（yarn 4 の
// `nodeLinker: node-modules` など）では、`@burger-editor/local` / `cli` だけを
// 入れても react は node_modules に存在しない。モノレポ内はルートの
// devDependencies に react があるため、通常のテストではこの状況を再現できない。
// 解決段階で react 系を拒否し、実際の環境と同じ ERR_MODULE_NOT_FOUND を起こす。
import { registerHooks } from 'node:module';

registerHooks({
	resolve(specifier, context, nextResolve) {
		if (/^react(?:-dom)?(?:\/|$)/.test(specifier)) {
			const error = new Error(
				`Cannot find package '${specifier}' imported from ${context.parentURL}`,
			);
			error.code = 'ERR_MODULE_NOT_FOUND';
			throw error;
		}
		return nextResolve(specifier, context);
	},
});
