const MAP_ID_PREFIX = 'bge-map-';

let idNum = 0;

/**
 * Google Maps を要素の data 属性（lat, lng, zoom）から初期化する
 * @param el Google Maps を描画する要素
 */
export async function googleMaps(el: HTMLElement) {
	if (!window?.google?.maps) {
		return;
	}

	// @ts-ignore
	google.maps.marker = await google.maps.importLibrary('marker');

	const $el = $(el);

	const defaultLat = 35.681_382;
	const defaultLng = 139.766_084;
	const defaultZoom = 14;

	const mapCenterLat = +$el.data('lat') || defaultLat;
	const mapCenterLng = +$el.data('lng') || defaultLng;
	const zoom = +$el.data('zoom') || defaultZoom;

	const letLng = new google.maps.LatLng(mapCenterLat, mapCenterLng);

	const mapOption: google.maps.MapOptions = {
		mapId: `${MAP_ID_PREFIX}${idNum++}`,
		zoom,
		scrollwheel: false,
		center: letLng,
		mapTypeControlOptions: {
			mapTypeIds: [google.maps.MapTypeId.HYBRID, google.maps.MapTypeId.ROADMAP],
		},
	};

	const map = new google.maps.Map(el, mapOption);

	new google.maps.marker.AdvancedMarkerElement({
		position: letLng,
		map,
	});
}
