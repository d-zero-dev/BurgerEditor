import type { IGridInfo, IScheduledPublishing } from '../BurgerBlock.js';

import semver from 'semver';

import * as BgE from '../../BgE.js';
import BlockOption from '../BlockOption.js';
import Util from '../Util.js';

import EditorDialog from './EditorDialog.js';

/**
 * ブロック単位の設定ダイアログ（オプションクラス・独自クラス・ID・グリッド比・時限公開）。
 * タイプのコンテンツデータとは独立した、ブロックレベルの見た目・挙動設定を編集する。
 */
export default class BlockConfigDialog extends EditorDialog {
	/**
	 * ブロックオプション設定
	 */
	#options: { [optionName: string]: BlockOption } = {};

	/**
	 * コンストラクタ
	 * @param el 編集ダイアログの要素
	 */
	constructor(el: HTMLElement | null) {
		super(el, {
			bgiframe: true, // cspell:disable-line
			autoOpen: false,
			position: semver.gte('1.11.0', jQuery.ui.version, true) ? 'center' : undefined,
			modal: true,
			buttons: {
				// 「キャンセル」ボタンを押すと closeメソッドが発火
				close: 'キャンセル',
				// 「完了」ボタンを押すと completeメソッドが発火
				complete: '完了',
			},
		});

		if (BgE.config.blockClassOption) {
			for (const optionName of Object.keys(BgE.config.blockClassOption)) {
				const optionValues = BgE.config.blockClassOption[optionName];
				if (!optionValues) {
					continue;
				}
				const option: BlockOption = new BlockOption(optionName, optionValues);
				this.#options[optionName] = option;
			}
		}

		if (!el) {
			return;
		}

		// 公開期間設定
		$(el)
			.find('[data-bge-block-option-scheduled-publishing]')
			.each((_, _el) => {
				const $input = $(_el);
				const type = $input.attr('data-bge-block-option-scheduled-publishing');
				switch (type) {
					case 'publish-date':
					case 'unpublish-date': {
						$input.datepicker();
						break;
					}
					case 'publish-time':
					case 'unpublish-time': {
						$input.timepicker({ timeFormat: 'H:i' });
						break;
					}
				}
			});

		// 項目の表示非表示
		if (BgE.config.setting && BgE.config.setting.publishTimer) {
			$('[data-bge-block-option-scheduled-publishing-area]').prop('hidden', false);
		}
	}

