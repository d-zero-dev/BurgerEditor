import type { CarouselData } from './definition.js';
import type { BurgerEditorEngine, FileListResult } from '@burger-editor/core';

import { createMockEngine as createBaseMockEngine } from '@burger-editor/client/testing';
import { EngineProvider } from '@burger-editor/client/ui';
import { narrowElement } from '@burger-editor/utils';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { imageDefinition } from '../image/definition.js';

import { CarouselEditor } from './editor.js';
import { defaultSlide, getSlides, replaceSlide } from './slides.js';

import carouselItemSeed from './index.js';

const DEFAULT_SLIDE = defaultSlide();

const testConfig = {
	classList: [],
	googleMapsApiKey: null,
	sampleImagePath: '/img/sample.png',
	sampleFilePath: '/pdf/sample.pdf',
	stylesheets: [],
} as const;

/**
 * 2枚構成の初期エディタ状態。pathは空にして画像ロードのリクエスト自体を
 * 発生させない（実ブラウザ実行でもネットワーク依存を作らないため）
 */
function createInitialState(): CarouselData {
	const base = carouselItemSeed.toEditorState!(
		{
			autoplay: false,
			loop: false,
			perView: 1,
			arrows: true,
			dots: true,
			effect: 'slide',
			path: [''],
			alt: [''],
			width: [400],
			height: [300],
			loading: ['lazy'],
			spPath: [null],
			spMedia: [''],
			spWidth: [null],
			spHeight: [null],
			style: [DEFAULT_SLIDE.style],
			scale: [100],
			scaleType: ['container'],
			aspectRatio: ['revert'],
			caption: ['A'],
			node: ['div'],
			href: [''],
			target: [null],
			command: [null],
		},
		testConfig,
	);
	return replaceSlide(
		{
			...base,
			path: ['', ''],
			alt: ['', ''],
			width: [400, 400],
			height: [300, 300],
			loading: ['lazy', 'lazy'],
			spPath: [null, null],
			spMedia: ['', ''],
			spWidth: [null, null],
			spHeight: [null, null],
			style: [DEFAULT_SLIDE.style, DEFAULT_SLIDE.style],
			scale: [100, 100],
			scaleType: ['container', 'container'],
			aspectRatio: ['revert', 'revert'],
			caption: ['A', 'B'],
			node: ['div', 'div'],
			href: ['', ''],
			target: [null, null],
			command: [null, null],
		},
		1,
		{ ...DEFAULT_SLIDE, caption: 'B' },
	);
}

/**
 * Invoker Commands API の合成。他の spec 群と揃えて、`commandfor` 先へ
 * 合成 `command` イベントを送ってボタン起動を再現する
 * @param button
 */
function invokeCommand(button: HTMLElement) {
	const targetId = button.getAttribute('commandfor');
	const target = targetId ? document.getElementById(targetId) : null;
	if (!target) {
		throw new Error('commandfor target not found');
	}
	const event = new Event('command');
	Object.assign(event, { command: button.getAttribute('command'), source: button });
	act(() => {
		target.dispatchEvent(event);
	});
}

/**
 * FileList の `use()` は Suspense の再開が安定しないため、最初から解決済みの
 * thenable を返す（image の editor.spec と同じ理由）
 */
function resolvedFileList(): Promise<FileListResult> {
	const result: FileListResult = {
		error: false,
		data: [],
		pagination: { current: 0, total: 1 },
	};
	const resolved = Promise.resolve(result) as Promise<FileListResult> & {
		status?: 'fulfilled';
		value?: FileListResult;
	};
	resolved.status = 'fulfilled';
	resolved.value = result;
	return resolved;
}

/**
 * 内側のダイアログは `engine.el` へ portal で描かれ、`showModal()` は
 * document に接続されていない要素では失敗する。`engine.el` を接続しておく
 */
function createMockEngine() {
	const engine = createBaseMockEngine({
		serverAPI: { getFileList: () => resolvedFileList() },
		config: testConfig,
	});
	document.body.append(engine.el);
	return engine;
}

