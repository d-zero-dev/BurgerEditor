import { describe, expect, test } from 'vitest';

import { parseHTMLToBlockData } from './parse-html-to-definition.js';

describe('parseHTMLToBlockData', () => {
	test('Basic', () => {
		const sandbox = document.createElement('div');
		sandbox.innerHTML = `
<div data-bge-container="inline:center:align-baseline:wrap" data-bge-name="file" class="a b c d e" id="bge-specific-id" style="--bge-options-max-width: var(--bge-options-max-width--full);">
	<div data-bge-group>
		<div data-bge-item>
			<div data-bgi="download-file" data-bgi-ver="4.0.0">
				<div class="bgi-download-file">
					<a class="bgi-download-file__link" href="/files/others/13__bW92aWU-d-.webm" target="_blank" data-bge="path:href, download:download" download>
						<span class="bgi-link__icon bgi-link__icon--before" role="none"></span>
						<span class="bgi-link__name" data-bge="name">サンプルダウンロードファイル</span>
						<span class="bgi-link__size" data-bge="formated-size, size:data-size" data-size="572270">558.86kB</span>
						<span class="bgi-link__icon bgi-link__icon--after" role="none"></span>
					</a>
				</div>
			</div>
		</div>
	</div>
	<div data-bge-group>
		<div data-bge-item>
			<div data-bgi="download-file" data-bgi-ver="4.0.0">
				<div class="bgi-download-file">
					<a class="bgi-download-file__link" href="/files/others/bg-sample.pdf" target="_blank" data-bge="path:href, download:download" download>
						<span class="bgi-link__icon bgi-link__icon--before" role="none"></span>
						<span class="bgi-link__name" data-bge="name">ファイルPDF</span>
						<span class="bgi-link__size" data-bge="formated-size, size:data-size" data-size="138158">134.92kB</span>
						<span class="bgi-link__icon bgi-link__icon--after" role="none"></span>
					</a>
				</div>
			</div>
		</div>
	</div>
	<div data-bge-group>
		<div data-bge-item>
			<div data-bgi="download-file" data-bgi-ver="4.0.0">
				<div class="bgi-download-file">
					<a class="bgi-download-file__link" href="/files/others/bg-sample.pdf" target="_blank" data-bge="path:href, download:download">
						<span class="bgi-link__icon bgi-link__icon--before" role="none"></span>
						<span class="bgi-link__name" data-bge="name">サンプルダウンロードファイル</span>
						<span class="bgi-link__size" data-bge="formated-size, size:data-size" data-size="138158">134.92kB</span>
						<span class="bgi-link__icon bgi-link__icon--after" role="none"></span>
					</a>
				</div>
			</div>
		</div>
	</div>
</div>
		`;

		const result = parseHTMLToBlockData(sandbox.firstElementChild! as HTMLElement);

		expect(result).toEqual({
			name: 'file',
			containerProps: {
				type: 'inline',
				immutable: false,
				autoRepeat: 'fixed',
				justify: 'center',
				align: 'align-baseline',
				wrap: 'wrap',
				columns: null,
				float: null,
				frameSemantics: 'div',
			},
			style: {
				'max-width': 'full',
			},
			classList: ['a', 'b', 'c', 'd', 'e'],
			id: 'specific-id',
			items: [
				[
					{
						data: {
							download: '',
							formatedSize: '558.86kB',
							name: 'サンプルダウンロードファイル',
							path: '/files/others/13__bW92aWU-d-.webm',
							size: 572_270,
						},
						name: 'download-file',
					},
				],
				[
					{
						data: {
							download: '',
							formatedSize: '134.92kB',
							name: 'ファイルPDF',
							path: '/files/others/bg-sample.pdf',
							size: 138_158,
						},
						name: 'download-file',
					},
				],
				[
					{
						data: {
							download: null,
							formatedSize: '134.92kB',
							name: 'サンプルダウンロードファイル',
							path: '/files/others/bg-sample.pdf',
							size: 138_158,
						},
						name: 'download-file',
					},
				],
			],
		});
	});
});
