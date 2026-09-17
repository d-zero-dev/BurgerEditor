import type { ItemEditorProps } from '@burger-editor/core';

import { TextField, useCommand } from '@burger-editor/client/ui';
import { createItem } from '@burger-editor/core';
import { useEffect, useEffectEvent, useId, useRef } from 'react';

import style from './style.css';
import template from './template.html';

export type GoogleMapsData = {
	lat: number;
	lng: number;
	zoom: number;
	url: string;
	img: string;
	search: string;
};

/**
 * google-mapsアイテムのエディタ。地図の初期化・ドラッグ/ズーム連動・
 * 住所検索を扱う。
 *
 * createItemのオブジェクトメソッド省略記法（`Editor(props) {...}`）のまま
 * だとReact Compilerがコンポーネントとして認識しないため、名前付き
 * トップレベル関数として切り出し`Editor: GoogleMapsEditor`で参照する。
 * @param root0
 * @param root0.state
 * @param root0.setState
 */
function GoogleMapsEditor({ state, setState }: ItemEditorProps<GoogleMapsData>) {
	const rootId = useId();
	const mapNodeRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<google.maps.Map | null>(null);
	const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
	const geocoderRef = useRef<google.maps.Geocoder | null>(null);

	// マウント時のみ地図を初期化するため、初期中心・zoomは
	// useEffectEventで読む（依存配列[]を正直に保てる — 抑制コメントは
	// React Compilerがコンポーネント全体の最適化を諦める条件でもある）。
	// 以降のlat/lng/zoomはこのeffect内のイベントリスナーがsetStateする
	// 側であり、この初期化effect自体を再実行してはいけない
	const getInitialPosition = useEffectEvent(() => ({
		lat: state.lat,
		lng: state.lng,
		zoom: state.zoom,
	}));

	useEffect(() => {
		const mapNode = mapNodeRef.current;
		if (!mapNode) {
			// eslint-disable-next-line no-console
			console.error('Map node not found');
			return;
		}

		geocoderRef.current = new google.maps.Geocoder();

		const { lat, lng, zoom } = getInitialPosition();
		const latlng = new google.maps.LatLng(lat, lng);
		const map = new google.maps.Map(mapNode, {
			mapId: 'bge-google-maps',
			zoom,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			center: latlng,
		});
		mapRef.current = map;

		const marker = new google.maps.marker.AdvancedMarkerElement({
			position: latlng,
			map: map,
		});
		markerRef.current = marker;

		const getCenter = () => {
			const center = map.getCenter();
			if (!center) {
				throw new Error('Getting center failed');
			}
			return center;
		};

		const moveMarkerToCenter = () => {
			marker.position = getCenter();
			const markerLat = getCenter().lat();
			const markerLng = getCenter().lng();
			setState((prev) => ({ ...prev, lat: markerLat, lng: markerLng }));
		};

		let dragTimer: number | undefined;

		google.maps.event.addListener(map, 'dragend', () => {
			dragTimer = window.setTimeout(() => {
				moveMarkerToCenter();
			}, 10);
		});
		google.maps.event.addListener(map, 'drag', () => {
			window.clearTimeout(dragTimer);
			moveMarkerToCenter();
		});
		google.maps.event.addListener(map, 'idle', () => {
			window.clearTimeout(dragTimer);
			moveMarkerToCenter();
		});
		google.maps.event.addListener(map, 'zoom_changed', () => {
			const changedZoom = map.getZoom();
			marker.position = getCenter();
			if (changedZoom != null && Number.isFinite(changedZoom)) {
				setState((prev) => ({ ...prev, zoom: changedZoom }));
			}
		});

		return () => {
			google.maps.event.clearInstanceListeners(map);
		};
	}, []);

	const rootRef = useCommand<HTMLDivElement>({
		'--search-address': () => {
			const map = mapRef.current;
			const marker = markerRef.current;
			const geocoder = geocoderRef.current;
			if (!map || !marker || !geocoder) {
				return;
			}
			void geocoder.geocode(
				{
					address: state.search ?? '',
				},
				(results, status): void => {
					const result = results?.[0];
					if (result && status === google.maps.GeocoderStatus.OK) {
						map.setCenter(result.geometry.location);
						marker.position = result.geometry.location;
						const center = map.getCenter();
						if (!center) {
							return;
						}
						setState((prev) => ({ ...prev, lat: center.lat(), lng: center.lng() }));
					} else {
						alert(
							'住所から場所を特定できませんでした。最初にビル名などを省略し、番地までの検索などでお試しください。',
						);
					}
				},
			);
		},
	});

	return (
		<div ref={rootRef} id={rootId}>
			<div
				id="bge-google-maps"
				ref={mapNodeRef}
				style={{ inlineSize: '100%', aspectRatio: '8 / 5' }}>
				map
			</div>
			<div>
				<TextField
					label="住所から検索"
					name="bge-search"
					value={state.search ?? ''}
					onChange={(search) => setState({ ...state, search })}
				/>
				<button
					type="button"
					name="bge-search-button"
					command="--search-address"
					commandfor={rootId}>
					検索
				</button>
			</div>
			<div>
				<label>
					<span>緯度</span>
					<output name="bge-lat">{state.lat}</output>
				</label>
				<label>
					<span>経度</span>
					<output name="bge-lng">{state.lng}</output>
				</label>
			</div>
		</div>
	);
}

export default createItem<GoogleMapsData>({
	version: __VERSION__,
	name: 'google-maps',
	template,
	style,
	editorOptions: {
		isDisable(item) {
			if (item.config.googleMapsApiKey) {
				return '';
			}
			return 'Google Maps APIキーが登録されていないため、利用できません。\n「システム設定」からAPIキーを登録することができます。';
		},
	},
	toItemData(state, config) {
		const url = `//maps.apple.com/?q=${state.lat},${state.lng}`;
		const BASE_URL = '//maps.google.com/maps/api/staticmap';
		const param = new URLSearchParams({
			center: [state.lat, state.lng].join(','),
			zoom: `${state.zoom}`,
			scale: '2',
			size: `${640}x${400}`,
			markers: `color:red|color:red|${state.lat},${state.lng}`,
			key: config.googleMapsApiKey ?? '',
		});
		const img = `${BASE_URL}?${param}`;

		return {
			...state,
			url,
			img,
		};
	},
	Editor: GoogleMapsEditor,
});
