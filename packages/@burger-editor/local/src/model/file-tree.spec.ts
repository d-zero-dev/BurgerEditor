import type { DirInfo, FileInfo } from './file-tree.js';

import { describe, expect, test } from 'vitest';

import { buildFileTreeFromLogicalPaths } from './file-tree.js';

describe('buildFileTreeFromLogicalPaths', () => {
	test('returns empty tree for empty input', () => {
		expect(buildFileTreeFromLogicalPaths([])).toEqual([]);
	});

	test('builds a single FileInfo for a top-level path', () => {
		const tree = buildFileTreeFromLogicalPaths(['about.html']);
		expect(tree).toHaveLength(1);
		const node = tree[0] as FileInfo;
		expect(node.name).toBe('about.html');
		expect(node.path).toBe('/about.html');
		expect('files' in node).toBe(false);
	});

	test('builds nested DirInfo structure for nested path', () => {
		const tree = buildFileTreeFromLogicalPaths(['foo/bar/about.html']);
		expect(tree).toHaveLength(1);
		const foo = tree[0] as DirInfo;
		expect(foo.name).toBe('foo');
		expect(foo.path).toBe('/foo');
		expect(foo.files).toHaveLength(1);

		const bar = foo.files[0] as DirInfo;
		expect(bar.name).toBe('bar');
		expect(bar.path).toBe('/foo/bar');
		expect(bar.files).toHaveLength(1);

		const file = bar.files[0] as FileInfo;
		expect(file.name).toBe('about.html');
		expect(file.path).toBe('/foo/bar/about.html');
	});

	test('groups siblings under shared directories', () => {
		const tree = buildFileTreeFromLogicalPaths([
			'foo/a.html',
			'foo/b.html',
			'bar/c.html',
		]);
		const map = Object.fromEntries(tree.map((node) => [node.name, node]));
		expect(Object.keys(map).toSorted()).toEqual(['bar', 'foo']);
		const foo = map.foo as DirInfo;
		expect(foo.files.map((f) => f.name).toSorted()).toEqual(['a.html', 'b.html']);
		const bar = map.bar as DirInfo;
		expect(bar.files.map((f) => f.name)).toEqual(['c.html']);
	});

	test('handles a mix of top-level files and nested files', () => {
		const tree = buildFileTreeFromLogicalPaths(['index.html', 'foo/a.html']);
		const names = tree.map((node) => node.name).toSorted();
		expect(names).toEqual(['foo', 'index.html']);
	});

	test('tolerates leading slash in logical paths', () => {
		const tree = buildFileTreeFromLogicalPaths(['/foo/a.html']);
		const foo = tree[0] as DirInfo;
		expect(foo.name).toBe('foo');
		expect(foo.files[0]?.name).toBe('a.html');
	});

	test('propagates id to FileInfo when given LogicalEntry objects', () => {
		const tree = buildFileTreeFromLogicalPaths([
			{ logicalPath: 'foo/a.html', id: '42.html' },
			{ logicalPath: 'b.html', id: '7.html' },
		]);
		const foo = tree[0] as DirInfo;
		expect((foo.files[0] as FileInfo).id).toBe('42.html');
		const b = tree[1] as FileInfo;
		expect(b.id).toBe('7.html');
	});

	test('omits id on leaves when input is a bare string', () => {
		const tree = buildFileTreeFromLogicalPaths(['about.html']);
		const file = tree[0] as FileInfo;
		expect(file.id).toBeUndefined();
	});
});
