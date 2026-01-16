<script lang="ts">
	import type { BurgerEditorEngine } from '@burger-editor/core';

	const {
		engine,
	}: {
		engine: BurgerEditorEngine;
	} = $props();

	const containerTypeLabel = {
		grid: 'グリッド',
		inline: '横並び',
		float: '左右折り返し',
	} as const;

	const currentBlock = engine.getCurrentBlock();

	if (!currentBlock) {
		throw new Error('currentBlock is null');
	}

	const options = currentBlock.exportOptions();
	const cssProps = engine.getCustomProperties(options.containerProps.type);

	const autoRepeatBaseWidth = engine.getCustomProperty('--bge-auto-repeat-base-width');

	let currentColumns = $state(options.containerProps.columns ?? 1);
	let currentContainerType = $state(options.containerProps.type);
	let currentFrameSemantics = $state(options.containerProps.frameSemantics);

	// アイテム数をリアクティブに管理
	const itemCount = $derived(currentBlock.items.length);

	// floatタイプは変更不可なので、元のタイプを使用
	const effectiveContainerType = $derived(
		options.containerProps.type === 'float'
			? options.containerProps.type
			: currentContainerType,
	);

	/**
	 * コンテナタイプ変更時の処理
	 * @param e - change イベント
	 */
	function handleContainerTypeChange(e: Event) {
		const target = e.currentTarget as HTMLSelectElement;
		currentContainerType = target.value as 'grid' | 'inline' | 'float';
	}

	/**
	 * フレームセマンティクス変更時の処理
	 * @param e - change イベント
	 */
	function handleFrameSemanticsChange(e: Event) {
		const target = e.currentTarget as HTMLSelectElement;
		const newSemantics = target.value as 'div' | 'ul' | 'ol';

		if (!currentBlock) {
			return;
		}

		currentBlock.changeFrameSemantics(newSemantics);
		currentFrameSemantics = newSemantics;
	}
</script>

