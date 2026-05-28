import * as BgE from '../BgE.js';

import BurgerEditorElement from './BurgerEditorElement.js';

/**
 * ブロックホバー時に表示されるフローティング操作メニュー。
 * 移動・挿入・コピー・削除・設定の各操作ボタンを提供する。
 * iframe 内の ContentArea に配置され、ブロックの BoundingClientRect に追従する。
 */
export default class BlockMenu extends BurgerEditorElement {
	#isHover: boolean;

	get hidden() {
		return !this.visible();
	}

	get isHover() {
		return this.#isHover;
	}

	/**
	 * コンストラクタ
	 * @param parentBlock 属するブロック
	 * @param el
	 */
	constructor(el: HTMLElement) {
		el.dataset.bge = 'bgb-menu';
		el.innerHTML = `
			<div class="bgb-menu-buttons">
				<div class="bgb-menu-btn-area-move">
					<button type="button" class="bgb-menu-move-up"><span>ひとつ上へ移動</span></button>
					<button type="button" class="bgb-menu-move-down"><span>ひとつ下へ移動</span></button>
				</div>
				<div class="bgb-menu-btn-area-command">
					<button type="button" class="bgb-menu-insert-before"><span>上にブロックを追加</span></button>
					<button type="button" class="bgb-menu-insert-after"><span>下にブロックを追加</span></button>
					<button type="button" class="bgb-menu-block-config"><span>オプション設定</span></button>
					<button type="button" class="bgb-menu-block-copy"><span>ブロックをコピー</span></button>
					<button type="button" class="bgb-menu-delete"><span>ブロックを削除</span></button>
				</div>
			</div>
		`;
		super(el);
		this.#isHover = false;

		this.hide();

		const $el = $(this.node);
		$el.on(
			'click',
			'.bgb-menu-insert-before, .bgb-menu-insert-after',
			this.#insert.bind(this),
		);
		$el.on('click', '.bgb-menu-block-config', this.#openConfig.bind(this));
		$el.on('click', '.bgb-menu-block-copy', this.#copy.bind(this));
		$el.on('click', '.bgb-menu-delete', this.#delete.bind(this));
		$el.on('click', '.bgb-menu-move-up, .bgb-menu-move-down', this.#move.bind(this));
		$el.on('mouseenter', () => (this.#isHover = true));
		$el.on('mouseleave', () => (this.#isHover = false));
	}

	/**
	 * ブロックの矩形に合わせてメニュー位置を更新する
	 * @param rect ブロックの BoundingClientRect
	 */
	setPosition(rect: ClientRect) {
		this.node.style.top = `${rect.top}px`;
		this.node.style.left = `${rect.left}px`;
		this.node.style.width = `${rect.width}px`;
	}

	/**
	 * コピー
	 */
	#copy() {
		const currentBlock = BgE.editor.getCurrentBlock();
		if (BgE.editorStatus.isProcessed || !currentBlock) {
			return;
		}
		if (currentBlock.name === 'unknown') {
			alert(
				'このブロックをコピーするには、ブロックのアップデートが必要です。\nブロックをアップロードしてください。',
			);
			return;
		}
		this.hide();
		const html = currentBlock.getHTMLStringify();
		this.show();
		BgE.copyBlock(html);
		$(`
			<div id="bge-dialog" title="ブロックをコピーしました">
				<p>ブロックの追加ボタンからペースト（貼り付ける）ことができます。</p>
			</div>
		`).dialog({
			show: {
				effect: 'fade',
				duration: 300,
			},
			hide: {
				effect: 'fade',
				duration: 300,
			},
			width: 260,
			height: 130,
			resizable: false,
			open: (e: Event) => {
				setTimeout(() => {
					if (!e.target) {
						return;
					}
					$(e.target).dialog('close');
				}, 3000);
			},
		});
	}

	/**
	 * 削除
	 *
	 */
	async #delete() {
		const currentBlock = BgE.editor.getCurrentBlock();
		if (BgE.editorStatus.isProcessed || !currentBlock) {
			return;
		}
		if (
			confirm(
				'ブロック要素を削除します。\n削除したブロック要素はもとに戻すことはできません。\n削除してもよろしいですか？',
			)
		) {
			BgE.editorStatus.isProcessed = true;
			BgE.currentContentArea.blockMenu.hide();
			await currentBlock.animate({ height: 0, opacity: 0 }, 500);
			BgE.editor.clearCurrentBlock();
			currentBlock.remove();
			BgE.save();
			BgE.editorStatus.isProcessed = false;
		}
	}

	/**
	 * ブロック挿入
	 * @param e
	 */
	#insert(e: JQueryEventObject) {
		const currentBlock = BgE.editor.getCurrentBlock();
		if (currentBlock) {
			const $this = $(e.target);
			const isAfter = $this.hasClass('bgb-menu-insert-after');
			BgE.insertionPoint.set(currentBlock, isAfter);
			BgE.blockListDialog.open();
		}
	}

	/**
	 * 移動
	 * @param e
	 */
	#move(e: JQueryEventObject) {
		const currentBlock = BgE.editor.getCurrentBlock();
		if (BgE.editorStatus.isProcessed || !currentBlock) {
			return;
		}
		const $this = $(e.target);
		const $from = $(currentBlock.node);
		const isUp = $this.hasClass('bgb-menu-move-up');
		let $to: JQuery;
		if (isUp) {
			$to = $from.prev();
		} else {
			$to = $from.next();
		}
		const DURATION = 600;
		const areaStyle = {
			visibility: 'hidden',
			pointerEvents: 'none',
		};
		BgE.editorStatus.isProcessed = true;
		this.hide();
		$from.add($to).addClass('-bge-animation-replacement');
		$('.bge-view-value').css('position', 'relative');
		const fromRectBefore = $from.position();
		const toRectBefore = $to.position();
		if (isUp) {
			$from.insertBefore($to);
		} else {
			$from.insertAfter($to);
		}
		const fromRectAfter = $to.position();
		const toRectAfter = $from.position();
		const $fromArea = $('<div />');
		const $toArea = $('<div />');
		$fromArea.append($from.clone()).css(areaStyle);
		$toArea.append($to.clone()).css(areaStyle);
		$fromArea.insertAfter($from);
		$toArea.insertAfter($to);
		$from.css({
			position: 'absolute',
			top: fromRectBefore.top,
			left: fromRectBefore.left,
			zIndex: 1,
		});
		$to.css({
			position: 'absolute',
			top: toRectBefore.top,
			left: toRectBefore.left,
			zIndex: 0,
		});
		$from.animate(
			{
				top: toRectAfter.top,
				left: toRectAfter.left,
			},
			DURATION,
		);
		$to.animate(
			{
				top: fromRectAfter.top,
				left: fromRectAfter.left,
			},
			DURATION,
			() => {
				$fromArea.remove();
				$toArea.remove();
				$from.removeAttr('style');
				$to.removeAttr('style');
				$from.add($to).removeClass('-bge-animation-replacement');
				BgE.editorStatus.isProcessed = false;
				BgE.save();
			},
		);
	}

	/**
	 * オプション設定を開く
	 */
	#openConfig() {
		if (BgE.editorStatus.isProcessed) {
			return;
		}
		BgE.blockConfigDialog.open();
	}

	/**
	 * メニューアイコンの非表示
	 */
	override hide() {
		super.hide();
		const $this = $(this.getNode());
		$this.find('.bgb-menu-move-up, .bgb-menu-move-down').prop('disabled', false);
	}

	/**
	 * メニューアイコンの表示
	 */
	override show() {
		super.show();
		const $this = $(this.getNode());
		const currentBlock = BgE.editor.getCurrentBlock();
		if (currentBlock && !currentBlock.existPrev()) {
			$this.find('.bgb-menu-move-up').prop('disabled', true);
		}
		if (currentBlock && !currentBlock.existNext()) {
			$this.find('.bgb-menu-move-down').prop('disabled', true);
		}
	}
}
