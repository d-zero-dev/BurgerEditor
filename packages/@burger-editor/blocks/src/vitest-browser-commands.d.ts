// scripts/vitest-media-commands.ts のコマンドの型（vitest.config.ts が blocks プロジェクトに登録する）
import 'vitest/browser';

declare module 'vitest/browser' {
	interface BrowserCommands {
		emulateMedia(features: {
			readonly forcedColors?: 'active' | 'none' | null;
			readonly reducedMotion?: 'reduce' | 'no-preference' | null;
		}): Promise<void>;
	}
}
