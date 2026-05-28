import type * as BgE from '../BgE.js';

import { arrayToHash } from '@burger-editor/frozen-patty/utils';

/**
 * エディタ全体で使う汎用ユーティリティ。
 * Addon/type/{name}/init.ts からも BgE.Util として参照される公開 API。
 */
// eslint-disable-next-line unicorn/no-static-only-class
export default class Util {
	/**
	 * 現在のURLのオリジン
	 */
	static get origin() {
		return `${location.protocol}//${location.hostname}${location.port ? ':' + location.port : ''}`;
	}

	/**
	 * 改行コードを改行タグに変換
	 * @param text 対象のテキスト
	 * @returns 変換されたテキスト
	 */
	static nl2br(text: string) {
		return `${text}`.replaceAll(/\r\n|\n\r|\r|\n/g, '<br />');
	}

	/**
	 * 改行タグを改行コードに変換
	 * @param text 対象のテキスト
	 * @param html
	 * @returns 変換されたテキスト
	 */
	static br2nl(html: string) {
		return `${html}`.replaceAll(/<\s*br\s*\/?>/g, '\r\n');
	}

	/**
	 * 数値をバイトサイズ単位にフォーマットする
	 * @param byteSize 対象の数値
	 * @param digits 小数点の桁数
	 * @param autoFormat SI接頭辞をつけるかどうか
	 * @returns フォーマットされた文字列
	 */
	static formatByteSize(
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
	 * @param idOrUrl
	 * @params idOrUrl YouTubeのURLもしくはID
	 * @returns 抽出したID
	 */
	static parseYTId(idOrUrl: string) {
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
	 * 現在のウィンドウのサイズから最適なダイアログのサイズを返す
	 * @param maxSize 最大サイズ
	 * @param vector 測る方向 "width" もしくは "height"
	 * @param margin マージン
	 * @returns 最適なサイズ
	 */
	static getDialogSize(maxSize: number, vector: 'width' | 'height', margin = 50) {
		let windowSize: number;
		switch (vector) {
			case 'width': {
				windowSize = window.document.documentElement
					? window.document.documentElement.clientWidth
					: 0;
				break;
			}
			case 'height': {
				windowSize = window.document.documentElement
					? window.document.documentElement.clientHeight
					: 0;
				break;
			}
			default: {
				return 0;
			}
		}
		const result = Math.min(windowSize - margin, maxSize);
		// console.log({maxSize, vector, margin, result});
		return result;
	}

	/**
	 * 正しいCSSクラス名かどうかチェックする
	 * @param className チェック対象
	 * @returns 結果
	 */
	static isValidAsClassName(className: string) {
		const validClassName = /^-?[_a-z][\w-]*$/i;
		return validClassName.test(className);
	}

	/**
	 * background-imageからパスを取得する
	 * @param className チェック対象
	 * @param value
	 * @returns 結果
	 */
	static getBackgroundImagePath(value: string) {
		return decodeURI(
			value.replace(/^url\(["']?([^"']+)["']?\)$/i, '$1').replace(Util.origin, ''),
		);
	}

	static dataOptimize(raws: BgE.IBurgerTypeContentRawMataDatum[]) {
		const a = raws.map(
			(r) =>
				[r.key, r.datum, r.isArray] as [string, BgE.IBurgerTypeContentDatum, boolean],
		);
		return arrayToHash(a);
	}

	/**
	 * UTF-8 対応の Base64 エンコード。embed タイプで HTML/script を安全に保存するために使用。
	 * @param str
	 */
	static base64encode(str: string) {
		const uint8Array = new TextEncoder().encode(str);
		const base64Encoded = btoa(String.fromCodePoint(...uint8Array));
		return base64Encoded;
	}

	/**
	 * Base64変換
	 * @param str
	 */
	static base64decode(str: string) {
		const uint8Array = Uint8Array.from(atob(str), (c) => c.codePointAt(0)!);
		const decodedText = new TextDecoder().decode(uint8Array);
		return decodedText;
	}
}
