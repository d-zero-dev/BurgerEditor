import type {
	FileDirSettings,
	LocalServerConfig,
	LocalServerConfigUserSettings,
	LocalServerFileDirConfig,
	LocalServerFileDirUserSettings,
} from '../types.js';

import path from 'node:path';

import { defaultCatalog } from '@burger-editor/blocks';
import { cosmiconfig } from 'cosmiconfig';

const explorer = cosmiconfig('burgereditor');

/**
 *
 */
export async function getUserConfig(): Promise<LocalServerConfig> {
	const res = await explorer.search();

	const config: LocalServerConfigUserSettings = res?.config ?? {};
	const rootDir = path.dirname(res?.filepath ?? '') || process.cwd();
	const documentRoot = toAbsolutePath(config.documentRoot, rootDir) || rootDir;
	const assetsRoot = toAbsolutePath(config.assetsRoot, rootDir) || documentRoot;

	const filesDir = fileDirs(config.filesDir ?? {}, assetsRoot);

	return {
		version: config.version ?? '0.0.0-unknown',
		port: config.port ?? 5255,
		host: config.host ?? 'localhost',
		documentRoot,
		assetsRoot,
		lang: config.lang ?? 'en',
		stylesheets: config.stylesheets ?? [],
		classList: config.classList ?? [],
		filesDir,
		editableArea: config.editableArea ?? null,
		newFileContent: config.newFileContent?.trim() ?? '',
		catalog: config.catalog ?? defaultCatalog,
		enableImportBlock: config.enableImportBlock ?? true,
		sampleImagePath:
			config.sampleImagePath ??
			((filesDir.image.clientPath + '/' + 'sample.png') as `/${string}`),
		sampleFilePath:
			config.sampleFilePath ??
			((filesDir.other.clientPath + '/' + 'sample.pdf') as `/${string}`),
		googleMapsApiKey: config.googleMapsApiKey ?? null,
		open: config.open ?? true,
		healthCheck: {
			enabled: true,
			interval: 10_000,
			retryCount: 3,
			...config.healthCheck,
		},
		experimental: config.experimental,
	};
}

/**
 *
 * @param dir
 * @param rootDir
 */
function toAbsolutePath(dir: string | undefined, rootDir: string): string | null {
	if (!dir) {
		return null;
	}
	if (path.isAbsolute(dir)) {
		return dir;
	}
	return path.resolve(rootDir, dir);
}

/**
 *
 * @param settings
 * @param assetsRoot
 */
function fileDirs(
	settings: string | FileDirSettings | LocalServerFileDirUserSettings,
	assetsRoot: string,
): LocalServerFileDirConfig {
	/**
	 *
	 * @param settings
	 * @param assetsRoot
	 */
	function _dir(settings: string | FileDirSettings, assetsRoot: string) {
		if (typeof settings === 'string') {
			const serverPath =
				toAbsolutePath(path.join(assetsRoot, settings), assetsRoot) ||
				path.join(assetsRoot, settings);
			const clientPath = `/${path.relative(assetsRoot, serverPath)}` as const;
			return { serverPath, clientPath };
		}
		const serverPath =
			toAbsolutePath(settings.serverPath, assetsRoot) ||
			path.resolve(assetsRoot, settings.serverPath);
		return { serverPath, clientPath: settings.clientPath };
	}

	if (typeof settings === 'string') {
		const paths = _dir(settings, assetsRoot);
		return {
			image: paths,
			pdf: paths,
			video: paths,
			audio: paths,
			other: paths,
		};
	}
	if ('clientPath' in settings) {
		const paths = _dir(settings, assetsRoot);
		return {
			image: paths,
			pdf: paths,
			video: paths,
			audio: paths,
			other: paths,
		};
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
