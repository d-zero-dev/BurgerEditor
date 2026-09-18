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
	useExternalFileSelection,
	useFileBrowser,
	useMountEffect,
} from '@burger-editor/client/ui';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';

import { createWidthState } from './width.js';

const tabLabel = (index: number) => `画像${index + 1}`;

type LoadedImage = {
	width: number;
	height: number;
	src: string;
};

/**
 * imageアイテムのエディタ。PC/SP 2枚の画像タブ・サイズ・リンク設定を
 * React stateとcontrolled inputsで編集する。
 * @param root0
 * @param root0.state
 * @param root0.setState
 */
export function ImageEditor({ state, setState }: ItemEditorProps<ImageData>) {
	const fileBrowser = useFileBrowser();
	// 同一documentに複数のimageアイテムエディタが同時に開いてもhtmlFor/
	// aria-*の参照先が混線しないよう、ハードコードIDではなくuseIdで一意化する
	const uid = useId();
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

	// このtry/catch/finally自体が、このファイルがReact Compilerの最適化
	// 対象から漏れている唯一の原因（babel-plugin-react-compiler 1.0.0の
	// 既知の未対応: "(BuildHIR::lowerStatement) Handle TryStatement with
	// a finalizer"）。finallyは失敗時でもサイズ入力欄を必ず復帰させる
	// 正当な後始末処理のため削除しない — アップストリームでfinally対応が
	// 入ったら自動的にコンパイル対象になる
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

		fileBrowser.select('image', currentPath, Number.parseFloat(current.fileSize ?? '0'));
	};

	const selectTab = (index: number) => {
		currentIndexRef.current = index;
		setCurrentIndex(index);
		fileSelect(index);
		void _updateImage(stateRef.current.path?.[index] ?? '');

		// altEditableはここでは更新しない。altは<source>要素に持てず、
		// HTMLへは常にaltEditable（画像1用の値）だけが反映されるため
		// （toItemData参照）、タブ2以降でも画像1のaltを表示し続ける
		const media = stateRef.current.media?.[index] ?? '';
		setState((prev) => ({ ...prev, mediaInput: media }));
	};

	// FileList側で選ばれたファイル（fileBrowser.select経由の外部変更）を
	// 反映する。selectTab/マウント時の初期化はすでに_updateImageを直接
	// 呼んでいるため、そこから来た「自分自身の変更」は現在のタブのpathと
	// 一致し、ここでは再度読み込まない。`selected`はengine単位で共有される
	// FileBrowserStoreの値のため、マウント直後は前に開いていた別itemの
	// 残留選択の可能性がある — useExternalFileSelectionが初回発火を
	// スキップし、下のマウント初期化effect（fileSelect(0)がこのitem自身の
	// pathでselectedを上書きする）に委ねる
	const selected = useSyncExternalStore(
		fileBrowser.subscribe,
		() => fileBrowser.getSnapshot().selected.image,
	);
	useExternalFileSelection(
		selected,
		() => stateRef.current.path?.[currentIndexRef.current] ?? '',
		(next) => {
			void _updateImage(next.path);
		},
	);

	// 初期化: タブ0のプレビュー連携と画像読み込み（マウント時のみ）。
	// state側の初期値はtoEditorStateで正規化済みのためここでは更新しない
	useMountEffect(() => {
		fileSelect(0);
		void _updateImage(stateRef.current.path?.[0] ?? '');
	});

	const currentPath = state.path?.[currentIndex] ?? '';
	// タブ2以降で画像未選択のままmediaを入力すると、frozen-patty側でpathが
	// 先頭画像にフォールバックし重複pathとして扱われ、source要素ごと（＝
	// 入力したmediaごと）無言で破棄される（set-component.tsのusedPaths判定）。
	// UI側で先に画像選択を促すことでこの経路を回避する
	const mediaLocked = currentIndex > 0 && !currentPath;

	return (
		<div data-bge-dialog="2col">
			<div data-bge-dialog-ui="sticky">
				<div>
					<Tabs
						current={currentIndex}
						onChange={selectTab}
						contentId={`${uid}-tabs-content`}
						createLabel={tabLabel}
					/>

					<div
						id={`${uid}-tabs-content`}
						role="tabpanel"
						aria-label={tabLabel(currentIndex)}>
						<Preview path={currentPath} />
						{loadError ? <p role="alert">{loadError}</p> : null}
						<div>
							<TextField
								label="メディアクエリー"
								name="bge-media-input"
								value={state.mediaInput ?? ''}
								disabled={currentIndex === 0 || mediaLocked}
								describedBy={mediaLocked ? `${uid}-media-desc` : undefined}
								onChange={(mediaInput) => {
									const index = currentIndexRef.current;
									setState((prev) => {
										const media = [...(prev.media ?? [])];
										media[index] = mediaInput;
										return { ...prev, mediaInput, media };
									});
								}}
							/>
							{mediaLocked ? (
								<small id={`${uid}-media-desc`}>
									先に画像を選択してください。メディアクエリーは画像を選択した後に入力できます。
								</small>
							) : null}
						</div>
					</div>
				</div>

				<div>
					<Fieldset
						legend="画像のサイズ"
						id={`${uid}-size-fieldset`}
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
								<label htmlFor={`${uid}-range-number`}>幅</label>
								<input
									type="number"
									id={`${uid}-range-number`}
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
						disabled={currentIndex > 0}
						describedBy={currentIndex > 0 ? `${uid}-alt-desc` : undefined}
						onChange={(altEditable) => setState((prev) => ({ ...prev, altEditable }))}
					/>
					{currentIndex > 0 ? (
						<small id={`${uid}-alt-desc`}>
							代替テキストは画像1（img要素）に設定され、画面幅で切り替わるすべての画像に共通で使われます。画像1のタブで編集してください。
						</small>
					) : null}
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
						describedBy={`${uid}-lazy-desc`}
						onChange={(lazy) => setState({ ...state, lazy })}
					/>
					<small id={`${uid}-lazy-desc`}>
						画像がブラウザの表示エリアに現れるまでファイルを読み込みません。
					</small>
				</div>
			</div>
			<div>
				<FileUploader fileType="image" />
				<FileList fileType="image" />
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