/**
 * state/setState を実際の React state として供給するテストハーネス
 * @param root0
 * @param root0.engine
 * @param root0.onState
 * @param root0.initial
 * @param root0.onSetState
 */
function Harness({
	engine,
	onState,
	initial,
	onSetState,
}: {
	readonly engine: BurgerEditorEngine;
	readonly onState: (state: CarouselData) => void;
	readonly initial?: CarouselData;
	/** この editor の操作を通さずに state を差し替えるテスト用に、`setState` を渡す */
	readonly onSetState?: (setState: (next: CarouselData) => void) => void;
}) {
	const [state, setState] = useState<CarouselData>(() => initial ?? createInitialState());
	useEffect(() => {
		onSetState?.(setState);
	}, [onSetState]);
	onState(state);
	return (
		<EngineProvider engine={engine}>
			<CarouselEditor state={state} setState={setState} item={{} as never} />
		</EngineProvider>
	);
}

/**
 * srcを設定してもload/errorを発火しない`Image`スタブ
 */
class SilentImage extends EventTarget {
	naturalHeight = 100;
	naturalWidth = 100;

	set src(_value: string) {
		// 意図的に何もしない
	}
}

/**
 * 内側のスライド編集ダイアログ
 */
function getSlideDialog(): HTMLDialogElement {
	const dialog = document
		.querySelector('[data-bge-component="carousel-slide-dialog"]')
		?.closest('dialog');
	if (!dialog) {
		throw new Error('carousel-slide dialog not found');
	}
	return dialog;
}

/**
 * ボタンを押し、結果の表明が成り立つまで待つ。確定（`action` の await）と
 * `<dialog>` の close は非同期に進む。待機を act の中に入れると、act を
 * 抜けるまで React の更新が反映されず確定が進まないので、待機は act の外で行う
 * @param button
 * @param assertion
 */
async function clickAndWait(button: HTMLElement, assertion: () => void) {
	await act(() => {
		fireEvent.click(button);
	});
	await vi.waitFor(assertion);
}

afterEach(cleanup);

