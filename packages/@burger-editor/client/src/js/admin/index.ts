/**
 * 管理画面エントリポイント。
 * BgE を window に公開し、Addon/type/{name}/init.js からグローバル参照可能にする。
 * 初期化後に yuga.js が自動付与するクラス（.even, .odd 等）を除去する（スタイル衝突防止）。
 * @module
 */

import 'core-js';

import * as BgE from './BgE.js';

// @ts-ignore
window['BgE'] = BgE;

$(() => {
	$('#PageName').focus();

	BgE.init();

	// yuga.jsのクラス追加を削除
	$('.even').removeClass('even');
	$('.odd').removeClass('odd');
	$('.empty').removeClass('empty');
	$('.firstChild').removeClass('firstChild');
	$('.lastChild').removeClass('lastChild');
	$('br').removeAttr('class');
});
