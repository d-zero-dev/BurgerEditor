import type {
	BurgerEditorConfig,
	BurgerEditorConfigUserSettings,
	BurgerEditorFileDirConfig,
	BurgerEditorFileDirUserSettings,
	FileDirSettings,
} from '../types.js';

import path from 'node:path';

import { defaultCatalog } from '@burger-editor/blocks';
import { cosmiconfig } from 'cosmiconfig';

// cosmiconfig 9's default `searchStrategy: 'none'` only checks the passed
// directory and refuses to walk up. We want the canonical "find the project
// config no matter where the agent invoked the CLI from" behaviour, which is
// `searchStrategy: 'project'` — walk up until the first ancestor containing
// `package.json` (then check that ancestor too).
const explorer = cosmiconfig('burgereditor', { searchStrategy: 'project' });

export interface ResolvedConfig {
	readonly config: BurgerEditorConfig;
	readonly configPath: string | null;
}

/**
 * Drop cosmiconfig's load + search caches. The shared explorer instance
 * memoizes per-directory hits, which is fine for normal CLI / MCP usage but
 * inappropriate for tests (a "no config found at X" entry survives across
 * cases that subsequently *do* create a config under X) and for long-lived
 * daemons that need to react to config edits.
 */
export function clearConfigCache(): void {
	explorer.clearCaches();
}

/**
 * Locate `burgereditor.config.{js,mjs,ts,cjs,json}` via cosmiconfig, walking up
 * from `searchFrom` (defaults to `process.cwd()`), and merge with defaults.
 * @param searchFrom directory to start the search from
 */
export async function resolveConfig(searchFrom?: string): Promise<ResolvedConfig> {
	const res = await explorer.search(searchFrom);

	const userConfig: BurgerEditorConfigUserSettings = res?.config ?? {};
	const rootDir = path.dirname(res?.filepath ?? '') || (searchFrom ?? process.cwd());

	const documentRoot = toAbsolutePath(userConfig.documentRoot, rootDir) || rootDir;
	const assetsRoot = toAbsolutePath(userConfig.assetsRoot, rootDir) || documentRoot;

	const filesDir = fileDirs(userConfig.filesDir ?? {}, assetsRoot);

	const config: BurgerEditorConfig = {
		version: userConfig.version ?? '0.0.0-unknown',
		port: userConfig.port ?? 5255,
		host: userConfig.host ?? 'localhost',
		documentRoot,
		assetsRoot,
		lang: userConfig.lang ?? 'en',
		stylesheets: userConfig.stylesheets ?? [],
		classList: userConfig.classList ?? [],
		filesDir,
		editableArea: userConfig.editableArea ?? null,
		indexFileName: userConfig.indexFileName ?? 'index.html',
		newFileContent: userConfig.newFileContent?.trim() ?? '',
		catalog: userConfig.catalog ?? defaultCatalog,
		enableImportBlock: userConfig.enableImportBlock ?? true,
		sampleImagePath:
			userConfig.sampleImagePath ??
			((filesDir.image.clientPath + '/' + 'sample.png') as `/${string}`),
		sampleFilePath:
			userConfig.sampleFilePath ??
			((filesDir.other.clientPath + '/' + 'sample.pdf') as `/${string}`),
		googleMapsApiKey: userConfig.googleMapsApiKey ?? null,
		open: userConfig.open ?? true,
		healthCheck: {
			enabled: true,
			interval: 10_000,
			retryCount: 3,
			...userConfig.healthCheck,
		},
		experimental: userConfig.experimental,
		virtualTree: {
			enabled: userConfig.virtualTree?.enabled ?? false,
			pathKey: userConfig.virtualTree?.pathKey ?? 'path',
		},
	};

	return { config, configPath: res?.filepath ?? null };
}

/**
 *
 * @param dir
 * @param rootDir
 */
function toAbsolutePath(dir: string | undefined, rootDir: string): string | null {
	if (!dir) return null;
	if (path.isAbsolute(dir)) return dir;
	return path.resolve(rootDir, dir);
}

/**
 *
 * @param settings
 * @param assetsRoot
 */
function fileDirs(
	settings: string | FileDirSettings | BurgerEditorFileDirUserSettings,
	assetsRoot: string,
): BurgerEditorFileDirConfig {
	/**
	 *
	 * @param s
	 * @param base
	 */
	function _dir(s: string | FileDirSettings, base: string) {
		if (typeof s === 'string') {
			const serverPath = toAbsolutePath(path.join(base, s), base) || path.join(base, s);
			const clientPath = `/${path.relative(base, serverPath)}` as const;
			return { serverPath, clientPath };
		}
		const serverPath =
			toAbsolutePath(s.serverPath, base) || path.resolve(base, s.serverPath);
		return { serverPath, clientPath: s.clientPath };
	}

	if (typeof settings === 'string') {
		const paths = _dir(settings, assetsRoot);
		return { image: paths, pdf: paths, video: paths, audio: paths, other: paths };
	}
	if ('clientPath' in settings) {
		const paths = _dir(settings, assetsRoot);
		return { image: paths, pdf: paths, video: paths, audio: paths, other: paths };
	}
	const other = _dir(settings.other ?? '', assetsRoot);
	return {
		image: settings.image ? _dir(settings.image, assetsRoot) : other,
		pdf: settings.pdf ? _dir(settings.pdf, assetsRoot) : other,
		video: settings.video ? _dir(settings.video, assetsRoot) : other,
		audio: settings.audio ? _dir(settings.audio, assetsRoot) : other,
		other,
	};
}
