import type { BrowserCommand } from 'vitest/node';

/**
 * Playwright の `page.emulateMedia()` に渡す特性。`null` は再現を解除する
 */
export interface MediaFeatures {
	readonly forcedColors?: 'active' | 'none' | null;
	readonly reducedMotion?: 'reduce' | 'no-preference' | null;
}

/**
 * テストのページのメディア特性（強制カラーモードなど）を切り替える。
 * CSS の `@media (forced-colors: active)` の分岐を、OS やブラウザの設定を変えずに
 * 検証するため。ページ全体に残るので、テストの終了時に `null` で解除する
 * @param root0
 * @param root0.page
 * @param features
 */
const emulateMedia: BrowserCommand<[features: MediaFeatures]> = async (
	{ page },
	features,
) => {
	await page.emulateMedia(features);
};

/**
 * ブラウザで動く Vitest プロジェクト（blocks / runtime）に登録するコマンド
 */
export const mediaCommands = { emulateMedia };