describe('CarouselEditor', () => {
	let latest: CarouselData;
	let engine: BurgerEditorEngine;

	beforeEach(() => {
		document.body.innerHTML = '';
		vi.stubGlobal('Image', SilentImage);
		engine = createMockEngine();
		render(
			<Harness
				engine={engine}
				onState={(state) => {
					latest = state;
				}}
			/>,
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test('スライドを一覧し、最後の1枚は削除できない', () => {
		expect(screen.getAllByRole('button', { name: /^スライド\d+を編集$/ })).toHaveLength(
			2,
		);

		invokeCommand(screen.getAllByRole('button', { name: '削除' })[1]!);
		expect(getSlides(latest)).toHaveLength(1);

		expect(
			narrowElement(
				screen.getByRole('button', { name: '削除' }),
				HTMLButtonElement,
				'削除',
			).disabled,
		).toBe(true);
	});

	test('画像のないスライドは、画像と同じ大きさのプレースホルダーで領域を確保する', () => {
		// 初期状態は2枚とも画像なし
		expect(document.querySelectorAll('[data-bge-thumbnail-placeholder]')).toHaveLength(2);
		for (const button of screen.getAllByRole('button', { name: /^スライド\d+を編集$/ })) {
			expect(button.querySelector('img')).toBeNull();
		}
	});

	test('並べ替えで入れ替わり、端のボタンは無効になる', () => {
		invokeCommand(screen.getAllByRole('button', { name: '後ろへ' })[0]!);

		expect(getSlides(latest).map((s) => s.caption)).toStrictEqual(['B', 'A']);
		expect(
			narrowElement(
				screen.getAllByRole('button', { name: '前へ' })[0]!,
				HTMLButtonElement,
				'前へ',
			).disabled,
		).toBe(true);
	});

	test('「編集」で内側のダイアログが開き、image と同じ編集フォームが出る', () => {
		expect(getSlideDialog().open).toBe(false);

		invokeCommand(screen.getByRole('button', { name: 'スライド2を編集' }));

		expect(getSlideDialog().open).toBe(true);
		expect(screen.getByLabelText('キャプション')).toBeDefined();
		expect(screen.getByLabelText('メディアクエリー')).toBeDefined();
	});

	test('内側の「決定」で外側の state のそのスライドだけが変わり、保存はされない', async () => {
		const save = vi.spyOn(engine, 'save');

		invokeCommand(screen.getByRole('button', { name: 'スライド2を編集' }));
		fireEvent.change(screen.getByLabelText('キャプション'), {
			target: { value: '変更後' },
		});
		await clickAndWait(screen.getByRole('button', { name: '決定' }), () => {
			expect(getSlides(latest).map((s) => s.caption)).toStrictEqual(['A', '変更後']);
		});

		expect(getSlideDialog().open).toBe(false);
		expect(save).not.toHaveBeenCalled();
	});

	test('内側の「キャンセル」では外側の state は変わらない', async () => {
		invokeCommand(screen.getByRole('button', { name: 'スライド1を編集' }));
		fireEvent.change(screen.getByLabelText('キャプション'), {
			target: { value: '変更後' },
		});
		await clickAndWait(screen.getByRole('button', { name: 'キャンセル' }), () => {
			expect(getSlideDialog().open).toBe(false);
		});

		expect(getSlides(latest).map((s) => s.caption)).toStrictEqual(['A', 'B']);
	});

	test('追加するスライドは、確定するまで state に入らず、閉じても何も残らない', async () => {
		invokeCommand(screen.getByRole('button', { name: 'スライドを追加' }));
		expect(getSlideDialog().open).toBe(true);
		// 開いている間も、一覧にも保存対象にも入っていない
		expect(getSlides(latest)).toHaveLength(2);
		expect(screen.getAllByRole('button', { name: /^スライド\d+を編集$/ })).toHaveLength(
			2,
		);

		await clickAndWait(screen.getByRole('button', { name: 'キャンセル' }), () => {
			expect(getSlideDialog().open).toBe(false);
		});

		expect(getSlides(latest)).toHaveLength(2);
	});

	test('並べ替えても、行の DOM はスライドに追従する', () => {
		const list = screen.getAllByRole('list')[0]!;
		const firstRow = screen
			.getByRole('button', { name: 'スライド1を編集' })
			.closest('li')!;
		expect(list.children[0]).toBe(firstRow);

		invokeCommand(screen.getAllByRole('button', { name: '後ろへ' })[0]!);

		// 位置ではなく、スライドごとに行が保たれる（フォーカスや読み込み中の
		// サムネイルが、移したスライドと一緒に動く）
		expect(list.children[1]).toBe(firstRow);
	});

	test('追加したスライドは、「決定」で残る', async () => {
		invokeCommand(screen.getByRole('button', { name: 'スライドを追加' }));
		fireEvent.change(screen.getByLabelText('キャプション'), {
			target: { value: 'C' },
		});
		await clickAndWait(screen.getByRole('button', { name: '決定' }), () => {
			expect(getSlides(latest).map((s) => s.caption)).toStrictEqual(['A', 'B', 'C']);
		});
	});

	test('スライドの名前は alt に追従し、alt が空なら「スライドN」に戻る', async () => {
		// 初期状態は alt が空なので「スライドN」
		expect(screen.getByText('スライド1')).toBeDefined();
		expect(screen.getByText('スライド2')).toBeDefined();

		invokeCommand(screen.getByRole('button', { name: 'スライド2を編集' }));
		fireEvent.change(screen.getByLabelText('画像の代替テキスト(alt)'), {
			target: { value: '夕焼けの海岸' },
		});
		await clickAndWait(screen.getByRole('button', { name: '決定' }), () => {
			expect(screen.getByText('2. 夕焼けの海岸')).toBeDefined();
		});

		// 番号は残るので、並べ替えても位置が分かる。ボタンの名前にも alt が入る
		expect(screen.getByText('スライド1')).toBeDefined();
		expect(
			screen.getByRole('button', { name: 'スライド2「夕焼けの海岸」を編集' }),
		).toBeDefined();
	});

	test('先頭を削除すると、残るスライドと行の DOM がそのまま繰り上がる', () => {
		const list = screen.getAllByRole('list')[0]!;
		const secondRow = screen
			.getByRole('button', { name: 'スライド2を編集' })
			.closest('li')!;

		invokeCommand(screen.getAllByRole('button', { name: '削除' })[0]!);

		expect(getSlides(latest).map((s) => s.caption)).toStrictEqual(['B']);
		expect(list.children).toHaveLength(1);
		expect(list.children[0]).toBe(secondRow);
	});

	test('スライドを追加しても、既存の行の DOM は保たれる', async () => {
		const list = screen.getAllByRole('list')[0]!;
		const firstRow = list.children[0];

		invokeCommand(screen.getByRole('button', { name: 'スライドを追加' }));
		await clickAndWait(screen.getByRole('button', { name: '決定' }), () => {
			// Behavior change: キャプションも alt も空のスライドは追加できない（確定が拒まれ、2 枚のまま）
			expect(screen.getByRole('alert').textContent).toContain(
				'キャプションも代替テキスト(alt)も空',
			);
			// expect(getSlides(latest)).toHaveLength(3); // previous
		});
		expect(getSlides(latest)).toHaveLength(2);

		expect(list.children[0]).toBe(firstRow);
		// expect(list.children).toHaveLength(3); // previous
		expect(list.children).toHaveLength(2);
	});

	test('名前を付けてスライドを追加しても、既存の行の DOM は保たれる', async () => {
		const list = screen.getAllByRole('list')[0]!;
		const firstRow = list.children[0];

		invokeCommand(screen.getByRole('button', { name: 'スライドを追加' }));
		fireEvent.change(screen.getByLabelText('キャプション'), { target: { value: 'C' } });
		await clickAndWait(screen.getByRole('button', { name: '決定' }), () => {
			expect(getSlides(latest)).toHaveLength(3);
		});

		expect(list.children[0]).toBe(firstRow);
		expect(list.children).toHaveLength(3);
	});

	test('外から state が差し替わってスライドの数が変わっても、行は新しい state に揃う', async () => {
		cleanup();
		document.body.innerHTML = '';
		engine = createMockEngine();
		let replace: ((next: CarouselData) => void) | undefined;
		render(
			<Harness
				engine={engine}
				onState={(state) => {
					latest = state;
				}}
				onSetState={(setState) => {
					replace = setState;
				}}
			/>,
		);
		const list = screen.getAllByRole('list')[0]!;
		expect(list.children).toHaveLength(2);

		// この editor の操作を通さずに、スライドを 3 枚に差し替える
		const three = replaceSlide(createInitialState(), 0, {
			...DEFAULT_SLIDE,
			caption: 'X',
		});
		await act(() => {
			replace?.({
				...three,
				path: ['', '', ''],
				alt: ['', '', ''],
				width: [400, 400, 400],
				height: [300, 300, 300],
				loading: ['lazy', 'lazy', 'lazy'],
				spPath: [null, null, null],
				spMedia: [null, null, null],
				spWidth: [null, null, null],
				spHeight: [null, null, null],
				style: [DEFAULT_SLIDE.style, DEFAULT_SLIDE.style, DEFAULT_SLIDE.style],
				scale: [100, 100, 100],
				scaleType: ['container', 'container', 'container'],
				aspectRatio: ['revert', 'revert', 'revert'],
				caption: ['X', 'Y', 'Z'],
				node: ['div', 'div', 'div'],
				href: ['', '', ''],
				target: [null, null, null],
				command: [null, null, null],
			});
		});

		expect(list.children).toHaveLength(3);
		// 行が増えたあとの並べ替えも、新しい行の数で動く
		invokeCommand(screen.getAllByRole('button', { name: '後ろへ' })[0]!);
		expect(getSlides(latest).map((s) => s.caption)).toStrictEqual(['Y', 'X', 'Z']);
	});

	test('最後の1枚は、削除の command が直接届いても削除されない', () => {
		invokeCommand(screen.getAllByRole('button', { name: '削除' })[1]!);
		expect(getSlides(latest)).toHaveLength(1);

		// ボタンは disabled だが、command は宛先へ直接送れる
		const last = screen.getByRole('button', { name: '削除' });
		const targetId = last.getAttribute('commandfor') ?? '';
		const event = new Event('command');
		Object.assign(event, { command: last.getAttribute('command'), source: last });
		act(() => {
			document.getElementById(targetId)?.dispatchEvent(event);
		});

		expect(getSlides(latest)).toHaveLength(1);
	});

	test.each(['--carousel-edit', '--carousel-remove', '--carousel-up', '--carousel-down'])(
		'%s は、index が無い・整数でない・範囲外の送信元からは何もしない',
		async (command) => {
			const root = screen
				.getByRole('button', { name: 'スライド1を編集' })
				.getAttribute('commandfor');
			const target = document.getElementById(root ?? '');
			const before = latest;

			for (const value of [undefined, 'abc', '1.5', '-1', '9']) {
				const source = document.createElement('button');
				if (value !== undefined) {
					source.value = value;
				}
				const event = new Event('command');
				Object.assign(event, { command, source });
				await act(() => {
					target?.dispatchEvent(event);
				});
			}

			expect(latest).toBe(before);
			expect(getSlideDialog().open).toBe(false);
		},
	);

	test('SP画像とメディアクエリーは内側のフォームに出て、編集して決定すると反映される', async () => {
		cleanup();
		document.body.innerHTML = '';
		engine = createMockEngine();
		const withSp = replaceSlide(createInitialState(), 0, {
			...DEFAULT_SLIDE,
			path: '/pc.png',
			spPath: '/sp.png',
			spMedia: '(max-width: 767px)',
			caption: 'A',
		});
		render(
			<Harness
				engine={engine}
				initial={withSp}
				onState={(state) => {
					latest = state;
				}}
			/>,
		);

		invokeCommand(screen.getByRole('button', { name: 'スライド1を編集' }));
		invokeCommand(screen.getByRole('tab', { name: '画像2' }));
		const media = narrowElement(
			screen.getByLabelText('メディアクエリー'),
			HTMLInputElement,
			'メディアクエリー',
		);
		expect(media.value).toBe('(max-width: 767px)');

		fireEvent.change(media, { target: { value: '(max-width: 600px)' } });
		await clickAndWait(screen.getByRole('button', { name: '決定' }), () => {
			expect(getSlides(latest)[0]).toMatchObject({
				path: '/pc.png',
				spPath: '/sp.png',
				spMedia: '(max-width: 600px)',
			});
		});
	});

	test('確定に失敗したら、内側のダイアログは開いたままエラーを出し、state は変わらない', async () => {
		vi.spyOn(imageDefinition, 'toItemData').mockRejectedValueOnce(
			new Error('変換に失敗'),
		);

		invokeCommand(screen.getByRole('button', { name: 'スライド1を編集' }));
		fireEvent.change(screen.getByLabelText('キャプション'), {
			target: { value: '失敗する編集' },
		});
		await act(() => {
			fireEvent.click(screen.getByRole('button', { name: '決定' }));
		});

		await vi.waitFor(() => {
			expect(screen.getByRole('alert').textContent).toContain('変換に失敗');
		});
		expect(getSlideDialog().open).toBe(true);
		expect(getSlides(latest).map((s) => s.caption)).toStrictEqual(['A', 'B']);
	});

	test('キャプションも alt も空にして決定すると、内側のダイアログは開いたまま理由を出し、state は変わらない', async () => {
		invokeCommand(screen.getByRole('button', { name: 'スライド1を編集' }));
		fireEvent.change(screen.getByLabelText('キャプション'), { target: { value: '' } });
		await act(() => {
			fireEvent.click(screen.getByRole('button', { name: '決定' }));
		});

		await vi.waitFor(() => {
			expect(screen.getByRole('alert').textContent).toContain(
				'キャプションも代替テキスト(alt)も空',
			);
		});
		expect(getSlideDialog().open).toBe(true);
		expect(getSlides(latest).map((s) => s.caption)).toStrictEqual(['A', 'B']);
	});

	test('キャプションを空にしても、alt があれば決定できる', async () => {
		invokeCommand(screen.getByRole('button', { name: 'スライド1を編集' }));
		fireEvent.change(screen.getByLabelText('キャプション'), { target: { value: '' } });
		fireEvent.change(screen.getByLabelText('画像の代替テキスト(alt)'), {
			target: { value: '春の庭' },
		});
		await clickAndWait(screen.getByRole('button', { name: '決定' }), () => {
			expect(getSlides(latest).map((s) => s.alt)).toStrictEqual(['春の庭', '']);
		});
		expect(getSlides(latest).map((s) => s.caption)).toStrictEqual(['', 'B']);
	});

	test('リンク先を入れて alt が空のまま決定すると、キャプションがあっても決定できない', async () => {
		invokeCommand(screen.getByRole('button', { name: 'スライド1を編集' }));
		fireEvent.change(screen.getByLabelText('リンク先URL'), {
			target: { value: 'https://example.com/' },
		});
		await act(() => {
			fireEvent.click(screen.getByRole('button', { name: '決定' }));
		});

		await vi.waitFor(() => {
			expect(screen.getByRole('alert').textContent).toContain('代替テキスト(alt)');
		});
		expect(getSlideDialog().open).toBe(true);
		expect(getSlides(latest).map((s) => s.href)).toStrictEqual(['', '']);
	});

	test('ポップアップにして alt が空のまま決定すると、キャプションがあっても決定できない', async () => {
		invokeCommand(screen.getByRole('button', { name: 'スライド1を編集' }));
		fireEvent.click(screen.getByLabelText('ポップアップで画像を開く'));
		await act(() => {
			fireEvent.click(screen.getByRole('button', { name: '決定' }));
		});

		await vi.waitFor(() => {
			expect(screen.getByRole('alert').textContent).toContain(
				'代替テキスト(alt)が空です',
			);
		});
		expect(getSlideDialog().open).toBe(true);
		expect(getSlides(latest).map((s) => s.node)).toStrictEqual(['div', 'div']);
	});

	test('追加するスライドは名前が空なので、ダイアログに名前が必須な理由が出て、キャプションを入れると消える', () => {
		const note =
			'キャプションか代替テキストのどちらかが、スライドとドットの名前になるため必須です。';

		invokeCommand(screen.getByRole('button', { name: 'スライドを追加' }));
		expect(screen.getByText(note)).toBeDefined();

		fireEvent.change(screen.getByLabelText('キャプション'), { target: { value: 'C' } });
		expect(screen.queryByText(note)).toBeNull();
	});

	test('名前のあるスライドの編集ダイアログには、名前が必須な理由は出ない', () => {
		invokeCommand(screen.getByRole('button', { name: 'スライド1を編集' }));

		expect(screen.queryByText(/スライドとドットの名前になるため必須/)).toBeNull();
	});

	test('全体の設定を編集できる', () => {
		fireEvent.click(screen.getByLabelText('自動再生'));
		fireEvent.change(screen.getByLabelText('表示枚数'), { target: { value: '3' } });
		fireEvent.click(screen.getByLabelText('フェード'));

		expect(latest.autoplay).toBe(true);
		expect(latest.perView).toBe(3);
		expect(latest.effect).toBe('fade');
	});
});