	/**
	 * 編集完了時に実行する
	 */
	complete() {
		const currentBlock = BgE.editor.getCurrentBlock();
		if (currentBlock) {
			currentBlock.importOptions(this.#exportOption());
			currentBlock.importCustomClassList(this.#exportCustomClassList());
			currentBlock.importId(this.#exportId());
			currentBlock.importGridInfo(this.#exportGridInfo());
			currentBlock.importScheduledPublishing(this.#exportScheduledPublishing());
		}

		this.close();
	}

	/**
	 * ダイアログに入力された独自クラスを取得
	 */
	#exportCustomClassList(): string[] {
		const $input = this.$el.find(
			'[data-bge-block-option-custom-class] [data-bge-block-option-input]',
		);
		const classListString: string = ($input.val() as string) || '';
		const classList = classListString.split(/\s+/);
		const optimizedClassList: string[] = [];
		const invalidClassList: string[] = [];
		for (const className of classList) {
			if (className !== '' && !optimizedClassList.includes(className)) {
				if (Util.isValidAsClassName(className)) {
					optimizedClassList.push(className);
				} else {
					invalidClassList.push(className);
				}
			}
		}
		if (invalidClassList.length > 0) {
			alert(
				`以下のクラス名は使用できない文字を含むため除外されます。\n${invalidClassList.join('\n')}`,
			);
		}
		return optimizedClassList;
	}

	/**
	 * ダイアログのグリッド情報を取得
	 *
	 */
	#exportGridInfo() {
		const $gridRatio = this.$el.find('[name=bge-grid-ratio]'); // ブロック編集ダイアロググリッド比
		const $gridRatioSP = this.$el.find('[name=bge-sp-grid-ratio]'); // ブロック編集ダイアロググリッド比
		const $gridSPEnabled = this.$el.find('[name=bge-sp-grid-ratio-enabled]');
		const normalRatio = +($gridRatio.val() as string);
		const spRatio = +($gridRatioSP.val() as string);
		const spEnabled = $gridSPEnabled.prop('checked');
		const gridInfo: IGridInfo = {
			normalRatio,
			spRatio,
			spEnabled,
		};
		return gridInfo;
	}

	/**
	 * ダイアログに入力されたIDを取得
	 */
	#exportId() {
		const $input = this.$el.find(
			'[data-bge-block-option-id] [data-bge-block-option-input]',
		);
		const input = (($input.val() as string) || '').trim();
		if (!input) {
			return '';
		}
		const id = BgE.BLOCK_ID_PREFIX + input;
		// 使用可能文字チェック
		if (!/^[\w.:-]+$/.test(id)) {
			alert(`"${id}" はid属性として使用できない文字が含まれています。`);
			return '';
		}
		const currentBlock = BgE.editor.getCurrentBlock();
		if (document.getElementById(id) && currentBlock && currentBlock.id !== id) {
			alert(`"${id}" は既に定義されています。`);
			return '';
		}
		return `${id}`;
	}

	/**
	 * ダイアログで選択されたオプションを取得
	 */
	#exportOption(): BlockOption[] {
		const blockOptions: BlockOption[] = [];
		this.$el.find('[data-bge-block-option]').each((_, el) => {
			const $optionSet = $(el);
			const $selectBox = $optionSet.find('[data-bge-block-option-select-box]');
			if ($selectBox.length === 0) {
				return;
			}
			const $selectedOption = $selectBox.find('option:selected');
			if ($selectedOption.length === 0) {
				return;
			}
			const className = ($selectedOption.val() as string) || '';
			const option = BlockOption.getOption(className);
			if (option) {
				blockOptions.push(option);
			}
		});
		return blockOptions;
	}

	/**
	 * ダイアログの公開期間設定を取得
	 *
	 */
	#exportScheduledPublishing() {
		const _publishDatetime: [string | null, string | null] = [null, null];
		const _unpublishDatetime: [string | null, string | null] = [null, null];
		this.$el.find('[data-bge-block-option-scheduled-publishing]').each((_, _el) => {
			const $input = $(_el);
			const type = $input.attr('data-bge-block-option-scheduled-publishing');
			const value = $input.val();
			if (!value || typeof value !== 'string') {
				return;
			}
			switch (type) {
				case 'publish-date': {
					_publishDatetime[0] = value;
					break;
				}
				case 'publish-time': {
					_publishDatetime[1] = value;
					break;
				}
				case 'unpublish-date': {
					_unpublishDatetime[0] = value;
					break;
				}
				case 'unpublish-time': {
					_unpublishDatetime[1] = value;
					break;
				}
			}
		});
		const publishDatetime =
			_publishDatetime[0] && _publishDatetime[1]
				? _publishDatetime.join(' ')
				: _publishDatetime[0];
		const unpublishDatetime =
			_unpublishDatetime[0] && _unpublishDatetime[1]
				? _unpublishDatetime.join(' ')
				: _unpublishDatetime[0];
		const scheduledPublishing: IScheduledPublishing = {
			publishDatetime: publishDatetime || null,
			unpublishDatetime: unpublishDatetime || null,
		};
		return scheduledPublishing;
	}

