import type { CarouselData } from './definition.js';
import type { Slide } from './slides.js';
import type { ImageData } from '../image/definition.js';
import type { ItemEditorProps } from '@burger-editor/core';
import type { RefObject } from 'react';

import {
	Checkbox,
	EditorDialog,
	Fieldset,
	NumberField,
	RadioGroup,
	ThumbnailButton,
	useCommand,
	useEngine,
} from '@burger-editor/client/ui';
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { ImageEditor } from '../image/editor.js';

import {
	appendSlide,
	defaultSlide,
	editorStateToSlide,
	getSlides,
	moveItem,
	moveSlide,
	removeSlide,
	replaceSlide,
	SLIDE_NAME_NOTE,
	slideLabelOf,
	slideToEditorState,
} from './slides.js';

type SubmitRef = RefObject<(() => Promise<void>) | null>;

/**
 * carouselアイテムのエディタ。全体の設定とスライドの一覧を編集し、
 * 各スライドの中身（PC/SP画像・サイズ・リンクなど）は、imageアイテムと
 * 同じ編集フォーム（`ImageEditor`）を入れ子のダイアログで開いて編集する。
 *
 * 入れ子のダイアログは engine の UI 状態（`engine.uiState`）には載せず、
 * このコンポーネントのローカル state だけで開閉する。engine が持つのは
 * 「アイテムエディタ」ひとつだけで、スライド編集はその内側の出来事だから。
 * スライドを確定しても保存（`engine.save()`）はしない。保存は外側の
 * アイテムエディタの「決定」が行う。
 * @param root0
 * @param root0.state
 * @param root0.setState
 */
