import { test, expect } from 'vitest';

import { parseName, decode, encode } from './file-name.js';

test('encode and decode roundtrip', () => {
	const original = 'exampleName';
	const encoded = encode(original);
	const decoded = decode(encoded);
	expect(decoded).toBe(original);
});

test('parseName works correctly with numeric fileId, encoded name, and size', () => {
	// Create a filename with a numeric fileId.
	const fileId = '123';
	const originalName = 'testName';
	const encodedName = encode(originalName);
	const size = '456';
	const ext = '.txt';
	// Filename format: fileId__encodedName__size.ext
	const fileName = `${fileId}__${encodedName}__${size}${ext}`;

	const result = parseName(fileName);
	expect(result.fileId).toBe(fileId);
	expect(result.name).toBe(originalName);
	expect(result.size).toBe(size);
	expect(result.ext).toBe(ext);
});

test('parseName handles non-numeric fileId correctly', () => {
	// Non-numeric fileId should result in fileId of 'N/A'
	const nonNumericId = 'abc';
	const encodedName = encode('shouldNotMatter');
	const size = '789';
	const ext = '.png';
	const fileName = `${nonNumericId}__${encodedName}__${size}${ext}`;

	const result = parseName(fileName);
	expect(result.fileId).toBe('N/A');
	// When fileId is non-numeric, encodedName is set to fileId ('N/A') and name is decoded from that.
	const expectedName = decode('N/A');
	expect(result.name).toBe(expectedName);
	expect(result.size).toBe(size);
	expect(result.ext).toBe(ext);
});

test('decode returns correct output for a known pattern', () => {
	// Generating a known pair using encode, then decoding must yield the original string.
	const input = 'Hello, World!';
	const encoded = encode(input);
	const decoded = decode(encoded);
	expect(decoded).toBe(input);
});

test('Patterns', () => {
	expect(parseName('123__aGVsbG8=__456.txt').name).toBe('hello');
	expect(parseName('298__OEw0QTI1NzM-d-__org.jpg').name).toBe('8L4A2573');
});
