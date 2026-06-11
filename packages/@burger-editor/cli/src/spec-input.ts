import fs from 'node:fs/promises';

/**
 * Resolve a JSON spec from three possible sources (in order):
 *   1. `--spec` inline JSON string
 *   2. `--spec-file <path>` file content
 *   3. stdin (when no `--spec*` flag and stdin is piped)
 *
 * Returns `null` if no source was provided (caller decides whether that is
 * acceptable).
 * @param specInline value passed to --spec
 * @param specFile value passed to --spec-file
 */
export async function resolveSpec(
	specInline: string | undefined,
	specFile: string | undefined,
): Promise<unknown> {
	if (typeof specInline === 'string') {
		return JSON.parse(specInline);
	}
	if (typeof specFile === 'string') {
		const content = await fs.readFile(specFile, 'utf8');
		return JSON.parse(content);
	}
	if (!process.stdin.isTTY) {
		const chunks: Buffer[] = [];
		for await (const chunk of process.stdin) {
			chunks.push(chunk as Buffer);
		}
		const raw = Buffer.concat(chunks).toString('utf8').trim();
		if (raw.length === 0) {
			return null;
		}
		return JSON.parse(raw);
	}
	return null;
}
