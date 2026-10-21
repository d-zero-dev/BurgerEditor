import type { BurgerCommandEvent } from '@burger-editor/core';

import { cleanup, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, expect, test } from 'vitest';

import { useCommand } from '../use-command.js';

import { ThumbnailButton } from './thumbnail-button.js';

afterEach(cleanup);

/**
 * `ThumbnailButton` を `commandfor` の宛先（`useCommand` の ref を付けた要素）と
 * 一緒に描く。ボタンが何を宛先へ送るかを検証するための harness
 * @param root0
 * @param root0.src
 * @param root0.onCommand
 */
function Harness({
	src,
	onCommand,
}: {
	readonly src: string;
	readonly onCommand: (value: string) => void;
}) {
	const ref = useCommand<HTMLDivElement>({
		'--edit': (event) => {
			onCommand((event.source as HTMLButtonElement).value);
		},
	});
	return (
		<div ref={ref} id="target">
			<ThumbnailButton
				src={src}
				label="編集"
				aria-label="スライド2を編集"
				command="--edit"
				commandfor="target"
				value="1"
			/>
		</div>
	);
}

test('src があればサムネイルを描き、プレースホルダーは出さない', () => {
	render(<Harness src="/img/a.png" onCommand={() => {}} />);

	const button = screen.getByRole('button', { name: 'スライド2を編集' });
	expect(button.querySelector('img')?.getAttribute('src')).toBe('/img/a.png');
	expect(button.querySelector('[data-bge-thumbnail-placeholder]')).toBeNull();
});

test('src が空ならプレースホルダーを描き、画像は描かない', () => {
	render(<Harness src="" onCommand={() => {}} />);

	const button = screen.getByRole('button', { name: 'スライド2を編集' });
	expect(button.querySelector('img')).toBeNull();
	expect(button.querySelector('[data-bge-thumbnail-placeholder]')).not.toBeNull();
});

test('見た目の操作名「編集」は装飾として隠し、名前は aria-label が決める', () => {
	render(<Harness src="" onCommand={() => {}} />);

	const button = screen.getByRole('button');
	// 見た目の操作名（ボタンの最後の子）はそのまま描かれ、名前の計算からは外れる（aria-hidden）
	const visibleLabel = button.lastElementChild;
	expect(visibleLabel?.getAttribute('aria-hidden')).toBe('true');
	expect(visibleLabel?.textContent).toBe('編集');
	// アクセシブルネームは aria-label で、見た目の操作名を含む（label-in-name）
	expect(button.getAttribute('aria-label')).toBe('スライド2を編集');
	expect(button.getAttribute('aria-label')).toContain(visibleLabel?.textContent ?? '');
});

test('command / commandfor / value が宛先へ届く', () => {
	const received: string[] = [];
	render(<Harness src="" onCommand={(value) => received.push(value)} />);

	const button = screen.getByRole('button', { name: 'スライド2を編集' });
	const target = document.getElementById('target')!;
	const event = new Event('command') as BurgerCommandEvent;
	Object.assign(event, { command: button.getAttribute('command'), source: button });
	act(() => {
		target.dispatchEvent(event);
	});

	expect(button.getAttribute('commandfor')).toBe('target');
	expect(received).toEqual(['1']);
});
