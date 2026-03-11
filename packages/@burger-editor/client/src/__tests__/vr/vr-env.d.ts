declare module 'vitest/browser' {
	interface BrowserCommands {
		matchScreenshot(
			base64: string,
			snapshotRelativePath: string,
			maxDiffPixelRatio?: number,
			threshold?: number,
		): Promise<{ pass: boolean; message: string }>;
	}
}
