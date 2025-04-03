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
	const cssProps = engine.getCustomProperties();

	if (!currentBlock) {
		throw new Error('currentBlock is null');
	}

	const options = currentBlock.exportOptions();

	let currentColumns = $state(options.props.columns ?? 1);
</script>

{#if options}
	<fieldset>
		<legend>コンテナ特性</legend>
		<label>
			<span>コンテナタイプ</span>
			<output>{containerTypeLabel[options.props.type]} ({options.props.type})</output>
		</label>
		{#if options.props.immutable}
			<p>このブロックはコンテナタイプを変更できません。</p>
		{:else}
			{#if options.props.type === 'inline'}
				<div role="radiogroup" aria-labelledby="justify-group">
					<div id="justify-group">横方向配置</div>
					<label>
						<input
							type="radio"
							name="bge-options-justify"
							value="center"
							defaultChecked={options.props.justify === 'center'} /><span>中央寄せ</span>
					</label>
					<label>
						<input
							type="radio"
							name="bge-options-justify"
							value="start"
							defaultChecked={options.props.justify === 'start'} /><span>左寄せ</span>
					</label>
					<label>
						<input
							type="radio"
							name="bge-options-justify"
							value="end"
							defaultChecked={options.props.justify === 'end'} /><span>右寄せ</span>
					</label>
					<label>
						<input
							type="radio"
							name="bge-options-justify"
							value="between"
							defaultChecked={options.props.justify === 'between'} /><span>両端寄せ</span>
					</label>
					<label>
						<input
							type="radio"
							name="bge-options-justify"
							value="around"
							defaultChecked={options.props.justify === 'around'} /><span
							>要素間余白均等</span>
					</label>
					<label>
						<input
							type="radio"
							name="bge-options-justify"
							value="evenly"
							defaultChecked={options.props.justify === 'evenly'} /><span
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
							defaultChecked={options.props.align === 'align-center'} /><span
							>垂直中央寄せ</span>
					</label>
					<label>
						<input
							type="radio"
							name="bge-options-align"
							value="align-start"
							defaultChecked={options.props.align === 'align-start'} /><span>上寄せ</span>
					</label>
					<label>
						<input
							type="radio"
							name="bge-options-align"
							value="align-end"
							defaultChecked={options.props.align === 'align-end'} /><span>下寄せ</span>
					</label>
					<label>
						<input
							type="radio"
							name="bge-options-align"
							value="align-stretch"
							defaultChecked={options.props.align === 'align-stretch'} /><span>伸縮</span>
					</label>
					<label>
						<input
							type="radio"
							name="bge-options-align"
							value="align-baseline"
							defaultChecked={options.props.align === 'align-baseline'} /><span
							>ベースライン</span>
					</label>
				</div>
			{/if}
			{#if options.props.type === 'grid'}
				<label>
					<span>列数</span>
					<output>{currentColumns}</output>
					<input
						name="bge-options-columns"
						type="range"
						bind:value={currentColumns}
						defaultValue={options.props.columns ?? 1}
						min="1"
						max="5" />
				</label>
			{/if}
			{#if options.props.type === 'float'}
				<div role="radiogroup" aria-labelledby="float-group">
					<div id="float-group">回り込み</div>
					<label>
						<input
							type="radio"
							name="bge-options-float"
							value="start"
							defaultChecked={options.props.float === 'start'} /><span>左寄せ</span>
					</label>
					<label>
						<input
							type="radio"
							name="bge-options-float"
							value="end"
							defaultChecked={options.props.float === 'end'} /><span>右寄せ</span>
					</label>
				</div>
			{/if}
		{/if}
	</fieldset>
{/if}

{#if cssProps.size > 0}
	<fieldset>
		<legend>ブロックのスタイル拡張</legend>

		{#each cssProps as [category, props] (`bge-options-style-${category}`)}
			<label>
				<span>{category}</span>
				<select name={`bge-options-style-${category}`}>
					{#each props as [propName, data] (propName)}
						<option
							value={data.isDefault ? '@@default' : propName}
							selected={options.style[category] === propName || data.isDefault}
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
		defaultValue={options.classList.join(' ') ?? ''}
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
