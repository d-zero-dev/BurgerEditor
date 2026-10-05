import type { GoogleMapsData } from './definition.js';

import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { GoogleMapsEditor } from './editor.js';

type Listener = () => void;

const listeners = new Map<string, Listener>();

/**
 * Google Maps JS APIの最小スタブ。エディタが登録するリスナーを捕捉し、
 * テストから任意のタイミングで発火できるようにする
 */
function stubGoogleMaps() {
	listeners.clear();
	const center = { lat: () => 35, lng: () => 139 };
	vi.stubGlobal('google', {
		maps: {
			Geocoder: class {},
			LatLng: class {},
			MapTypeId: { ROADMAP: 'roadmap' },
			Map: class {
				getCenter() {
					return center;
				}
				getZoom() {
					return 10;
				}
			},
			marker: { AdvancedMarkerElement: class {} },
			event: {
				addListener: (_map: unknown, name: string, listener: Listener) => {
					listeners.set(name, listener);
				},
				clearInstanceListeners: () => {
					listeners.clear();
				},
			},
		},
	});
}

const initial: GoogleMapsData = {
	lat: 35,
	lng: 139,
	zoom: 10,
	url: '',
	img: '',
	search: '',
};

beforeEach(() => {
	vi.useFakeTimers();
	stubGoogleMaps();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('GoogleMapsEditor — dragTimer', () => {
	test('dragend直後にアンマウントすると、保留中のタイマーがunmount後にsetStateしない', () => {
		const setState = vi.fn();
		const { unmount } = render(
			<GoogleMapsEditor state={initial} setState={setState} item={{} as never} />,
		);

		listeners.get('dragend')?.();
		unmount();
		vi.advanceTimersByTime(100);

		expect(setState).not.toHaveBeenCalled();
	});

	test('dragendが連続発火してもアンマウントで両方のタイマーが止まる', () => {
		const setState = vi.fn();
		const { unmount } = render(
			<GoogleMapsEditor state={initial} setState={setState} item={{} as never} />,
		);

		listeners.get('dragend')?.();
		listeners.get('dragend')?.();
		unmount();
		vi.advanceTimersByTime(100);

		expect(setState).not.toHaveBeenCalled();
	});

	test('アンマウントしなければdragend後のタイマーで中心座標がsetStateされる', () => {
		const setState = vi.fn();
		render(<GoogleMapsEditor state={initial} setState={setState} item={{} as never} />);

		listeners.get('dragend')?.();
		vi.advanceTimersByTime(100);

		expect(setState).toHaveBeenCalledTimes(1);
	});
});
