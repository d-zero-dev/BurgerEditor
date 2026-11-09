import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, onTestFinished, test } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

// @ts-expect-error -- vite ?raw import
import clientCss from '../../../dist/client.css?raw';
import { BlockMenuButton } from '../../components/block-menu-button.js';

import { injectCSS, waitForRender } from './vr-helper.js';

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M4 7l16 0"/><path d="M10 11l0 6"/><path d="M14 11l0 6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/></svg>`;

describe('BlockMenuButton', () => {
	beforeEach(() => {
		(globalThis as Record<string, unknown>)['IS_REACT_ACT_ENVIRONMENT'] = true;
		injectCSS();
		const style = document.createElement('style');
		style.textContent = clientCss;
		document.head.append(style);
		onTestFinished(() => style.remove());
	});

	test('ホバーで hint ツールチップが表示される', async () => {
		const host = document.createElement('div');
		host.dataset.bgeComponent = 'block-menu';
		host.style.cssText =
			'position: relative; box-sizing: border-box; padding: 4rem 2rem 6rem; min-inline-size: 240px; min-block-size: 160px; background: var(--bge-ui-primary-color);';
		document.body.append(host);
		onTestFinished(() => host.remove());

		const root = createRoot(host);
		onTestFinished(() => root.unmount());

		act(() => {
			root.render(
				createElement(
					BlockMenuButton,
					{
						label: 'ブロックを削除',
						command: '--remove-block',
						commandfor: 'bge-command-bus-vr',
					},
					createElement('span', { dangerouslySetInnerHTML: { __html: ICON_SVG } }),
				),
			);
		});

		await waitForRender();

		const button = host.querySelector('button');
		if (!button) {
			throw new Error('button not found');
		}

		await userEvent.hover(button);
		await expect
			.poll(() => {
				const hint = host.querySelector('[popover="hint"]');
				return hint?.matches(':popover-open') ?? false;
			})
			.toBe(true);
		await waitForRender();

		const hint = host.querySelector('[popover="hint"]');
		if (!hint || !(hint instanceof HTMLElement)) {
			throw new Error('hint not open');
		}
		const base64 = await page.screenshot({ element: hint, save: false });
		const result = await commands.matchScreenshot(
			base64,
			'__snapshots__/block-menu-button/hover-hint.png',
		);
		expect(result.pass, result.message).toBe(true);
	});
});