{#if options}
	<fieldset>
		<legend>コンテナ特性</legend>
		{#if options.containerProps.immutable || options.containerProps.type === 'float'}
			<label>
				<span>コンテナタイプ</span>
				<output
					>{containerTypeLabel[options.containerProps.type ?? 'inline']} ({options
						.containerProps.type ?? 'inline'})</output>
			</label>
		{:else}
			<label>
				<span>コンテナタイプ</span>
				<select name="bge-options-container-type" onchange={handleContainerTypeChange}>
					<option value="grid" selected={currentContainerType === 'grid'}
						>{containerTypeLabel.grid}</option>
					<option value="inline" selected={currentContainerType === 'inline'}
						>{containerTypeLabel.inline}</option>
				</select>
			</label>
		{/if}
		{#if !options.containerProps.immutable && options.containerProps.type !== 'float'}
			<label>
				<span>セマンティック要素</span>
				<select name="bge-options-frame-semantics" onchange={handleFrameSemanticsChange}>
					<option value="div" selected={currentFrameSemantics === 'div'}
						>div（汎用）</option>
					<option value="ul" selected={currentFrameSemantics === 'ul'}
						>ul（順序なしリスト）</option>
					<option value="ol" selected={currentFrameSemantics === 'ol'}
						>ol（順序ありリスト）</option>
				</select>
			</label>
		{/if}
		{#if effectiveContainerType === 'inline' && !(options.containerProps.immutable && itemCount === 1)}
			<div role="radiogroup" aria-labelledby="justify-group">
				<div id="justify-group">横方向配置</div>
				<label>
					<input
						type="radio"
						name="bge-options-justify"
						value="center"
						defaultChecked={options.containerProps.justify === 'center'} /><span
						>中央寄せ</span>
				</label>
				<label>
					<input
						type="radio"
						name="bge-options-justify"
						value="start"
						defaultChecked={options.containerProps.justify === 'start'} /><span
						>左寄せ</span>
				</label>
				<label>
					<input
						type="radio"
						name="bge-options-justify"
						value="end"
						defaultChecked={options.containerProps.justify === 'end'} /><span
						>右寄せ</span>
				</label>
				<label>
					<input
						type="radio"
						name="bge-options-justify"
						value="between"
						defaultChecked={options.containerProps.justify === 'between'} /><span
						>両端寄せ</span>
				</label>
				<label>
					<input
						type="radio"
						name="bge-options-justify"
						value="around"
						defaultChecked={options.containerProps.justify === 'around'} /><span
						>要素間余白均等</span>
				</label>
				<label>
					<input
						type="radio"
						name="bge-options-justify"
						value="evenly"
						defaultChecked={options.containerProps.justify === 'evenly'} /><span
						>要素間均等</span>
				</label>
			</div>
			<div role="radiogroup" aria-labelledby="align-group">
				<div id="align-group">縦向配置</div>
				<label>
					<input
						type="radio"
						name="bge-options-align"
						value="align-center"
						defaultChecked={options.containerProps.align === 'align-center'} /><span
						>垂直中央寄せ</span>
				</label>
				<label>
					<input
						type="radio"
						name="bge-options-align"
						value="align-start"
						defaultChecked={options.containerProps.align === 'align-start'} /><span
						>上寄せ</span>
				</label>
				<label>
					<input
						type="radio"
						name="bge-options-align"
						value="align-end"
						defaultChecked={options.containerProps.align === 'align-end'} /><span
						>下寄せ</span>
				</label>
				<label>
					<input
						type="radio"
						name="bge-options-align"
						value="align-stretch"
						defaultChecked={options.containerProps.align === 'align-stretch'} /><span
						>伸縮</span>
				</label>
				<label>
					<input
						type="radio"
						name="bge-options-align"
						value="align-baseline"
						defaultChecked={options.containerProps.align === 'align-baseline'} /><span
						>ベースライン</span>
				</label>
			</div>
		{/if}
		{#if effectiveContainerType === 'grid'}
			{#if options.containerProps.immutable || options.containerProps.type === 'float'}
				<p>このブロックはコンテナタイプを変更できません。</p>
			{:else}
				<label>
					<span>基準列数</span>
					<output>{currentColumns}</output>
					<input
						name="bge-options-columns"
						type="range"
						bind:value={currentColumns}
						defaultValue={options.containerProps.columns ?? 1}
						min="1"
						max="5" />
				</label>
				<label>
					<span>列の自動調整</span>
					<select name="bge-options-auto-repeat">
						<option
							value="fixed"
							selected={(options.containerProps.autoRepeat ?? 'fixed') === 'fixed'}>
							固定列数
						</option>
						<option
							value="auto-fill"
							selected={options.containerProps.autoRepeat === 'auto-fill'}>
							auto-fill（空白保持）
						</option>
						<option
							value="auto-fit"
							selected={options.containerProps.autoRepeat === 'auto-fit'}>
							auto-fit（空白最小）
						</option>
					</select>
				</label>
				<small>
					規定幅（<code
						title="CSSカスタムプロパティ: --bge-auto-repeat-base-width に設定されている値"
						>{autoRepeatBaseWidth}</code
					>）を基準に「基準列数:
					<code>{currentColumns}</code
					>」で割った数値に近い幅を保ちます。「空白保持」は空のスペースを残し、「空白最小」はアイテムの幅を広げます。
				</small>
			{/if}
		{/if}
		{#if effectiveContainerType === 'float'}
			<div role="radiogroup" aria-labelledby="float-group">
				<div id="float-group">回り込み</div>
				<label>
					<input
						type="radio"
						name="bge-options-float"
						value="start"
						defaultChecked={options.containerProps.float === 'start'} /><span
						>左寄せ</span>
				</label>
				<label>
					<input
						type="radio"
						name="bge-options-float"
						value="end"
						defaultChecked={options.containerProps.float === 'end'} /><span>右寄せ</span>
				</label>
			</div>
		{/if}
		<label>
			<input
				type="checkbox"
				name="bge-options-linkarea"
				value="true"
				defaultChecked={options.containerProps.linkarea ?? false} />
			<span>リンクエリア機能を有効にする</span>
		</label>
	</fieldset>
{/if}

{#if cssProps.size > 0}
	<fieldset>
		<legend>ブロックのスタイル拡張</legend>

		{#each cssProps as [, category] (`bge-options-style-${category.id}`)}
			<label>
				<span>{category.name}</span>
				<select name={`bge-options-style-${category.id}`}>
					{#each category.properties as [propName, data] (propName)}
						<option
							value={data.isDefault ? '@@default' : propName}
							selected={options.style?.[category.id] == null
								? data.isDefault
								: options.style[category.id] === propName}
							>{`${propName} (${data.value})`}</option>
					{/each}
				</select>
			</label>
		{/each}
	</fieldset>
{/if}

<label>
	<span>独自class設定</span>
	<input
		type="text"
		name="bge-options-classes"
		defaultValue={options.classList?.join(' ') ?? ''}
		aria-describedby="block-option-classes-desc" />
</label>
<small id="block-option-classes-desc"
	>複数指定する場合はスペース（空白文字）で区切ってください。</small>

<label>
	<span>ID設定: <code>bge-</code></span>
	<input
		name="bge-options-id"
		type="text"
		defaultValue={options.id ?? ''}
		aria-describedby="block-option-id-desc" />
</label>
<small id="block-option-id-desc"
	>アンカーリンク用のID属性を設定します。実際のIDは<code>bge-</code
	>が自動的に先頭に付加されます。</small>
