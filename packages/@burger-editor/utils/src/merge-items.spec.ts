import type { SelectableValue } from '@burger-editor/core';

import { describe, expect, test } from 'vitest';

import { mergeItems, type Mergeable } from './merge-items.js';

// テスト用の型定義 - 実際の使用例
type SelectionOption = Mergeable<Partial<SelectableValue> & { value: string }>;

describe('mergeItemsでSelectableValueを扱う', () => {
	const defaultOptions: SelectableValue[] = [
		{ value: 'link', label: 'リンク' },
		{ value: 'em', label: '強調リンク' },
		{ value: 'external', label: '外部リンク' },
		{ value: 'back', label: '戻る' },
	];

	test('マージ設定がない場合はデフォルトをそのまま返す', () => {
		const result = mergeItems(defaultOptions, undefined, 'value');
		expect(result).toEqual(defaultOptions);
		expect(result).not.toBe(defaultOptions); // 新しい配列であることを確認
	});

	test('空のマージ設定の場合はデフォルトをそのまま返す', () => {
		const result = mergeItems(defaultOptions, [], 'value');
		expect(result).toEqual(defaultOptions);
	});

	test('既存のラベルを更新する', () => {
		const mergeConfig: SelectionOption[] = [{ value: 'link', label: 'リンクボタン' }];

		const result = mergeItems(defaultOptions, mergeConfig, 'value');
		expect(result).toEqual([
			{ value: 'link', label: 'リンクボタン' },
			{ value: 'em', label: '強調リンク' },
			{ value: 'external', label: '外部リンク' },
			{ value: 'back', label: '戻る' },
		]);
	});

	test('既存の選択肢を削除する', () => {
		const mergeConfig: SelectionOption[] = [{ value: 'em', delete: true }];

		const result = mergeItems(defaultOptions, mergeConfig, 'value');
		expect(result).toEqual([
			{ value: 'link', label: 'リンク' },
			{ value: 'external', label: '外部リンク' },
			{ value: 'back', label: '戻る' },
		]);
	});

	test('新しい選択肢を追加する', () => {
		const mergeConfig: SelectionOption[] = [
			{ value: 'primary', label: 'プライマリボタン' },
			{ value: 'secondary', label: 'セカンダリボタン' },
		];

		const result = mergeItems(
			defaultOptions,
			mergeConfig,
			'value',
			(item) => Boolean(item.label), // ラベル必須
		);
		expect(result).toEqual([
			{ value: 'link', label: 'リンク' },
			{ value: 'em', label: '強調リンク' },
			{ value: 'external', label: '外部リンク' },
			{ value: 'back', label: '戻る' },
			{ value: 'primary', label: 'プライマリボタン' },
			{ value: 'secondary', label: 'セカンダリボタン' },
		]);
	});

	test('複合操作: 更新・削除・追加を同時に行う', () => {
		const mergeConfig: SelectionOption[] = [
			{ value: 'link', label: 'リンクボタン' }, // 更新
			{ value: 'em', delete: true }, // 削除
			{ value: 'primary', label: 'プライマリボタン' }, // 追加
		];

		const result = mergeItems(
			defaultOptions,
			mergeConfig,
			'value',
			(item) => Boolean(item.label), // ラベル必須
		);
		expect(result).toEqual([
			{ value: 'link', label: 'リンクボタン' },
			{ value: 'external', label: '外部リンク' },
			{ value: 'back', label: '戻る' },
			{ value: 'primary', label: 'プライマリボタン' },
		]);
	});

	test('ラベルが指定されていない新規追加は無視される', () => {
		const mergeConfig: SelectionOption[] = [
			{ value: 'primary' }, // ラベルなし
		];

		const result = mergeItems(
			defaultOptions,
			mergeConfig,
			'value',
			(item) => Boolean(item.label), // ラベル必須
		);
		expect(result).toEqual(defaultOptions);
	});

	test('ラベルが指定されていない既存の更新は無視される', () => {
		const mergeConfig: SelectionOption[] = [
			{ value: 'link' }, // ラベルなし
		];

		const result = mergeItems(
			defaultOptions,
			mergeConfig,
			'value',
			(item) => Boolean(item.label), // ラベル必須
		);
		expect(result).toEqual(defaultOptions);
	});

	test('存在しない選択肢の削除は無視される', () => {
		const mergeConfig: SelectionOption[] = [{ value: 'nonexistent', delete: true }];

		const result = mergeItems(defaultOptions, mergeConfig, 'value');
		expect(result).toEqual(defaultOptions);
	});

	test('同じvalueに対する複数の操作は最後の操作が適用される', () => {
		const mergeConfig: SelectionOption[] = [
			{ value: 'link', label: '最初の更新' },
			{ value: 'link', label: '最後の更新' },
		];

		const result = mergeItems(defaultOptions, mergeConfig, 'value');
		expect(result[0]).toEqual({ value: 'link', label: '最後の更新' });
	});

	test('削除後の再追加', () => {
		const mergeConfig: SelectionOption[] = [
			{ value: 'link', delete: true }, // 削除
			{ value: 'link', label: '再追加されたリンク' }, // 再追加
		];

		const result = mergeItems(
			defaultOptions,
			mergeConfig,
			'value',
			(item) => Boolean(item.label), // ラベル必須
		);
		expect(result).toEqual([
			{ value: 'em', label: '強調リンク' },
			{ value: 'external', label: '外部リンク' },
			{ value: 'back', label: '戻る' },
			{ value: 'link', label: '再追加されたリンク' },
		]);
	});
});

