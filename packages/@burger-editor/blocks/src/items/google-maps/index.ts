import { createItem } from '../../create-item.js';

import editor from './editor.html';
import style from './style.css';
import template from './template.html';

export default createItem<
	{
		lat: number;
		lng: number;
		zoom: number;
		url: string;
		img: string;
		search: string;
	},
	{
		search: (() => void) | null;
	}
>({
	version: __VERSION__,
	name: 'google-maps',
	template,
	style,
	editor,
	editorOptions: {
		customData: {
			search: null,
		},
		open(_, editor) {
			const mapNode = editor.find('#bge-google-maps');
			if (!mapNode) {
				// eslint-disable-next-line no-console
				console.error('Map node not found');
				return;
			}

			const geocoder = new google.maps.Geocoder();
			const lat = editor.get('$lat');
			const lng = editor.get('$lng');
			const zoom = editor.get('$zoom');

			const $bgeGoogleMapsSearchButton = editor.find<HTMLInputElement>(
				'[name=bge-search-button]',
			);

			const latlng = new google.maps.LatLng(lat, lng);
			const map = new google.maps.Map(mapNode, {
				mapId: 'bge-google-maps',
				zoom,
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				center: latlng,
			});

			const marker = new google.maps.marker.AdvancedMarkerElement({
				position: latlng,
				map: map,
			});

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
				editor.update('$lat', markerLat);
				editor.update('$lng', markerLng);
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
					editor.update('$zoom', changedZoom);
				}
			});

			const search = (): void => {
				const address = editor.get('$search');
				void geocoder.geocode(
					{
						address,
					},
					(results, status): void => {
						const result = results?.[0];
						if (result && status === google.maps.GeocoderStatus.OK) {
							map.setCenter(result.geometry.location);
							marker.position = result.geometry.location;
							const geolat = getCenter().lat();
							const geoLng = getCenter().lng();
							editor.update('$lat', geolat);
							editor.update('$lng', geoLng);
						} else {
							alert(
								'住所から場所を特定できませんでした。最初にビル名などを省略し、番地までの検索などでお試しください。',
							);
						}
					},
				);
			};

			$bgeGoogleMapsSearchButton?.addEventListener('click', search);
			editor.setCustomData('search', search);
		},
		beforeChange(newData, editor) {
			const url = `//maps.apple.com/?q=${newData.lat},${newData.lng}`;
			const BASE_URL = '//maps.google.com/maps/api/staticmap';
			const param = new URLSearchParams({
				center: [newData.lat, newData.lng].join(','),
				zoom: `${newData.zoom}`,
				scale: '2',
				size: `${640}x${400}`,
				markers: `color:red|color:red|${newData.lat},${newData.lng}`,
				key: editor.engine.config.googleMapsApiKey ?? '',
			});
			const img = `${BASE_URL}?${param}`;

			return {
				...newData,
				url,
				img,
			};
		},
		migrate(item) {
			const data = item.export();
			// 2.10.0
			const lat = data.lat;
			const lng = data.lng;
			data.url = `//maps.apple.com/?q=${lat},${lng}`;
			return data;
		},
		isDisable(item) {
			if (item.editor.engine.config.googleMapsApiKey) {
				return '';
			}
			return 'Google Maps APIキーが登録されていないため、利用できません。\n「システム設定」からAPIキーを登録することができます。';
		},
	},
});
