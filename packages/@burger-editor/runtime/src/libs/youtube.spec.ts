import type * as YouTubeModule from './youtube.js';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let youtube: typeof YouTubeModule.youtube;

const QUERY =
	'version=3&rel=0&autoplay=0&controls=1&disablekb=1&iv_load_policy=3&loop=0&modestbranding=1&showinfo=1&wmode=transparent&enablejsapi=1'; // cspell:disable-line

/**
 * YouTube タイプの要素を作って body に置く
 * @param id
 * @param title
 */
function create(id: string | null, title?: string) {
	const el = document.createElement('div');
	el.className = 'bgt-youtube';
	if (id != null) {
		el.dataset.id = id;
	}
	if (title != null) {
		el.dataset.title = title;
	}
	el.innerHTML = '<img src="/thumb.jpg" alt="" /><p>placeholder</p>';
	document.body.append(el);
	return el;
}

/**
 * 挿入された IFrame API の script
 */
function apiScripts() {
	return document.querySelectorAll('script[src$="//www.youtube.com/player_api"]');
}

beforeEach(async () => {
	vi.useFakeTimers();
	// API の読み込み済みフラグはモジュールが持つので、テストごとに読み直す
	vi.resetModules();
	const youtubeModule = await import('./youtube.js');
	youtube = youtubeModule.youtube;
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	document.body.innerHTML = '';
	document.head.innerHTML = '';
});

describe('youtube: player frame', () => {
	it('replaces the content with an iframe for the video', () => {
		const el = create('abc123', 'My video');
		youtube(el);
		expect(el.children).toHaveLength(1);
		const frame = el.querySelector('iframe');
		expect(frame?.className).toBe('-bc-youtube-player-frame-element');
		expect(frame?.getAttribute('loading')).toBe('lazy');
		expect(frame?.hasAttribute('allowfullscreen')).toBe(true);
		expect(frame?.title).toBe('My video');
		expect(frame?.id).toBe('abc123-Player');
		expect(frame?.getAttribute('src')).toBe(`//www.youtube.com/embed/abc123?${QUERY}`);
	});

	it('falls back to the default title', () => {
		const el = create('abc123');
		youtube(el);
		expect(el.querySelector('iframe')?.title).toBe('YouTube動画');
	});

	it('prefixes the scheme when the page is not served over http(s)', () => {
		vi.stubGlobal('location', { protocol: 'file:' });
		const el = create('abc123');
		youtube(el);
		expect(el.querySelector('iframe')?.getAttribute('src')).toBe(
			`http://www.youtube.com/embed/abc123?${QUERY}`,
		);
		expect(apiScripts()[0]?.getAttribute('src')).toBe(
			'http://www.youtube.com/player_api',
		);
	});

	it('does nothing without data-id', () => {
		const el = create(null);
		youtube(el);
		expect(el.querySelector('iframe')).toBeNull();
		expect(apiScripts()).toHaveLength(0);
	});
});

describe('youtube: IFrame API', () => {
	it('loads the API script once for the page', () => {
		youtube(create('a'));
		youtube(create('b'));
		expect(apiScripts()).toHaveLength(1);
	});

	it('does not load the API script when YT.Player already exists', () => {
		vi.stubGlobal('YT', { Player: class {} });
		youtube(create('a'));
		expect(apiScripts()).toHaveLength(0);
	});

	it('creates the player once the API is available and stops polling', () => {
		const calls: unknown[][] = [];
		class Player {
			constructor(...args: unknown[]) {
				calls.push(args);
			}
			pauseVideo() {}
			playVideo() {}
		}
		youtube(create('abc'));
		expect(calls).toHaveLength(0);
		vi.stubGlobal('YT', { Player });
		vi.advanceTimersByTime(300);
		expect(calls).toEqual([['abc-Player', { videoId: 'abc' }]]);
		vi.advanceTimersByTime(3000);
		expect(calls).toHaveLength(1);
	});

	it('loads the API script again for the next video after the script failed', () => {
		youtube(create('a'));
		const first = apiScripts()[0];
		expect(first).toBeDefined();
		first?.dispatchEvent(new Event('error'));
		expect(apiScripts()).toHaveLength(0);
		youtube(create('b'));
		expect(apiScripts()).toHaveLength(1);
	});
});