	/**
	 * 独自クラスをダイアログに反映させる
	 * @param classList
	 */
	#importCustomClassList(classList: string[]) {
		const $input = this.$el.find(
			'[data-bge-block-option-custom-class] [data-bge-block-option-input]',
		);
		$input.val(classList.join(' '));
	}

	/**
	 * グリッド情報をダイアログに反映
	 * @param gridInfo
	 */
	#importGridInfo(gridInfo: IGridInfo) {
		const currentBlock = BgE.editor.getCurrentBlock();
		if (!currentBlock) {
			// eslint-disable-next-line no-console
			console.warn('BgE.editor.getCurrentBlock() is null.');
			return;
		}

		const $gridChanger = this.$el.find('[data-bge-grid-changer]');
		const $changeables = $(
			currentBlock.node.querySelectorAll('[data-bge-grid-changeable]'),
		);

		// 基本的には項目を隠す
		$gridChanger.hide();

		// [data-bge-grid-changeable] 要素の有無の確認
		if ($changeables.length === 0) {
			return;
		}

		// [data-bge-grid-changeable] 要素がある場合のみ表示
		$gridChanger.show();

		// グリッド変更設定
		const $gridRatio = this.$el.find('[name=bge-grid-ratio]'); // ブロック編集ダイアロググリッド比
		const $gridRatioSP = this.$el.find('[name=bge-sp-grid-ratio]'); // ブロック編集ダイアロググリッド比
		const $gridSPEnabled = this.$el.find('[name=bge-sp-grid-ratio-enabled]');

		$gridRatio.val(`${gridInfo.normalRatio}`);
		if (gridInfo.spEnabled) {
			$gridRatioSP.val(`${gridInfo.spRatio}`);
		}

		$gridSPEnabled.prop('checked', gridInfo.spEnabled);
		$gridRatioSP.prop('disabled', !gridInfo.spEnabled);
		$gridSPEnabled.off().on('change', () => {
			$gridRatioSP.prop('disabled', !$gridSPEnabled.prop('checked'));
		});
	}

	/**
	 * 独自クラスをダイアログに反映させる
	 * @param id
	 */
	#importId(id: string) {
		if (!id) {
			return;
		}
		id = id.replace(new RegExp(`^${BgE.BLOCK_ID_PREFIX}`), '');
		const $input = this.$el.find(
			'[data-bge-block-option-id] [data-bge-block-option-input]',
		);
		$input.val(id);
	}

	/**
	 * オプションをダイアログに反映させる
	 * @param blockOptions
	 */
	#importOption(blockOptions: BlockOption[]) {
		this.$el.find('[data-bge-block-option]').each((_, el) => {
			const $optionSet = $(el);
			const optionName = $optionSet.attr('data-bge-block-option') || '';
			const option = this.#options[optionName];
			if (!option) {
				return;
			}
			const $selectBox = $optionSet.find('[data-bge-block-option-select-box]');
			if ($selectBox.length === 0) {
				return;
			}
			let hasSelectedOption = false;
			for (const classInfo of option.classList) {
				const $optionEl = $(
					`<option value="${classInfo.className}">${classInfo.label}</option>`,
				);
				$optionEl.appendTo($selectBox);
				for (const blockOption of blockOptions) {
					if (
						blockOption.currentClass &&
						blockOption.currentClass.className === classInfo.className
					) {
						$optionEl.prop('selected', true);
						hasSelectedOption = true;
					}
				}
			}
			$selectBox.prepend(
				$(`<option${hasSelectedOption ? '' : ' selected'}>指定なし</option>`),
			);
		});
	}

	/**
	 * 公開期間設定をダイアログに反映
	 * @param scheduledPublishing
	 */
	#importScheduledPublishing(scheduledPublishing: IScheduledPublishing) {
		if (scheduledPublishing.publishDatetime) {
			const [date, time] = scheduledPublishing.publishDatetime.split(' ');
			if (date) {
				this.$el
					.find('[data-bge-block-option-scheduled-publishing="publish-date"]')
					.val(date);
				this.$el
					.find('[data-bge-block-option-scheduled-publishing="publish-time"]')
					.val(time ?? '00:00');
			}
		}
		if (scheduledPublishing.unpublishDatetime) {
			const [date, time] = scheduledPublishing.unpublishDatetime.split(' ');
			if (date) {
				this.$el
					.find('[data-bge-block-option-scheduled-publishing="unpublish-date"]')
					.val(date);
				this.$el
					.find('[data-bge-block-option-scheduled-publishing="unpublish-time"]')
					.val(time ?? '00:00');
			}
		}
	}

	/**
	 * 編集ダイアログを開いた時の処理
	 *
	 * override前提
	 *
	 */
	protected override _close() {
		$('[data-bge-grid-changer]').hide();
		BgE.save();
	}

	/**
	 * 編集ダイアログを開いた時の処理
	 * @override
	 */
	protected override _open() {
		this.reset();

		const currentBlock = BgE.editor.getCurrentBlock();
		if (currentBlock) {
			this.#importOption(currentBlock.exportOptions());
			this.#importCustomClassList(currentBlock.exportCustomClassList());
			this.#importId(currentBlock.exportId());
			this.#importGridInfo(currentBlock.exportGridInfo());
			this.#importScheduledPublishing(currentBlock.exportScheduledPublishing());
		}
	}

	/**
	 * 編集ダイアログ内の入力内容を空にする
	 */
	override reset() {
		super.reset();
		this.$el.find('[data-bge-block-option-select-box]').empty();
	}
}
