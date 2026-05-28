import type * as YTNamespace from 'youtube';

declare const YT: typeof YTNamespace;

/**
 * YouTube 埋め込みプレイヤーを初期化する
 * @param el data-id にビデオIDを持つ要素
 */
export function youtube(el: HTMLElement) {
	const videoId = el.dataset.id;
	if (videoId) {
		new YouTube(el);
	}
}

/** YouTube IFrame API を用いた動画プレイヤーの管理 */
class YouTube {
	isEmbedded = false;
	movieId: string;
	player: YT.Player | null = null;
	playerDomId: string;
	src: string;
	title: string;

	/**
	 * コンストラクタ
	 * @param el
	 */
	constructor(el: HTMLElement) {
		const $el = $(el);

		this.movieId = $el.data('id');
		this.title = $el.data('title') || 'YouTube動画';

		const param = {
			version: 3,
			rel: 0,
			autoplay: 0,
			controls: 1,
			disablekb: 1, // cspell:disable-line
			iv_load_policy: 3,
			loop: 0,
			modestbranding: 1,
			showinfo: 1,
			wmode: 'transparent', // cspell:disable-line
			enablejsapi: 1, // cspell:disable-line
		};

		this.src = YouTube.getURI(this.movieId, param);
		this.playerDomId = this.movieId + '-Player';

		this.#createPlayerFrame(el);
		this.#loadYouTubeAPI();
	}

	#createPlayer(playerID: string): void {
		this.player = new YT.Player(playerID, {
			videoId: this.movieId,
		});
	}

	#createPlayerFrame(el: HTMLElement): void {
		const $frame = $(
			'<iframe class="-bc-youtube-player-frame-element" loading="lazy" allowfullscreen />',
		);
		$frame.attr('title', this.title);
		$frame.prop({
			src: this.src,
			id: this.playerDomId,
		});

		$(el).empty();
		$frame.prependTo(el);
	}

	#loadYouTubeAPI(): void {
		if (!('YT' in window && YT.Player)) {
			const apiScheme = /https?:/i.test(location.protocol) ? '' : 'http:';
			void $.getScript(`${apiScheme}${YouTube.API_URL}`);
		}
		const intervalTimer = setInterval(() => {
			if (!this.player && 'YT' in window && YT.Player) {
				this.#createPlayer(this.playerDomId);
			}
			if (
				this.player &&
				this.player.pauseVideo != null &&
				this.player.playVideo != null
			) {
				clearInterval(intervalTimer);
				this.#onEmbedded();
			}
		}, 300);
	}

	#onEmbedded(): void {
		this.isEmbedded = true;
	}

	static PLAYER_URL = '//www.youtube.com/embed/';
	static API_URL = '//www.youtube.com/player_api';

	/**
	 * YouTubeのiframeのソースURIを生成する
	 * @param movieId
	 * @param param
	 * @version 0.9.1
	 * @since 0.9.1
	 */
	static getURI(movieId: string, param: Record<string, string | number | boolean>) {
		const paramQuery = $.param(param);
		const apiScheme = /https?:/i.test(location.protocol) ? '' : 'http:';
		return `${apiScheme}${YouTube.PLAYER_URL}${movieId}?${paramQuery}`;
	}
}
