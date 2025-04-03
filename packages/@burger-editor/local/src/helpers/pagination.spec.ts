import { test, expect } from 'vitest';

import { pagination } from './pagination.js';

const sampleFiles = [
	{ fileId: '1', name: 'a', url: 'a', size: 1, timestamp: 1 },
	{ fileId: '2', name: 'b', url: 'b', size: 2, timestamp: 2 },
	{ fileId: '3', name: 'c', url: 'c', size: 3, timestamp: 3 },
];

test('basic', () => {
	const result = pagination(sampleFiles, 2, { page: 1 });
	expect(result).toEqual({
		data: [{ fileId: '3', name: 'c', url: 'c', size: 3, timestamp: 3 }],
		pagination: {
			current: 1,
			total: 2,
		},
	});
});

test('default page (no page provided)', () => {
	const result = pagination(sampleFiles, 2, {});
	expect(result).toEqual({
		data: [
			{ fileId: '1', name: 'a', url: 'a', size: 1, timestamp: 1 },
			{ fileId: '2', name: 'b', url: 'b', size: 2, timestamp: 2 },
		],
		pagination: {
			current: 0,
			total: 2,
		},
	});
});

test('filter option works correctly', () => {
	// Exclude file with fileId '2'
	const result = pagination(sampleFiles, 1, {
		page: 1,
		filter: (file) => file.fileId !== '2',
	});
	// Filtered list becomes [{ fileId: '1' }, { fileId: '3' }]
	// Pages: [ [{ fileId: '1' }], [{ fileId: '3' }] ]
	expect(result).toEqual({
		data: [{ fileId: '3', name: 'c', url: 'c', size: 3, timestamp: 3 }],
		pagination: {
			current: 1,
			total: 2,
		},
	});
});

test('selected option returns page containing selected file when present', () => {
	// Set selected to file with fileId '1'
	// Files are split into: page0: [file1, file2], page1: [file3]
	const result = pagination(sampleFiles, 2, {
		page: 1,
		selected: (file) => file.fileId === '1',
	});
	// file1 is already in page0 so it should return page0 without modification.
	expect(result).toEqual({
		data: [
			{ fileId: '1', name: 'a', url: 'a', size: 1, timestamp: 1 },
			{ fileId: '2', name: 'b', url: 'b', size: 2, timestamp: 2 },
		],
		pagination: {
			current: 0,
			total: 2,
		},
	});
});

test('selected option adds missing selected file when filter excludes it', () => {
	// Use filter to exclude file with fileId '3'
	// But set selected so that file '3' should be present.
	const result = pagination(
		[
			{ fileId: '1', name: 'a', url: 'a', size: 1, timestamp: 1 },
			{ fileId: '3', name: 'c', url: 'c', size: 3, timestamp: 3 },
			{ fileId: '2', name: 'b', url: 'b', size: 2, timestamp: 2 },
		],
		2,
		{
			// Even if page is provided, selected takes precedence.
			page: 0,
			filter: (file) => file.fileId !== '3',
			selected: (file) => file.fileId === '3',
		},
	);
	// After filtering, list becomes: [file1, file2]
	// Pages: Only one page: [file1, file2]
	// findIndex for selected returns -1, so targetPage = last page ([file1, file2])
	// Then file3 is found in allList and unshifted.
	expect(result).toEqual({
		data: [
			{ fileId: '3', name: 'c', url: 'c', size: 3, timestamp: 3 },
			{ fileId: '1', name: 'a', url: 'a', size: 1, timestamp: 1 },
			{ fileId: '2', name: 'b', url: 'b', size: 2, timestamp: 2 },
		],
		pagination: {
			// current remains as -1 since findIndex returned -1
			current: -1,
			total: 1,
		},
	});
});

test('large dataset pagination (within range)', () => {
	const largeSample = Array.from({ length: 1000 }, (_, idx) => ({
		fileId: (idx + 1).toString(),
		name: `file-${idx + 1}`,
		url: `url-${idx + 1}`,
		size: idx + 1,
		timestamp: idx + 1,
	}));
	const pageSize = 10;
	const targetPage = 50; // 0-indexed: 50th page
	const result = pagination(largeSample, pageSize, { page: targetPage });
	expect(result).toEqual({
		data: largeSample.slice(targetPage * pageSize, targetPage * pageSize + pageSize),
		pagination: {
			current: targetPage,
			total: 100,
		},
	});
});

test('large dataset pagination (page out-of-range returns last page)', () => {
	const largeSample = Array.from({ length: 1000 }, (_, idx) => ({
		fileId: (idx + 1).toString(),
		name: `file-${idx + 1}`,
		url: `url-${idx + 1}`,
		size: idx + 1,
		timestamp: idx + 1,
	}));
	const pageSize = 10;
	// If the page number is out of range, return the last page (current: total - 1)
	const result = pagination(largeSample, pageSize, { page: 150 });
	const lastPage = 99;
	expect(result).toEqual({
		data: largeSample.slice(lastPage * pageSize, lastPage * pageSize + pageSize),
		pagination: {
			current: lastPage,
			total: 100,
		},
	});
});
