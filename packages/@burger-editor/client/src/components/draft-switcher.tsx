import type { BurgerEditorEngine } from '@burger-editor/core';

import { BGE_COMMAND, COMMAND_BUS_ID } from '@burger-editor/core';
import { useEffect, useState } from 'react';

import { useUIState } from '../use-engine.js';

import styles from './draft-switcher.module.css';

/**
 * Main/draft content switcher. Switching and copying are declared as
 * engine commands; the pressed state follows the engine's
 * `bge:switch-content` event and the source-view indicator follows
 * `engine.uiState.sourceMode` — no state is duplicated locally.
 *
 * The alt+double-click source-view toggle is kept as a DOM event —
 * double-click has no Invoker Commands equivalent (the no-click rule
 * targets single-click activation).
 * @param root0
 * @param root0.engine
 * @example
 * ```tsx
 * const container = document.createElement('div');
 * engine.viewArea.insertAdjacentElement('beforebegin', container);
 * reactMount(<DraftSwitcher engine={engine} />, container);
 * ```
 */
export function DraftSwitcher({ engine }: { readonly engine: BurgerEditorEngine }) {
	const uiState = useUIState(engine);
	const [isMain, setIsMain] = useState(engine.content.type === 'main');

	useEffect(() => {
		const update = () => {
			setIsMain(engine.content.type === 'main');
		};
		engine.el.addEventListener('bge:switch-content', update);
		return () => {
			engine.el.removeEventListener('bge:switch-content', update);
		};
	}, [engine]);

	const isVisualMode = !uiState.sourceMode[isMain ? 'main' : 'draft'];

	const toggleDisplayMode = () => {
		engine.uiState.toggleSourceMode(engine.content.type);
	};

	const onDblClickMain = (e: React.MouseEvent) => {
		if (!e.altKey || !isMain) {
			return;
		}
		engine.showMain();
		toggleDisplayMode();
	};

	const onDblClickDraft = (e: React.MouseEvent) => {
		if (!e.altKey || isMain) {
			return;
		}
		engine.showDraft();
		toggleDisplayMode();
	};

	return (
		<div className={styles['draftBtn']}>
			<div className={styles['draftTabBtn']}>
				<button
					type="button"
					aria-pressed={isMain}
					command={BGE_COMMAND.switchContent}
					commandfor={COMMAND_BUS_ID}
					value="main"
					onDoubleClick={onDblClickMain}>
					本稿モード
					{isMain && !isVisualMode ? <span>ソース表示</span> : null}
				</button>
				<button
					type="button"
					aria-pressed={!isMain}
					command={BGE_COMMAND.switchContent}
					commandfor={COMMAND_BUS_ID}
					value="draft"
					onDoubleClick={onDblClickDraft}>
					下書きモード
					{!isMain && !isVisualMode ? <span>ソース表示</span> : null}
				</button>
			</div>
			<div className={styles['draftCopyBtn']}>
				{isMain ? (
					<button
						type="button"
						command={BGE_COMMAND.copyMainToDraft}
						commandfor={COMMAND_BUS_ID}>
						本稿を下書きにコピー
					</button>
				) : (
					<button
						type="button"
						command={BGE_COMMAND.copyDraftToMain}
						commandfor={COMMAND_BUS_ID}>
						下書きを本稿にコピー
					</button>
				)}
			</div>
		</div>
	);
}
