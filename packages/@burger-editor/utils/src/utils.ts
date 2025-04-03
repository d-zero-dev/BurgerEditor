import dayjs from 'dayjs';

/**
 * 現在のURLのオリジン
 */
export function origin() {
	return `${location.protocol}//${location.hostname}${location.port ? ':' + location.port : ''}`;
}

/**
 * 改行コードを改行タグに変換
 * @param text 対象のテキスト
 * @returns 変換されたテキスト
 */
export function nl2br(text: string) {
	return `${text}`.replaceAll(/\r\n|\n\r|\r|\n/g, '<br />');
}

/**
 * 改行タグを改行コードに変換
 * @param html
 * @returns 変換されたテキスト
 */
export function br2nl(html: string) {
	return `${html}`.replaceAll(/<\s*br\s*\/?>/g, '\r\n');
}

/**
 * 数値をバイトサイズ単位にフォーマットする
 * @param byteSize 対象の数値
 * @param digits 小数点の桁数
 * @param autoFormat SI接頭辞をつけるかどうか
 * @returns フォーマットされた文字列
 */
export function formatByteSize(
	byteSize: number,
	digits: number = 2,
	autoFormat: boolean = true,
) {
	let compute = byteSize;
	let counter = 0;
	const unit = ['byte', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB'] as const;
	if (autoFormat) {
		while (compute > 1024) {
			compute /= 1024;
			counter += 1;
		}
		if (counter === 0) {
			digits = 0;
		}
		return compute.toFixed(digits) + unit[counter];
	} else {
		return byteSize + unit[0];
	}
}

/**
 * Unixタイムスタンプを日付文字列に変換する
 * @param timestamp Unixタイムスタンプ
 * @param format フォーマット
 */
export function formatDate(timestamp: number, format: string) {
	return dayjs.unix(timestamp).format(format);
}

/**
 * YouTubeの動画URLからIDを抽出する
 *
 * 何も抽出できなかった場合 空文字列を返す
 *
 * 参考: http://stackoverflow.com/questions/6903823/regex-for-youtube-id
 * 以下の形式が対応可能
 * http://www.youtube.com/sandalsResorts#p/c/54B8C800269D7C1B/0/FJUvudQsKCM
 * http://youtu.be/NLqAF9hrVbY
 * http://www.youtube.com/embed/NLqAF9hrVbY
 * https://www.youtube.com/embed/NLqAF9hrVbY
 * http://www.youtube.com/v/NLqAF9hrVbY?fs=1&hl=en_US
 * http://www.youtube.com/watch?v=NLqAF9hrVbY
 * http://www.youtube.com/ytscreeningroom?v=NRHVzbJVx8I
 * http://www.youtube.com/watch?v=JYArUl0TzhA&feature=featured
 * @param idOrUrl YouTubeのURLもしくはID
 * @returns 抽出したID
 */
export function parseYTId(idOrUrl: string) {
	let id = '';
	if (!idOrUrl) {
		return id;
	}
	const match = idOrUrl.match(
		/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=))([\w-]{10,12})\b/, // cspell:disable-line
	);
	if (match) {
		id = match[1] ?? '';
	} else {
		id = idOrUrl;
	}
	return id;
}

/**
 * 正しいCSSクラス名かどうかチェックする
 * @param className チェック対象
 * @returns 結果
 */
export function isValidAsClassName(className: string) {
	const validClassName = /^-?[_a-z][\w-]*$/i;
	return validClassName.test(className);
}

/**
 * background-imageからパスを取得する
 * @param value
 * @returns 結果
 */
export function getBackgroundImagePath(value: string) {
	return decodeURI(
		value.replace(/^url\(["']?([^"']+)["']?\)$/i, '$1').replace(origin(), ''),
	);
}

/**
 *
 * @param html
 */
export function strToDOM(html: string) {
	const doc = new DOMParser().parseFromString(html, 'text/html');
	const el = doc.body.firstElementChild;
	if (!el || !(el instanceof HTMLElement)) {
		throw new Error(`Element not found: ${html}`);
	}
	return el;
}
