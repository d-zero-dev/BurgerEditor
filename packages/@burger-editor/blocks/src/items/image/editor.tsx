import type { ImageData } from './index.js';
import type { ItemEditorProps } from '@burger-editor/core';

import {
	Checkbox,
	Fieldset,
	FileList,
	FileUploader,
	Preview,
	RadioGroup,
	Tabs,
	TextField,
	useComponentEvent,
} from '@burger-editor/client/ui';
import { useEffect, useRef, useState } from 'react';

import { createWidthState } from './width.js';

const TABS_CONTENT_ID = 'bgi-image__tabs-content';

type LoadedImage = {
	width: number;
	height: number;
	src: string;
};

/**
 * imageアイテムのエディタ。旧 `editorOptions.open()` の命令的配線を
 * React stateとcontrolled inputsに置き換えたもの。
 * @param root0
 * @param root0.state
 * @param root0.setState
 * @param root0.engine
 */
export function ImageEditor({ state, setState, engine }: ItemEditorProps<ImageData>) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const currentIndexRef = useRef(0);
	const [fieldsetDisabled, setFieldsetDisabled] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);

	// 初期stateの値でシードした可変ストア（識別子はマウント間で安定）。
	// cssWidth系の正規化はtoEditorState（純関数）側で済んでいる
	const [widthState] = useState(() => {
		const ws = createWidthState();
		ws.setScaleType(state.scaleType);
		ws.setScale(state.scale);
		ws.setMaxNumber(state.width?.[0] ?? 400);
		return ws;
	});

	const [maxNumber, setMaxNumber] = useState(() => widthState.getCSSWidthMaxNumber());

	const stateRef = useRef(state);
	useEffect(() => {
		stateRef.current = state;
	});

	const updateCSSWidth = () => {
		setMaxNumber(widthState.getCSSWidthMaxNumber());
		setState((prev) => ({
			...prev,
			cssWidthUnit: widthState.getCSSWidthUnit(),
			cssWidthNumber: widthState.getCSSWidthNumber(),
			scaleType: widthState.getScaleType(),
			scale: widthState.getScale(),
			cssWidth: widthState.getCSSWidth(),
		}));

		engine.componentObserver.notify('update-css-width', {
			cssWidth: widthState.getCSSWidth(),
		});
	};

	const updateImage = ($src: LoadedImage) => {
		const index = currentIndexRef.current;

		setState((prev) => {
			const path = [...(prev.path ?? [])];
			path[index] = $src.src;

			const width = [...(prev.width ?? [])];
			width[index] = $src.width;

			const height = [...(prev.height ?? [])];
			height[index] = $src.height;

			const media = [...(prev.media ?? [])];
			media[index] = prev.mediaInput ?? '';

			return { ...prev, path, width, height, media };
		});

		// Update max number
		widthState.setMaxNumber($src.width);

		updateCSSWidth();
	};

	const _updateImage = async (path: string) => {
		if (!path) {
			return;
		}

		setFieldsetDisabled(true);
		setLoadError(null);
		try {
			const $src = await loadImage(path);
			updateImage($src);
		} catch {
			// 失敗（読み込みエラー・タイムアウト）はUIに表示し、
			// サイズ入力欄は必ず復帰させる
			setLoadError(`画像を読み込めませんでした: ${path}`);
		} finally {
			setFieldsetDisabled(false);
		}
	};

	const fileSelect = (index: number) => {
		const current = stateRef.current;
		const $path = current.path ?? [];
		const currentPath = $path[index] ?? $path[0];

		if (currentPath == null) {
			throw new Error('currentPath is not found');
		}

		engine.componentObserver.notify('file-select', {
			path: currentPath,
			fileSize: Number.parseFloat(current.fileSize ?? '0'),
			isEmpty: currentPath === '',
			isMounted: false,
		});
	};

	const selectTab = (index: number) => {
		currentIndexRef.current = index;
		setCurrentIndex(index);
		fileSelect(index);
		void _updateImage(stateRef.current.path?.[index] ?? '');

		const media = stateRef.current.media?.[index] ?? '';
		const altEditable = stateRef.current.alt?.[index] ?? '';
		setState((prev) => ({ ...prev, mediaInput: media, altEditable }));
	};

	useComponentEvent(engine, 'file-select', ({ path, isEmpty }) => {
		if (isEmpty) {
			return;
		}

		void _updateImage(path);
	});

	// 初期化: タブ0のプレビュー連携と画像読み込み（マウント時のみ）。
	// state側の初期値はtoEditorStateで正規化済みのためここでは更新しない
	useEffect(() => {
		engine.componentObserver.notify('update-css-width', {
			cssWidth: widthState.getCSSWidth(),
		});
		fileSelect(0);
		void _updateImage(stateRef.current.path?.[0] ?? '');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const currentPath = state.path?.[currentIndex] ?? '';

	return (
		<div data-bge-dialog="2col">
			<div data-bge-dialog-ui="sticky">
				<div>
					<Tabs current={currentIndex} onChange={selectTab} contentId={TABS_CONTENT_ID} />

					<div id={TABS_CONTENT_ID} role="tabpanel" aria-label="画像">
						<Preview engine={engine} path={currentPath} />
						{loadError ? <p role="alert">{loadError}</p> : null}
						<div>
							<TextField
								label="メディアクエリー"
								name="bge-media-input"
								value={state.mediaInput ?? ''}
								disabled={currentIndex === 0}
								onChange={(mediaInput) => {
									const index = currentIndexRef.current;
									setState((prev) => {
										const media = [...(prev.media ?? [])];
										media[index] = mediaInput;
										return { ...prev, mediaInput, media };
									});
								}}
							/>
						</div>
					</div>
				</div>

				<div>
					<Fieldset
						legend="画像のサイズ"
						id="bge-image-size-fieldset"
						disabled={fieldsetDisabled}>
						<RadioGroup
							label="基準"
							name="bge-scale-type"
							value={state.scaleType ?? 'original'}
							onChange={(scaleType) => {
								widthState.setScaleType(scaleType as 'container' | 'original');
								updateCSSWidth();
							}}
							options={[
								{ value: 'container', label: '基準' },
								{ value: 'original', label: '画像基準' },
							]}
						/>
						<div>
							<span>
								<label htmlFor="bgi-image__range-number">幅</label>
								<input
									type="number"
									id="bgi-image__range-number"
									name="bge-css-width-number"
									min={1}
									step={1}
									max={maxNumber}
									value={
										Number.isFinite(state.cssWidthNumber) ? state.cssWidthNumber : 100
									}
									onChange={(e) => {
										widthState.setNumber(e.currentTarget.valueAsNumber);
										updateCSSWidth();
									}}
								/>
								<output name="bge-css-width-unit">{state.cssWidthUnit ?? 'px'}</output>
							</span>
							<input
								aria-label="幅"
								type="range"
								name="bge-scale"
								min={1}
								max={100}
								step={1}
								value={state.scale ?? 100}
								onChange={(e) => {
									widthState.setScale(e.currentTarget.valueAsNumber);
									updateCSSWidth();
								}}
							/>
						</div>
						<RadioGroup
							label="縦横比"
							name="bge-aspect-ratio"
							value={state.aspectRatio ?? 'revert'}
							onChange={(aspectRatio) =>
								setState({
									...state,
									aspectRatio: aspectRatio as ImageData['aspectRatio'],
								})
							}
							options={[
								{ value: 'revert', label: 'オリジナル' },
								{ value: '1/1', label: '1 : 1' },
								{ value: '4/3', label: '4 : 3' },
								{ value: '16/9', label: '16 : 9' },
							]}
						/>
					</Fieldset>
					<TextField
						label="画像の代替テキスト(alt)"
						name="bge-alt-editable"
						value={state.altEditable ?? ''}
						onChange={(altEditable) => {
							const index = currentIndexRef.current;
							setState((prev) => {
								const alt = [...(prev.alt ?? [])];
								alt[index] = altEditable;
								return { ...prev, altEditable, alt };
							});
						}}
					/>
					<TextField
						label="キャプション"
						name="bge-caption"
						value={state.caption ?? ''}
						onChange={(caption) => setState({ ...state, caption })}
					/>
					<Fieldset legend="リンク">
						<Checkbox
							name="bge-popup"
							label="ポップアップで画像を開く"
							checked={state.popup ?? false}
							onChange={(popup) => setState({ ...state, popup })}
						/>
						<TextField
							label="リンク先URL"
							name="bge-href"
							type="url"
							value={state.href ?? ''}
							disabled={state.popup ?? false}
							onChange={(href) => setState({ ...state, href })}
						/>
						<Checkbox
							name="bge-target-blank"
							label="別タブで開く"
							checked={state.targetBlank ?? false}
							disabled={state.popup ?? false}
							onChange={(targetBlank) => setState({ ...state, targetBlank })}
						/>
					</Fieldset>
					<Checkbox
						name="bge-lazy"
						label="遅延読み込み"
						checked={state.lazy ?? false}
						describedBy="bge-lazy-desc"
						onChange={(lazy) => setState({ ...state, lazy })}
					/>
					<small id="bge-lazy-desc">
						画像がブラウザの表示エリアに現れるまでファイルを読み込みません。
					</small>
				</div>
			</div>
			<div>
				<FileUploader engine={engine} fileType="image" />
				<FileList engine={engine} fileType="image" />
			</div>
		</div>
	);
}

/**
 *
 * @param src
 */
async function loadImage(src: string) {
	return new Promise<LoadedImage>((resolve, reject) => {
		const img = new Image();
		img.src = src;
		const timer = setTimeout(() => {
			reject(new Error(`Image load timeout: ${src}`));
		}, 30_000);
		img.addEventListener('load', () => {
			clearTimeout(timer);
			resolve({
				width: img.naturalWidth,
				height: img.naturalHeight,
				src,
			});
		});
		const fail = () => {
			clearTimeout(timer);
			reject(new Error(`Failed to load image: ${src}`));
		};
		img.addEventListener('error', fail);
		img.addEventListener('abort', fail);
	});
}