export function CarouselEditor({ state, setState }: ItemEditorProps<CarouselData>) {
	const engine = useEngine();
	const rootId = useId();
	const slides = getSlides(state);
	// 編集中のスライドの index。`slides.length` は「これから追加するスライド」で、
	// 新規スライドは確定するまで state に入れない（確定せずに閉じても、
	// 取り消しの後始末が要らない）
	const [editing, setEditing] = useState<number | null>(null);
	const submitRef: SubmitRef = useRef(null);

	// 行の同一性。スライドには固有の ID が無いので、並べ替え・削除に合わせて
	// 入れ替える ID を並べて持つ（`next` は次に振る ID）。index をキーにすると、
	// 並べ替えのときにフォーカスと読み込み中のサムネイルが、スライドではなく
	// 位置に残ってしまう
	const [rows, setRows] = useState<{
		readonly ids: readonly number[];
		readonly next: number;
	}>(() => ({ ids: slides.map((_, i) => i), next: slides.length }));
	// 目印の数がスライドの数とずれたら（外から state が差し替わったなど、この
	// コンポーネントの操作を通らずにスライドが増減したとき）、描画の途中で振り直す。
	// 振り直さないと、新しい行のキーが古い行のものと重なる
	if (rows.ids.length !== slides.length) {
		setRows({
			ids: slides.map((_, i) => rows.next + i),
			next: rows.next + slides.length,
		});
	}

	// 操作するスライドの index は、押されたボタンの `value` で受け取る。
	// 値が無い・整数でない・範囲外のときは `null` を返し、各 command は何もしない
	// （index の検証をここ 1 か所に集める）
	const slideIndexOf = (source: Element | null) => {
		// `Number('')` は 0 になり、値の無いボタンが先頭のスライドを操作してしまうので、
		// 数字だけの文字列のときに限る
		const value = (source as HTMLButtonElement | null)?.value ?? '';
		if (!/^\d+$/.test(value)) {
			return null;
		}
		const index = Number(value);
		return index < slides.length ? index : null;
	};

	const rootRef = useCommand<HTMLDivElement>({
		'--carousel-edit': (event) => {
			const index = slideIndexOf(event.source);
			if (index !== null) {
				setEditing(index);
			}
		},
		'--carousel-add': () => {
			setEditing(slides.length);
		},
		'--carousel-remove': (event) => {
			const index = slideIndexOf(event.source);
			// スライド 0 件は保存できないので、ボタンの disabled・`removeSlide`・ここの
			// 3 か所で守る。ボタンが押せる状態のまま command が連続で届いても、
			// 1 枚になった後の削除は通さない
			if (index === null || slides.length <= 1) {
				return;
			}
			setState((prev) => removeSlide(prev, index));
			// 1 枚のときは removeSlide が何もしないので、行 ID も同じ条件で据え置く
			setRows((prev) =>
				prev.ids.length <= 1
					? prev
					: { ...prev, ids: prev.ids.filter((_, i) => i !== index) },
			);
		},
		'--carousel-up': (event) => {
			const index = slideIndexOf(event.source);
			if (index === null) {
				return;
			}
			setState((prev) => moveSlide(prev, index, -1));
			setRows((prev) => ({ ...prev, ids: moveItem(prev.ids, index, -1) }));
		},
		'--carousel-down': (event) => {
			const index = slideIndexOf(event.source);
			if (index === null) {
				return;
			}
			setState((prev) => moveSlide(prev, index, 1));
			setRows((prev) => ({ ...prev, ids: moveItem(prev.ids, index, 1) }));
		},
	});

	const closeSlideEditor = () => {
		setEditing(null);
	};

	// 範囲外の index（= 追加）は、既定値のスライドから編集を始める
	const editingSlide =
		editing === null
			? null
			: (slides[editing] ?? (editing === slides.length ? defaultSlide() : null));

	const commitSlide = (slide: Slide) => {
		if (editing === null) {
			return;
		}
		if (editing >= slides.length) {
			setState((prev) => appendSlide(prev, slide));
			setRows((prev) => ({ ids: [...prev.ids, prev.next], next: prev.next + 1 }));
		} else {
			setState((prev) => replaceSlide(prev, editing, slide));
		}
		setEditing(null);
	};

	return (
		<div ref={rootRef} id={rootId}>
			<Fieldset legend="カルーセルの設定">
				<Checkbox
					name="bge-carousel-autoplay"
					label={<span>自動再生</span>}
					checked={state.autoplay ?? false}
					onChange={(autoplay) => setState((prev) => ({ ...prev, autoplay }))}
				/>
				<Checkbox
					name="bge-carousel-loop"
					label={<span>ループ</span>}
					checked={state.loop ?? false}
					onChange={(loop) => setState((prev) => ({ ...prev, loop }))}
				/>
				<NumberField
					label="表示枚数"
					name="bge-carousel-per-view"
					value={state.perView ?? 1}
					min={1}
					step={1}
					onChange={(perView) => setState((prev) => ({ ...prev, perView }))}
				/>
				<Checkbox
					name="bge-carousel-arrows"
					label={<span>矢印を表示</span>}
					checked={state.arrows ?? true}
					onChange={(arrows) => setState((prev) => ({ ...prev, arrows }))}
				/>
				<Checkbox
					name="bge-carousel-dots"
					label={<span>ドットを表示</span>}
					checked={state.dots ?? true}
					onChange={(dots) => setState((prev) => ({ ...prev, dots }))}
				/>
				<RadioGroup
					label="切り替え効果"
					name="bge-carousel-effect"
					value={state.effect ?? 'slide'}
					onChange={(effect) =>
						setState((prev) => ({ ...prev, effect: effect as CarouselData['effect'] }))
					}
					options={[
						{ value: 'slide', label: 'スライド' },
						{ value: 'fade', label: 'フェード' },
					]}
				/>
			</Fieldset>

			<Fieldset legend="スライド">
				{/* 見た目は client の `ui.css`（`slide-list`）が、`data-bge-slide-*` の役割属性
				（サムネイル・名前・操作）で当てる。属性を変えるときは ui.css も合わせる */}
				<ol data-bge-editor-ui-component="slide-list">
					{slides.map((slide, index) => (
						// `rows.ids` と `slides` の長さは常に揃えて更新し、ずれたら振り直すが、念のため
						// 行が壊れないよう、位置から作ったキーに落とす
						<li key={rows.ids[index] ?? `new-${index}`}>
							{/* 画像を押すとそのスライドの編集が開く。画像が未選択でも同じ大きさの
							プレースホルダーを出し、行の高さが変わらないようにする */}
							<ThumbnailButton
								src={slide.path}
								label="編集"
								aria-label={
									slide.alt
										? `スライド${index + 1}「${slide.alt}」を編集`
										: `スライド${index + 1}を編集`
								}
								command="--carousel-edit"
								commandfor={rootId}
								value={String(index)}
							/>
							{/* alt はそのスライドを見分ける一番の手がかりなので名前に使う。
							並べ替えても位置が分かるよう番号は残し、alt が空なら「スライドN」 */}
							<span data-bge-slide-name="" title={slide.alt || undefined}>
								{slide.alt ? `${index + 1}. ${slide.alt}` : `スライド${index + 1}`}
							</span>
							<span data-bge-slide-actions="">
								<button
									type="button"
									command="--carousel-up"
									commandfor={rootId}
									value={String(index)}
									disabled={index === 0}>
									前へ
								</button>
								<button
									type="button"
									command="--carousel-down"
									commandfor={rootId}
									value={String(index)}
									disabled={index === slides.length - 1}>
									後ろへ
								</button>
								<button
									type="button"
									command="--carousel-remove"
									commandfor={rootId}
									value={String(index)}
									disabled={slides.length <= 1}>
									削除
								</button>
							</span>
						</li>
					))}
				</ol>
				<button type="button" command="--carousel-add" commandfor={rootId}>
					スライドを追加
				</button>
			</Fieldset>

			{
				// <form>の入れ子になることと、外側の`.bge-dialog:has([data-bge-dialog='2col'])`が
				// 内側の中身に反応して外側の幅が変わることを避けるため、
				// 外側の<dialog>の外（engine.el）に描く
				createPortal(
					<EditorDialog
						name="carousel-slide"
						open={editingSlide !== null}
						buttons={{ close: 'キャンセル', complete: '決定' }}
						onClose={closeSlideEditor}
						action={async () => {
							// 失敗はEditorDialogのuseActionStateがcatchして表示する。
							// 以降の確定は実行しない
							await submitRef.current?.();
						}}>
						{editingSlide && editing !== null ? (
							<SlideEditorBody
								// 開き直すたびに編集状態を作り直す
								key={editing}
								slide={editingSlide}
								submitRef={submitRef}
								onCommit={commitSlide}
							/>
						) : null}
					</EditorDialog>,
					engine.el,
				)
			}
		</div>
	);
}

