import type { BurgerBlock, BurgerEditorEngine } from '@burger-editor/core';

import { useState } from 'react';

const containerTypeLabel = {
	grid: 'グリッド',
	inline: '横並び',
	float: '左右折り返し',
} as const;

/**
 * Block options dialog content. Values are read out of the dialog form
 * on submit (uncontrolled, `name="bge-options-*"`); only the fields that
 * drive conditional rendering are controlled.
 * @param root0
 * @param root0.engine
 * @param root0.block
 */
export function BlockOptions({
	engine,
	block,
}: {
	readonly engine: BurgerEditorEngine;
	readonly block: BurgerBlock;
}) {
	const currentBlock = block;

	const [options] = useState(() => currentBlock.exportOptions());
	const cssProps = engine.getCustomProperties(options.containerProps.type);
	const repeatMinInlineSizeVariants = engine.getRepeatMinInlineSizeVariants();

	const [currentColumns, setCurrentColumns] = useState(
		options.containerProps.columns ?? 1,
	);
	const [currentContainerType, setCurrentContainerType] = useState(
		options.containerProps.type,
	);
	const [currentFrameSemantics, setCurrentFrameSemantics] = useState(
		options.containerProps.frameSemantics,
	);
	const [currentAutoRepeat, setCurrentAutoRepeat] = useState(
		options.containerProps.autoRepeat ?? 'fixed',
	);

	const itemCount = currentBlock.items.length;

	// floatタイプは変更不可なので、元のタイプを使用
	const effectiveContainerType =
		options.containerProps.type === 'float'
			? options.containerProps.type
			: currentContainerType;

	return (
		<>
			<fieldset>
				<legend>コンテナ特性</legend>
				{options.containerProps.immutable || options.containerProps.type === 'float' ? (
					<label>
						<span>コンテナタイプ</span>
						<output>
							{containerTypeLabel[options.containerProps.type ?? 'inline']} (
							{options.containerProps.type ?? 'inline'})
						</output>
					</label>
				) : (
					<label>
						<span>コンテナタイプ</span>
						<select
							name="bge-options-container-type"
							value={currentContainerType}
							onChange={(e) => {
								setCurrentContainerType(e.currentTarget.value as 'grid' | 'inline');
							}}>
							<option value="grid">{containerTypeLabel.grid}</option>
							<option value="inline">{containerTypeLabel.inline}</option>
						</select>
					</label>
				)}
				{!options.containerProps.immutable && options.containerProps.type !== 'float' ? (
					<label>
						<span>セマンティック要素</span>
						<select
							name="bge-options-frame-semantics"
							value={currentFrameSemantics}
							onChange={(e) => {
								const newSemantics = e.currentTarget.value as 'div' | 'ul' | 'ol';
								currentBlock.changeFrameSemantics(newSemantics);
								setCurrentFrameSemantics(newSemantics);
							}}>
							<option value="div">div（汎用）</option>
							<option value="ul">ul（順序なしリスト）</option>
							<option value="ol">ol（順序ありリスト）</option>
						</select>
					</label>
				) : null}
				{effectiveContainerType === 'inline' &&
				!(options.containerProps.immutable && itemCount === 1) ? (
					<>
						<div role="radiogroup" aria-labelledby="justify-group">
							<div id="justify-group">横方向配置</div>
							{(
								[
									['center', '中央寄せ'],
									['start', '左寄せ'],
									['end', '右寄せ'],
									['between', '両端寄せ'],
									['around', '要素間余白均等'],
									['evenly', '要素間均等'],
								] as const
							).map(([value, label]) => (
								<label key={value}>
									<input
										type="radio"
										name="bge-options-justify"
										value={value}
										defaultChecked={options.containerProps.justify === value}
									/>
									<span>{label}</span>
								</label>
							))}
						</div>
						<div role="radiogroup" aria-labelledby="align-group">
							<div id="align-group">縦向配置</div>
							{(
								[
									['align-center', '垂直中央寄せ'],
									['align-start', '上寄せ'],
									['align-end', '下寄せ'],
									['align-stretch', '伸縮'],
									['align-baseline', 'ベースライン'],
								] as const
							).map(([value, label]) => (
								<label key={value}>
									<input
										type="radio"
										name="bge-options-align"
										value={value}
										defaultChecked={options.containerProps.align === value}
									/>
									<span>{label}</span>
								</label>
							))}
						</div>
					</>
				) : null}
				{effectiveContainerType === 'grid' ? (
					options.containerProps.immutable || options.containerProps.type === 'float' ? (
						<p>このブロックはコンテナタイプを変更できません。</p>
					) : (
						<>
							<label>
								<span>列の自動調整</span>
								<select
									name="bge-options-auto-repeat"
									value={currentAutoRepeat}
									onChange={(e) => {
										setCurrentAutoRepeat(
											e.currentTarget.value as 'fixed' | 'auto-fill' | 'auto-fit',
										);
									}}>
									<option value="fixed">固定列数</option>
									<option value="auto-fill">auto-fill（空白保持）</option>
									<option value="auto-fit">auto-fit（空白最小）</option>
								</select>
							</label>
							{currentAutoRepeat === 'fixed' ? (
								<label>
									<span>基準列数</span>
									<output>{currentColumns}</output>
									<input
										name="bge-options-columns"
										type="range"
										value={currentColumns}
										onChange={(e) => {
											setCurrentColumns(e.currentTarget.valueAsNumber);
										}}
										min="1"
										max="5"
									/>
								</label>
							) : null}
							{currentAutoRepeat !== 'fixed' && repeatMinInlineSizeVariants ? (
								<label>
									<span>折り返し基準幅</span>
									<select
										name="bge-options-repeat-min-inline-size"
										defaultValue={
											[...repeatMinInlineSizeVariants.properties].find(
												([variantName, data]) =>
													options.containerProps.repeatMinInlineSize == null
														? data.isDefault
														: options.containerProps.repeatMinInlineSize === variantName,
											)?.[0]
										}>
										{[...repeatMinInlineSizeVariants.properties].map(
											([variantName, data]) => (
												<option
													key={variantName}
													value={variantName}>{`${variantName} (${data.value})`}</option>
											),
										)}
									</select>
								</label>
							) : null}
						</>
					)
				) : null}
				{effectiveContainerType === 'float' ? (
					<div role="radiogroup" aria-labelledby="float-group">
						<div id="float-group">回り込み</div>
						{(
							[
								['start', '左寄せ'],
								['end', '右寄せ'],
							] as const
						).map(([value, label]) => (
							<label key={value}>
								<input
									type="radio"
									name="bge-options-float"
									value={value}
									defaultChecked={options.containerProps.float === value}
								/>
								<span>{label}</span>
							</label>
						))}
					</div>
				) : null}
				<label>
					<input
						type="checkbox"
						name="bge-options-linkarea"
						value="true"
						defaultChecked={options.containerProps.linkarea ?? false}
					/>
					<span>リンクエリア機能を有効にする</span>
				</label>
			</fieldset>

			{cssProps.size > 0 ? (
				<fieldset>
					<legend>ブロックのスタイル拡張</legend>

					{[...cssProps].map(([, category]) => {
						const selected = [...category.properties].find(([propName, data]) =>
							options.style?.[category.id] == null
								? data.isDefault
								: options.style[category.id] === propName,
						);
						return (
							<label key={`bge-options-style-${category.id}`}>
								<span>{category.name}</span>
								<select
									name={`bge-options-style-${category.id}`}
									defaultValue={
										selected
											? selected[1].isDefault
												? '@@default'
												: selected[0]
											: undefined
									}>
									{[...category.properties].map(([propName, data]) => (
										<option
											key={propName}
											value={
												data.isDefault ? '@@default' : propName
											}>{`${propName} (${data.value})`}</option>
									))}
								</select>
							</label>
						);
					})}
				</fieldset>
			) : null}

			<label>
				<span>独自class設定</span>
				<input
					type="text"
					name="bge-options-classes"
					defaultValue={options.classList?.join(' ') ?? ''}
					aria-describedby="block-option-classes-desc"
				/>
			</label>
			<small id="block-option-classes-desc">
				複数指定する場合はスペース（空白文字）で区切ってください。
			</small>

			<label>
				<span>
					ID設定: <code>bge-</code>
				</span>
				<input
					name="bge-options-id"
					type="text"
					defaultValue={options.id ?? ''}
					aria-describedby="block-option-id-desc"
				/>
			</label>
			<small id="block-option-id-desc">
				アンカーリンク用のID属性を設定します。実際のIDは<code>bge-</code>
				が自動的に先頭に付加されます。
			</small>
		</>
	);
}
