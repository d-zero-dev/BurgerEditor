import { describe, expect, test } from 'vitest';

import { createWidthState } from './width.js';

describe('createWidthState', () => {
	describe('初期状態', () => {
		test('デフォルト値が正しく設定されている', () => {
			const state = createWidthState();

			expect(state.getAbsNumber()).toBe(100);
			expect(state.getMaxNumber()).toBe(100);
			expect(state.getScale()).toBe(100);
			expect(state.getCSSWidthUnit()).toBe('px');
			expect(state.getCSSWidthNumber()).toBe(100);
			expect(state.getCSSWidth()).toBe('100px');

			const debug = state.debug();
			expect(debug.absNumber).toBe(100);
			expect(debug.maxAbsNumber).toBe(100);
			expect(debug.relNumber).toBe(1);
			expect(debug.maxRelNumber).toBe(1);
			expect(debug.unit).toBe('px');
		});
	});

	describe('setScaleType / getScaleType / getCSSWidthUnit', () => {
		test('originalからcontainerへの切り替え', () => {
			const state = createWidthState();

			state.setScaleType('container');
			expect(state.getScaleType()).toBe('container');
			expect(state.getCSSWidthUnit()).toBe('cqi');

			const debug = state.debug();
			expect(debug.unit).toBe('cqi');
		});

		test('containerからoriginalへの切り替え', () => {
			const state = createWidthState();

			state.setScaleType('container');
			state.setScaleType('original');
			expect(state.getScaleType()).toBe('original');
			expect(state.getCSSWidthUnit()).toBe('px');

			const debug = state.debug();
			expect(debug.unit).toBe('px');
		});

		test('デフォルトはoriginal', () => {
			const state = createWidthState();

			expect(state.getScaleType()).toBe('original');
			expect(state.getCSSWidthUnit()).toBe('px');
		});
	});

	describe('setAbsNumber / getAbsNumber', () => {
		test('正常な値の設定', () => {
			const state = createWidthState();

			state.setMaxNumber(300);
			state.setAbsNumber(200);
			expect(state.getAbsNumber()).toBe(200);

			const debug = state.debug();
			expect(debug.absNumber).toBe(200);
		});

		test('最小値（1）未満の値が1に補正される', () => {
			const state = createWidthState();

			state.setAbsNumber(0);
			expect(state.getAbsNumber()).toBe(1);

			state.setAbsNumber(-10);
			expect(state.getAbsNumber()).toBe(1);
		});

		test('最大値を超える値が最大値に制限される', () => {
			const state = createWidthState();

			state.setMaxNumber(150);
			state.setAbsNumber(200);
			expect(state.getAbsNumber()).toBe(150);

			const debug = state.debug();
			expect(debug.absNumber).toBeGreaterThan(150);
			expect(state.getAbsNumber()).toBe(150);
		});
	});

	describe('setScale / getScale', () => {
		test('正常な値の設定', () => {
			const state = createWidthState();

			state.setScale(50);
			expect(state.getScale()).toBe(50);

			const debug = state.debug();
			expect(debug.relNumber).toBe(0.5);
		});

		test('最小値（1）未満の値が1に補正される', () => {
			const state = createWidthState();

			state.setScale(0);
			expect(state.getScale()).toBe(1);

			state.setScale(-10);
			expect(state.getScale()).toBe(1);
		});

		test('スケール値が四捨五入される', () => {
			const state = createWidthState();

			state.setScale(50.4);
			expect(state.getScale()).toBe(50);

			state.setScale(50.5);
			expect(state.getScale()).toBe(51);
		});

		test('最大値（100）を超える値が100に制限される', () => {
			const state = createWidthState();

			state.setScale(150);
			expect(state.getScale()).toBe(100);

			state.setScale(200);
			expect(state.getScale()).toBe(100);
		});
	});

	describe('setMaxNumber / getMaxNumber', () => {
		test('正常な値の設定', () => {
			const state = createWidthState();

			state.setMaxNumber(500);
			expect(state.getMaxNumber()).toBe(500);

			const debug = state.debug();
			expect(debug.maxAbsNumber).toBe(500);
		});

		test('最小値（1）未満の値が1に補正される', () => {
			const state = createWidthState();

			state.setMaxNumber(0);
			expect(state.getMaxNumber()).toBe(1);

			state.setMaxNumber(-10);
			expect(state.getMaxNumber()).toBe(1);
		});
	});

	describe('setNumber', () => {
		test('original（px）単位の場合、setAbsNumberが呼ばれる', () => {
			const state = createWidthState();

			state.setMaxNumber(300);
			state.setScaleType('original');
			state.setNumber(250);
			expect(state.getAbsNumber()).toBe(250);
			expect(state.getCSSWidthNumber()).toBe(250);

			const debug = state.debug();
			expect(debug.absNumber).toBe(250);
		});

		test('container（cqi）単位の場合、setScaleが呼ばれる', () => {
			const state = createWidthState();

			state.setScaleType('container');
			state.setNumber(75);
			expect(state.getScale()).toBe(75);
			expect(state.getCSSWidthNumber()).toBe(75);

			const debug = state.debug();
			expect(debug.relNumber).toBe(0.75);
		});
	});

	describe('getCSSWidth / getCSSWidthNumber / getCSSWidthMaxNumber', () => {
		test('original（px）単位の場合、絶対値が返される', () => {
			const state = createWidthState();

			state.setMaxNumber(400);
			state.setScaleType('original');
			state.setAbsNumber(300);
			expect(state.getCSSWidthNumber()).toBe(300);
			expect(state.getCSSWidth()).toBe('300px');
		});

		test('container（cqi）単位の場合、スケール値が返される', () => {
			const state = createWidthState();

			state.setScaleType('container');
			state.setScale(80);
			expect(state.getCSSWidthNumber()).toBe(80);
			expect(state.getCSSWidth()).toBe('80cqi');
		});

		test('getCSSWidthのフォーマットが正しい', () => {
			const state = createWidthState();

			state.setMaxNumber(200);
			state.setScaleType('original');
			state.setAbsNumber(150);
			expect(state.getCSSWidth()).toBe('150px');

			state.setScaleType('container');
			state.setScale(60);
			expect(state.getCSSWidth()).toBe('60cqi');
		});

		test('getCSSWidthMaxNumber: originalの場合はgetMaxNumberを返す', () => {
			const state = createWidthState();

			state.setMaxNumber(500);
			state.setScaleType('original');
			expect(state.getCSSWidthMaxNumber()).toBe(500);
		});

		test('getCSSWidthMaxNumber: containerの場合は100を返す', () => {
			const state = createWidthState();

			state.setMaxNumber(500);
			state.setScaleType('container');
			expect(state.getCSSWidthMaxNumber()).toBe(100);
		});
	});

	describe('index.tsでの使用シナリオに基づく統合テスト', () => {
		test('画像幅を最大値として設定 → 単位設定 → 絶対値設定 → CSS幅取得の流れ', () => {
			const state = createWidthState();

			// 画像幅を最大値として設定
			const imageWidth = 800;
			state.setMaxNumber(imageWidth);

			let debug = state.debug();
			expect(debug.maxAbsNumber).toBe(800);
			expect(state.getMaxNumber()).toBe(800);

			// 単位設定
			state.setScaleType('original');

			debug = state.debug();
			expect(debug.unit).toBe('px');
			expect(state.getScaleType()).toBe('original');

			// 絶対値設定
			state.setAbsNumber(imageWidth);

			debug = state.debug();
			expect(debug.absNumber).toBe(800);
			expect(state.getAbsNumber()).toBe(800);

			// CSS幅取得
			expect(state.getCSSWidthNumber()).toBe(800);
			expect(state.getCSSWidth()).toBe('800px');
		});

		test('単位切り替え時の値の変換が正しく動作する', () => {
			const state = createWidthState();

			// 画像幅を最大値として設定
			state.setMaxNumber(1000);
			state.setScaleType('original');
			state.setAbsNumber(500);

			expect(state.getCSSWidthNumber()).toBe(500);
			expect(state.getCSSWidth()).toBe('500px');

			// originalからcontainerに切り替え
			state.setScaleType('container');
			// container単位では、スケール値が返される
			// 500px / 1000px * 100 = 50%
			expect(state.getCSSWidthNumber()).toBe(50);
			expect(state.getCSSWidth()).toBe('50cqi');

			// containerからoriginalに戻す
			state.setScaleType('original');
			expect(state.getCSSWidthNumber()).toBe(500);
			expect(state.getCSSWidth()).toBe('500px');
		});

		test('初期化フロー（setMaxNumber → setScaleType → setAbsNumber）の動作確認', () => {
			const state = createWidthState();

			// 初期状態
			let debug = state.debug();
			expect(debug.absNumber).toBe(100);
			expect(debug.maxAbsNumber).toBe(100);
			expect(debug.unit).toBe('px');
			expect(state.getScaleType()).toBe('original');

			// setMaxNumber: 画像幅を最大値として設定
			const imageWidth = 1200;
			state.setMaxNumber(imageWidth);

			debug = state.debug();
			expect(debug.maxAbsNumber).toBe(1200);
			expect(state.getMaxNumber()).toBe(1200);

			// setScaleType: 単位設定
			state.setScaleType('container');

			debug = state.debug();
			expect(debug.unit).toBe('cqi');
			expect(state.getScaleType()).toBe('container');

			// setAbsNumber: 初期化時に絶対値を設定
			state.setAbsNumber(imageWidth);

			debug = state.debug();
			expect(debug.absNumber).toBe(1200);
			expect(state.getAbsNumber()).toBe(1200);

			// CSS幅の確認
			expect(state.getCSSWidthNumber()).toBe(100); // container単位なのでスケール値
			expect(state.getCSSWidth()).toBe('100cqi');
		});

		test('index.tsのupdateImage関数の初期化フローを再現', () => {
			const state = createWidthState();

			// 画像データをシミュレート
			const imageWidth = 1920;

			// 初期化時の処理順序: setMaxNumber → setScaleType → setAbsNumber
			state.setMaxNumber(imageWidth);
			state.setScaleType('original');
			state.setAbsNumber(imageWidth);

			// 初期化後の状態確認
			expect(state.getMaxNumber()).toBe(1920);
			expect(state.getAbsNumber()).toBe(1920);
			expect(state.getScaleType()).toBe('original');
			expect(state.getCSSWidthUnit()).toBe('px');
			expect(state.getCSSWidthNumber()).toBe(1920);
			expect(state.getCSSWidth()).toBe('1920px');

			const debug = state.debug();
			expect(debug.maxAbsNumber).toBe(1920);
			expect(debug.absNumber).toBe(1920);
			expect(debug.unit).toBe('px');
		});

		test('index.tsのupdateImage関数の2回目以降のフローを再現', () => {
			const state = createWidthState();

			// 初期化済みの状態をシミュレート
			state.setMaxNumber(1920);
			state.setScaleType('container');
			state.setAbsNumber(1920); // 初期化時に設定された値

			// 2回目以降: setNumberを使用して値を更新
			state.setNumber(50); // container単位なのでsetScaleが呼ばれる

			expect(state.getScale()).toBe(50);
			expect(state.getCSSWidthNumber()).toBe(50);
			expect(state.getCSSWidth()).toBe('50cqi');

			const debug = state.debug();
			expect(debug.relNumber).toBe(0.5);
			expect(debug.unit).toBe('cqi');
			expect(state.getScaleType()).toBe('container');
		});
	});
});