// スライドの名前は、確定を拒む検査と同じ決め方（キャプションの文字、空なら alt）で導く。
// キー入力のたびに導くので、HTML のパーサーは使い回す
let labelParser: DOMParser | undefined;
const SLIDE_NAME = {
	labelOf: (state: ImageData) =>
		slideLabelOf(
			{ caption: state.caption ?? '', alt: state.altEditable ?? '' },
			(labelParser ??= new DOMParser()),
		),
	note: SLIDE_NAME_NOTE,
} as const;

/**
 * スライド 1 枚の編集フォーム。imageアイテムの `ImageEditor` に、
 * スライドから組み立てた `ImageData` を渡す。
 * @param root0
 * @param root0.slide
 * @param root0.submitRef
 * @param root0.onCommit
 */
function SlideEditorBody({
	slide,
	submitRef,
	onCommit,
}: {
	readonly slide: Slide;
	readonly submitRef: SubmitRef;
	readonly onCommit: (slide: Slide) => void;
}) {
	const engine = useEngine();
	const [state, setState] = useState<ImageData>(() =>
		slideToEditorState(slide, engine.config),
	);

	// 最新のstateで変換する。useEffectEventなので、キー入力のたびの
	// state更新ではeffectが作り直されない
	const commit = useEffectEvent(async () => {
		onCommit(await editorStateToSlide(state, engine.config));
	});

	useEffect(() => {
		// Effect Event そのものは外へ渡さず、関数で包む（ItemEditorHost と同じ）
		submitRef.current = async () => {
			await commit();
		};
		return () => {
			submitRef.current = null;
		};
	}, [submitRef]);

	return <ImageEditor state={state} setState={setState} slideName={SLIDE_NAME} />;
}
