/**
 * Normalizes the indentation of a multi-line HTML string by detecting the indentation
 * of the first line and removing the same amount of leading whitespace (spaces or tabs)
 * from all lines.
 *
 * - The function first removes any leading empty lines (lines containing only line breaks).
 * - It then detects the leading whitespace (indent) from the first line.
 * - For each line, if that indent is present at the start of the line, it is removed.
 * - After normalization, any trailing empty lines (containing only whitespace or line breaks)
 * are also removed.
 * - Supports both LF (\n) and CRLF (\r\n) line endings.
 *
 * This is useful when copying and pasting or serializing innerHTML that includes
 * indentation due to template formatting, so the returned HTML has normalized,
 * consistent indentation and no unwanted leading/trailing blank lines.
 * @param html - The multi-line HTML string to normalize.
 * @returns The HTML string with normalized indentation and no leading/trailing empty lines.
 */
export function normalizeIndent(html: string): string {
	// Remove leading line breaks
	const trimmedHtml = html.replace(/^(?:\r?\n)+/, '');

	const lines = trimmedHtml.split(/(?<=\r\n|\n|$)/);

	const firstLineIndent = lines[0]?.match(/^\s+/)?.[0] ?? '';

	if (firstLineIndent.length === 0) {
		return trimmedHtml.trimEnd();
	}

	const normalizedLines = lines.map((line) => line.replace(firstLineIndent, ''));

	return normalizedLines.join('').trimEnd();
}
