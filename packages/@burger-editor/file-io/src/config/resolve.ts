import type {
	BurgerEditorConfig,
	BurgerEditorConfigUserSettings,
	BurgerEditorFileDirConfig,
	BurgerEditorFileDirUserSettings,
	FileDirSettings,
} from '../types.js';

import fs from 'node:fs/promises';
import path from 'node:path';

import { defaultCatalog } from '@burger-editor/blocks';
import { cosmiconfig } from 'cosmiconfig';

// cosmiconfig 9's default `searchStrategy: 'none'` only checks the passed
// directory and refuses to walk up. We want the canonical "find the project
// config no matter where the agent invoked the CLI from" behaviour, which is
// `searchStrategy: 'project'` — walk up until the first ancestor containing
// `package.json` (then check that ancestor too).
const explorer = cosmiconfig('burgereditor', { searchStrategy: 'project' });

// Read here rather than by each entry point so `local`, `cli` and
// `mcp-server` all honor it through the one resolver they share — an agent
// process launched from the project root then lands on the same config file
// as the `local` server it talks to.
const CONFIG_PATH_ENV = 'BGE_CONFIG';

export interface ResolvedConfig {
	readonly config: BurgerEditorConfig;
	readonly configPath: string | null;
}

/**
 * Options for {@link resolveConfig}.
 * @example
 * ```ts
 * const options: ResolveConfigOptions = { configPath: './burgereditor.child.config.js' };
 * ```
 */
export interface ResolveConfigOptions {
	/**
	 * A config file to load directly instead of searching, under any file
	 * name whose extension cosmiconfig has a loader for (`.js`, `.mjs`,
	 * `.cjs`, `.ts`, `.json`, `.yaml`, …). A relative path resolves against `process.cwd()`;
	 * relative paths *inside* the config keep resolving against the config
	 * file's own directory. Omitted, the `BGE_CONFIG` environment variable is
	 * used the same way; with neither, the directory search runs.
	 */
	readonly configPath?: string;
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
 * Locate the user's BurgerEditor config and merge it with defaults.
 *
 * The file is taken from, in order: `options.configPath`, the `BGE_CONFIG`
 * environment variable, or a cosmiconfig search for
 * `burgereditor.config.{js,mjs,ts,cjs}` walking up from `searchFrom`
 * (defaults to `process.cwd()`). An explicitly named file must exist — it
 * rejects instead of falling back to defaults, which would otherwise boot
 * with `documentRoot` set to the working directory. A search that finds
 * nothing still resolves to the defaults.
 * @param searchFrom directory to start the search from; ignored when a config file is named explicitly
 * @param options see {@link ResolveConfigOptions}
 * @returns the merged config, and the path of the file it came from (`null` when the search found none)
 * @example
 * ```ts
 * // Search upward from the working directory
 * const { config, configPath } = await resolveConfig();
 *
 * // Load a specific file (e.g. a sub-site sharing the repository)
 * const child = await resolveConfig(undefined, {
 * 	configPath: './burgereditor.child.config.js',
 * });
 * console.log(child.config.documentRoot);
 * ```
 */
export async function resolveConfig(
	searchFrom?: string,
	options: ResolveConfigOptions = {},
): Promise<ResolvedConfig> {
	const res = await findUserConfig(searchFrom, options.configPath);

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
		agent: {
			enabled: userConfig.agent?.enabled ?? true,
		},
	};

	return { config, configPath: res?.filepath ?? null };
}

/**
 * Load the explicitly named config file, or search when none is named.
 * @param searchFrom
 * @param configPath
 */
async function findUserConfig(searchFrom: string | undefined, configPath?: string) {
	const fromEnv = process.env[CONFIG_PATH_ENV];
	const named = configPath || fromEnv;
	if (!named) {
		return await explorer.search(searchFrom);
	}
	const filepath = path.resolve(named);
	const origin = configPath ? '' : ` (from ${CONFIG_PATH_ENV}=${fromEnv})`;
	// Checked up front rather than by matching cosmiconfig's read error: an
	// ENOENT thrown by code *inside* the config would be indistinguishable,
	// and a directory surfaces as a bare EISDIR without the path. Only a
	// missing path is translated; any other stat failure (EACCES, …) keeps
	// its own message instead of being reported as "not found".
	const stat = await fs.stat(filepath).catch((error: NodeJS.ErrnoException) => {
		if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
			return null;
		}
		throw error;
	});
	if (!stat) {
		throw new Error(`Config file not found: ${filepath}${origin}`);
	}
	if (!stat.isFile()) {
		throw new Error(`Config path is not a file: ${filepath}${origin}`);
	}
	return await explorer.load(filepath);
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
