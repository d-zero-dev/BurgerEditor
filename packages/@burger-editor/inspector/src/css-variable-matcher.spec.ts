import { test, expect, describe } from 'vitest';

import { parseSearchQuery, matchesSearchQuery } from './css-variable-matcher.js';

describe('parseSearchQuery', () => {
	test('parses simple query format', () => {
		const result = parseSearchQuery('margin=normal');
		expect(result.category).toBe('margin');
		expect(result.values).toEqual(['normal']);
		expect(result.isWildcard).toBe(false);
		expect(result.originalQuery).toBe('margin=normal');
	});

	test('parses query with hyphenated category', () => {
		const result = parseSearchQuery('bg-color=blue');
		expect(result.category).toBe('bg-color');
		expect(result.values).toEqual(['blue']);
	});

	test('parses wildcard query', () => {
		const result = parseSearchQuery('margin=*');
		expect(result.category).toBe('margin');
		expect(result.values).toEqual(['*']);
		expect(result.isWildcard).toBe(true);
	});

	test('parses OR values (comma-separated)', () => {
		const result = parseSearchQuery('margin=normal,large,xlarge');
		expect(result.category).toBe('margin');
		expect(result.values).toEqual(['normal', 'large', 'xlarge']);
		expect(result.isWildcard).toBe(false);
	});

	test('trims whitespace in category and values', () => {
		const result = parseSearchQuery('  margin  =  normal  ,  large  ');
		expect(result.category).toBe('margin');
		expect(result.values).toEqual(['normal', 'large']);
	});

	test('throws error on invalid format (no equals sign)', () => {
		expect(() => parseSearchQuery('invalid')).toThrow('Invalid query format');
	});

	test('throws error on invalid format (empty category)', () => {
		expect(() => parseSearchQuery('=normal')).toThrow('Invalid query format');
	});

	test('throws error on invalid format (empty value)', () => {
		expect(() => parseSearchQuery('margin=')).toThrow('Invalid query format');
	});
});

describe('matchesSearchQuery', () => {
	test('matches single exact value', () => {
		const styleOptions = { margin: 'normal', 'bg-color': 'blue' };
		const params = {
			category: 'margin',
			values: ['normal'],
			isWildcard: false,
			originalQuery: 'margin=normal',
		};

		expect(matchesSearchQuery(styleOptions, params)).toBe(true);
	});

	test('does not match different value', () => {
		const styleOptions = { margin: 'large' };
		const params = {
			category: 'margin',
			values: ['normal'],
			isWildcard: false,
			originalQuery: 'margin=normal',
		};

		expect(matchesSearchQuery(styleOptions, params)).toBe(false);
	});

	test('does not match missing category', () => {
		const styleOptions = { 'bg-color': 'blue' };
		const params = {
			category: 'margin',
			values: ['normal'],
			isWildcard: false,
			originalQuery: 'margin=normal',
		};

		expect(matchesSearchQuery(styleOptions, params)).toBe(false);
	});

	test('matches wildcard for any value', () => {
		const styleOptions1 = { margin: 'normal' };
		const styleOptions2 = { margin: 'large' };
		const styleOptions3 = { margin: 'xlarge' };
		const params = {
			category: 'margin',
			values: ['*'],
			isWildcard: true,
			originalQuery: 'margin=*',
		};

		expect(matchesSearchQuery(styleOptions1, params)).toBe(true);
		expect(matchesSearchQuery(styleOptions2, params)).toBe(true);
		expect(matchesSearchQuery(styleOptions3, params)).toBe(true);
	});

	test('wildcard does not match missing category', () => {
		const styleOptions = { 'bg-color': 'blue' };
		const params = {
			category: 'margin',
			values: ['*'],
			isWildcard: true,
			originalQuery: 'margin=*',
		};

		expect(matchesSearchQuery(styleOptions, params)).toBe(false);
	});

	test('matches OR values', () => {
		const styleOptions1 = { margin: 'normal' };
		const styleOptions2 = { margin: 'large' };
		const styleOptions3 = { margin: 'xlarge' };
		const params = {
			category: 'margin',
			values: ['normal', 'large'],
			isWildcard: false,
			originalQuery: 'margin=normal,large',
		};

		expect(matchesSearchQuery(styleOptions1, params)).toBe(true);
		expect(matchesSearchQuery(styleOptions2, params)).toBe(true);
		expect(matchesSearchQuery(styleOptions3, params)).toBe(false);
	});

	test('handles hyphenated category names', () => {
		const styleOptions = { 'bg-color': 'blue', margin: 'normal' };
		const params = {
			category: 'bg-color',
			values: ['blue'],
			isWildcard: false,
			originalQuery: 'bg-color=blue',
		};

		expect(matchesSearchQuery(styleOptions, params)).toBe(true);
	});

	test('handles empty style options', () => {
		const styleOptions = {};
		const params = {
			category: 'margin',
			values: ['normal'],
			isWildcard: false,
			originalQuery: 'margin=normal',
		};

		expect(matchesSearchQuery(styleOptions, params)).toBe(false);
	});

	test('is case-sensitive for values', () => {
		const styleOptions = { margin: 'Normal' };
		const params = {
			category: 'margin',
			values: ['normal'],
			isWildcard: false,
			originalQuery: 'margin=normal',
		};

		expect(matchesSearchQuery(styleOptions, params)).toBe(false);
	});
});