describe('mergeItems汎用関数のテスト', () => {
	interface User extends Record<string, unknown> {
		id: string;
		name: string;
		email?: string;
	}

	test('独自型でのマージが正常に動作する', () => {
		const defaultUsers: User[] = [
			{ id: '1', name: 'Alice', email: 'alice@example.com' },
			{ id: '2', name: 'Bob' },
		];

		const mergeConfig: Mergeable<Partial<User> & { id: string }>[] = [
			{ id: '1', name: 'Alice Smith' }, // 更新
			{ id: '2', delete: true }, // 削除
			{ id: '3', name: 'Charlie', email: 'charlie@example.com' }, // 追加
		];

		const result = mergeItems(defaultUsers, mergeConfig, 'id');

		expect(result).toEqual([
			{ id: '1', name: 'Alice Smith', email: 'alice@example.com' },
			{ id: '3', name: 'Charlie', email: 'charlie@example.com' },
		]);
	});

	test('バリデーション関数が正常に動作する', () => {
		interface Product extends Record<string, unknown> {
			code: string;
			name: string;
			price: number;
		}

		const defaultProducts: Product[] = [{ code: 'A001', name: 'Product A', price: 100 }];

		const mergeConfig: Mergeable<Partial<Product> & { code: string }>[] = [
			{ code: 'B001', name: 'Product B' }, // priceなし（無効）
			{ code: 'C001', name: 'Product C', price: 200 }, // 有効
		];

		const result = mergeItems(
			defaultProducts,
			mergeConfig,
			'code',
			(item) => typeof item.price === 'number', // price必須
		);

		expect(result).toEqual([
			{ code: 'A001', name: 'Product A', price: 100 },
			{ code: 'C001', name: 'Product C', price: 200 },
		]);
	});

	test('数値キーでも動作する', () => {
		interface Item extends Record<string, unknown> {
			id: string;
			priority: number;
		}

		const defaultItems: Item[] = [
			{ id: 'item1', priority: 1 },
			{ id: 'item2', priority: 2 },
		];

		const mergeConfig: Mergeable<Partial<Item> & { id: string }>[] = [
			{ id: 'item1', priority: 10 }, // 更新
			{ id: 'item3', priority: 3 }, // 追加
		];

		const result = mergeItems(defaultItems, mergeConfig, 'id');

		expect(result).toEqual([
			{ id: 'item1', priority: 10 },
			{ id: 'item2', priority: 2 },
			{ id: 'item3', priority: 3 },
		]);
	});
});

describe('Mergeable型の汎用性テスト', () => {
	test('独自のオブジェクト型でMergeableが使用できる', () => {
		interface CustomType extends Record<string, unknown> {
			key: string;
			value: number;
		}

		const mergeableItem: Mergeable<CustomType> = {
			key: 'test',
			value: 42,
			delete: true,
		};

		expect(mergeableItem.key).toBe('test');
		expect(mergeableItem.value).toBe(42);
		expect(mergeableItem.delete).toBe(true);
	});

	test('SelectableValue以外の型でもMergeableが機能する', () => {
		interface Config extends Record<string, unknown> {
			name: string;
			enabled: boolean;
		}

		const mergeableConfig: Mergeable<Config> = {
			name: 'feature-toggle',
			enabled: false,
		};

		expect(mergeableConfig.name).toBe('feature-toggle');
		expect(mergeableConfig.enabled).toBe(false);
		expect(mergeableConfig.delete).toBeUndefined();
	});
});
