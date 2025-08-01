/**
 * Validates client path format
 * Checks if sampleImagePath starts with one of the following formats:
 * - `/` (root path)
 * - `https://` (HTTPS URL)
 * - `base64:` (Base64 data)
 * @param path - The path to validate
 * @returns true if the path is valid, false otherwise
 */
export function validateClientPath(path: string | null): boolean {
	if (path === null) {
		return true;
	}

	const isValidRootPath = path.startsWith('/');
	const isValidHttpsUrl = path.startsWith('https://');
	const isValidBase64 = path.startsWith('base64:');

	return isValidRootPath || isValidHttpsUrl || isValidBase64;
}
