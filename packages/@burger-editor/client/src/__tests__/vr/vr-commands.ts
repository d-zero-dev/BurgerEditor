import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// eslint-disable-next-line import-x/no-extraneous-dependencies
import pixelmatch from 'pixelmatch';
// eslint-disable-next-line import-x/no-extraneous-dependencies
import { PNG } from 'pngjs';

interface MatchResult {
	pass: boolean;
	message: string;
}

interface BrowserCommandContext {
	testPath: string;
}

/**
 *
 * @param png
 */
function isBlankImage(png: PNG): boolean {
	const { data, width, height } = png;
	if (width === 0 || height === 0) return true;

	const [r0, g0, b0, a0] = [data[0], data[1], data[2], data[3]];

	for (let i = 4; i < width * height * 4; i += 4) {
		if (
			data[i] !== r0 ||
			data[i + 1] !== g0 ||
			data[i + 2] !== b0 ||
			data[i + 3] !== a0
		) {
			return false;
		}
	}
	return true;
}

export const vrCommands = {
	matchScreenshot(
		context: BrowserCommandContext,
		base64: string,
		snapshotRelativePath: string,
		maxDiffPixelRatio = 0.005,
		threshold = 0.1,
	): MatchResult {
		const testDir = path.dirname(context.testPath);
		const snapshotPath = path.resolve(testDir, snapshotRelativePath);

		const receivedBuffer = Buffer.from(base64, 'base64');
		const received = PNG.sync.read(receivedBuffer);

		if (received.width < 20 || received.height < 20) {
			return {
				pass: false,
				message: `Screenshot too small: ${received.width}x${received.height} (minimum 20x20)`,
			};
		}

		if (isBlankImage(received)) {
			return {
				pass: false,
				message: 'Screenshot is blank (all pixels are the same color)',
			};
		}

		const isUpdate = process.argv.includes('--update');

		if (!existsSync(snapshotPath) || isUpdate) {
			mkdirSync(path.dirname(snapshotPath), { recursive: true });
			writeFileSync(snapshotPath, receivedBuffer);
			return { pass: true, message: `Baseline saved to ${snapshotPath}` };
		}

		const baselineBuffer = readFileSync(snapshotPath);
		const baseline = PNG.sync.read(baselineBuffer);

		if (received.width !== baseline.width || received.height !== baseline.height) {
			const receivedPath = snapshotPath.replace('.png', '-received.png');
			writeFileSync(receivedPath, receivedBuffer);
			return {
				pass: false,
				message: `Size mismatch: expected ${baseline.width}x${baseline.height}, got ${received.width}x${received.height}`,
			};
		}

		const diff = new PNG({ width: received.width, height: received.height });
		const numDiffPixels = pixelmatch(
			received.data,
			baseline.data,
			diff.data,
			received.width,
			received.height,
			{ threshold, includeAA: false },
		);

		const totalPixels = received.width * received.height;
		const diffRatio = numDiffPixels / totalPixels;

		if (diffRatio > maxDiffPixelRatio) {
			const diffPath = snapshotPath.replace('.png', '-diff.png');
			const receivedPath = snapshotPath.replace('.png', '-received.png');
			writeFileSync(diffPath, PNG.sync.write(diff));
			writeFileSync(receivedPath, receivedBuffer);
			return {
				pass: false,
				message: `Diff ${(diffRatio * 100).toFixed(3)}% exceeds ${(maxDiffPixelRatio * 100).toFixed(3)}% threshold (${numDiffPixels}/${totalPixels} pixels)`,
			};
		}

		return { pass: true, message: `Match (${(diffRatio * 100).toFixed(3)}% diff)` };
	},
};
