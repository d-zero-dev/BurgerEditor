import { test, expect } from 'vitest';

import { validateClientPath } from './client-path-validation.js';

test('returns true for null path', () => {
	const result = validateClientPath(null);
	expect(result).toBe(true);
});

test('returns true for valid root path', () => {
	const result = validateClientPath('/images/sample.jpg');
	expect(result).toBe(true);
});

test('returns true for root path with single slash', () => {
	const result = validateClientPath('/');
	expect(result).toBe(true);
});

test('returns true for valid HTTPS URL', () => {
	const result = validateClientPath('https://example.com/image.jpg');
	expect(result).toBe(true);
});

test('returns true for HTTPS URL with subdomain', () => {
	const result = validateClientPath('https://cdn.example.com/assets/image.png');
	expect(result).toBe(true);
});

test('returns true for valid base64 data', () => {
	const result = validateClientPath(
		'base64:iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
	);
	expect(result).toBe(true);
});

test('returns true for base64 prefix only', () => {
	const result = validateClientPath('base64:');
	expect(result).toBe(true);
});

test('returns false for HTTP URL (not HTTPS)', () => {
	const result = validateClientPath('http://example.com/image.jpg');
	expect(result).toBe(false);
});

test('returns false for relative path with dot', () => {
	const result = validateClientPath('./images/sample.jpg');
	expect(result).toBe(false);
});

test('returns false for relative path with double dot', () => {
	const result = validateClientPath('../images/sample.jpg');
	expect(result).toBe(false);
});

test('returns false for relative path without dot prefix', () => {
	const result = validateClientPath('images/sample.jpg');
	expect(result).toBe(false);
});

test('returns false for file protocol', () => {
	const result = validateClientPath('file:///path/to/image.jpg');
	expect(result).toBe(false);
});

test('returns false for data protocol (not base64)', () => {
	const result = validateClientPath(
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
	);
	expect(result).toBe(false);
});

test('returns false for empty string', () => {
	const result = validateClientPath('');
	expect(result).toBe(false);
});

test('returns false for FTP URL', () => {
	const result = validateClientPath('ftp://example.com/image.jpg');
	expect(result).toBe(false);
});

test('returns false for Windows absolute path', () => {
	const result = validateClientPath('C:\\images\\sample.jpg');
	expect(result).toBe(false);
});
