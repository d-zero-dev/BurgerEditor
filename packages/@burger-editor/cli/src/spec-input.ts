import fs from 'node:fs/promises';

/**
 * Result of {@link resolveSpec}. `source` lets callers compose richer
 * diagnostics (e.g. "you provided --spec but the JSON parsed to null") than
 * a bare `null` allowed.
 */
export interface SpecResolution {
	readonly value: unknown;
	readonly source: 'inline' | 'file' | 'stdin' | 'none';
}

/**
 * Resolve a JSON spec from three possible sources (in order):
 *   1. `--spec` inline JSON string
 *   2. `--spec-file <path>` file content
 *   3. stdin (when no `--spec*` flag and stdin is piped)
 *
 * Returns `{ value: null, source: 'none' }` if nothing was supplied (caller
 * decides whether that is acceptable).
 * @param specInline value passed to --spec
 * @param specFile value passed to --spec-file
 */
export async function resolveSpec(
	specInline: string | undefined,
	specFile: string | undefined,
): Promise<SpecResolution> {
	if (typeof specInline === 'string') {
		return { value: JSON.parse(specInline) as unknown, source: 'inline' };
	}
	if (typeof specFile === 'string') {
		const content = await fs.readFile(specFile, 'utf8');
		return { value: JSON.parse(content) as unknown, source: 'file' };
	}
	if (!process.stdin.isTTY) {
		const chunks: Buffer[] = [];
		for await (const chunk of process.stdin) {
			chunks.push(chunk as Buffer);
		}
		const raw = Buffer.concat(chunks).toString('utf8').trim();
		if (raw.length === 0) {
			return { value: null, source: 'none' };
		}
		return { value: JSON.parse(raw) as unknown, source: 'stdin' };
	}
	return { value: null, source: 'none' };
}
