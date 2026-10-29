import type * as YTNamespace from 'youtube';

type YTWindow = Window & { YT?: typeof YTNamespace };

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

// IFrame API の script は文書ごとに 1 回だけ読み込む。API が読み込まれる前に複数の動画を
// 初期化すると、要素ごとに同じ script を挿入してしまうため。読み込みに失敗したら印を消し、
// 次の動画の初期化で読み込み直せるようにする
const apiRequested = new WeakSet<Document>();

/** YouTube IFrame API を用いた動画プレイヤーの管理 */
class YouTube {
	isEmbedded = false;
	movieId: string;
	player: YT.Player | null = null;
	playerDomId: string;
	src: string;
	title: string;
	readonly #doc: Document;
	readonly #win: YTWindow;

	/**
	 * コンストラクタ
	 * @param el
	 */
	constructor(el: HTMLElement) {
		// 要素の属する文書（iframe 内のプレビュー等）に script と player を置く
		this.#doc = el.ownerDocument;
		this.#win = (this.#doc.defaultView ?? window) as unknown as YTWindow;
		this.movieId = el.dataset.id ?? '';
		this.title = el.dataset.title || 'YouTube動画';

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

		this.src = YouTube.getURI(this.movieId, param, this.#win);
		this.playerDomId = this.movieId + '-Player';

		this.#createPlayerFrame(el);
		this.#loadYouTubeAPI();
	}

	#createPlayer(playerID: string): void {
		const YT = this.#win.YT;
		if (!YT) {
			return;
		}
		this.player = new YT.Player(playerID, {
			videoId: this.movieId,
		});
	}

	#createPlayerFrame(el: HTMLElement): void {
		const frame = this.#doc.createElement('iframe');
		frame.className = '-bc-youtube-player-frame-element';
		frame.setAttribute('loading', 'lazy');
		frame.setAttribute('allowfullscreen', '');
		frame.title = this.title;
		frame.src = this.src;
		frame.id = this.playerDomId;

		el.replaceChildren(frame);
	}

	#hasAPI(): boolean {
		return this.#win.YT?.Player != null;
	}

	#loadYouTubeAPI(): void {
		if (!this.#hasAPI() && !apiRequested.has(this.#doc)) {
			apiRequested.add(this.#doc);
			const apiScheme = YouTube.scheme(this.#win);
			const script = this.#doc.createElement('script');
			script.src = `${apiScheme}${YouTube.API_URL}`;
			script.addEventListener('error', () => {
				apiRequested.delete(this.#doc);
				script.remove();
			});
			this.#doc.head.append(script);
		}
		const intervalTimer = setInterval(() => {
			if (!this.player && this.#hasAPI()) {
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
	 * http(s) 以外で開かれたページ（ローカルファイル等）では `//` のままだと解決できないので
	 * `http:` を補う
	 * @param win
	 */
	static scheme(win: Window) {
		return /https?:/i.test(win.location.protocol) ? '' : 'http:';
	}

	/**
	 * YouTubeのiframeのソースURIを生成する
	 * @param movieId
	 * @param param
	 * @param win
	 * @version 0.9.1
	 * @since 0.9.1
	 */
	static getURI(
		movieId: string,
		param: Record<string, string | number | boolean>,
		win: Window,
	) {
		const query = new URLSearchParams();
		for (const [key, value] of Object.entries(param)) {
			query.set(key, String(value));
		}
		return `${YouTube.scheme(win)}${YouTube.PLAYER_URL}${movieId}?${query.toString()}`;
	}
}
