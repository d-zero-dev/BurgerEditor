import type { ItemSeed } from '@burger-editor/core';

import { createItem } from '@burger-editor/core';

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
 * google-mapsアイテムの定義（Editorを含まない）。`index.tsx` がEditorを合成する。
 */
export const googleMapsDefinition: ItemSeed<string, GoogleMapsData> = {
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
};

export default createItem<GoogleMapsData>(googleMapsDefinition);
