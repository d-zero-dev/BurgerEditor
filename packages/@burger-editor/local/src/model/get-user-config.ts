import type {
	FileDirSettings,
	LocalServerConfig,
	LocalServerConfigUserSettings,
	LocalServerFileDirConfig,
	LocalServerFileDirUserSettings,
} from '../types.js';

import path from 'node:path';

import { cosmiconfig } from 'cosmiconfig';

const explorer = cosmiconfig('burgereditor');

/**
 *
 */
export async function getUserConfig(): Promise<LocalServerConfig> {
	const res = await explorer.search();

	const config: LocalServerConfigUserSettings = res?.config ?? {};
	const rootDir = path.dirname(res?.filepath ?? '') || process.cwd();
	const documentRoot = toAbsolutePath(config.documentRoot, rootDir);

	const filesDir = fileDirs(config.filesDir ?? {}, documentRoot);

	return {
		version: config.version ?? '0.0.0-unknown',
		port: config.port ?? 5255,
		host: config.host ?? 'localhost',
		documentRoot,
		lang: config.lang ?? 'en',
		stylesheets: config.stylesheets ?? [],
		classList: config.classList ?? [],
		filesDir,
		editableArea: config.editableArea ?? null,
		sampleImagePath:
			config.sampleImagePath ??
			((filesDir.image.clientPath + '/' + 'sample.png') as `/${string}`),
		googleMapsApiKey: config.googleMapsApiKey ?? null,
		open: config.open ?? true,
	};
}

/**
 *
 * @param dir
 * @param rootDir
 */
function toAbsolutePath(dir: string | undefined, rootDir: string): string {
	dir = dir ?? '';
	if (path.isAbsolute(dir)) {
		return dir;
	}
	return path.resolve(rootDir, dir);
}

/**
 *
 * @param settings
 * @param documentRoot
 */
function fileDirs(
	settings: string | FileDirSettings | LocalServerFileDirUserSettings,
	documentRoot: string,
): LocalServerFileDirConfig {
	/**
	 *
	 * @param settings
	 * @param documentRoot
	 */
	function _dir(settings: string | FileDirSettings, documentRoot: string) {
		if (typeof settings === 'string') {
			const serverPath = toAbsolutePath(path.join(documentRoot, settings), documentRoot);
			const clientPath = `/${path.relative(documentRoot, serverPath)}` as const;
			return { serverPath, clientPath };
		}
		const serverPath = toAbsolutePath(settings.serverPath, documentRoot);
		return { serverPath, clientPath: settings.clientPath };
	}

	if (typeof settings === 'string') {
		const paths = _dir(settings, documentRoot);
		return {
			image: paths,
			pdf: paths,
			video: paths,
			audio: paths,
			other: paths,
		};
	}
	if ('clientPath' in settings) {
		const paths = _dir(settings, documentRoot);
		return {
			image: paths,
			pdf: paths,
			video: paths,
			audio: paths,
			other: paths,
		};
	}
	const other = _dir(settings.other ?? '', documentRoot);
	return {
		image: settings.image ? _dir(settings.image, documentRoot) : other,
		pdf: settings.pdf ? _dir(settings.pdf, documentRoot) : other,
		video: settings.video ? _dir(settings.video, documentRoot) : other,
		audio: settings.audio ? _dir(settings.audio, documentRoot) : other,
		other,
	};
}
