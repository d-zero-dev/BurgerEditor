import { BGE_COMMAND } from '@burger-editor/core';

import { useEngine } from '../engine-context.js';
import { useUIState } from '../use-engine.js';

import styles from './draft-switcher.module.css';

/**
 * Main/draft content switcher. Switching and copying are declared as
 * engine commands; the pressed state follows `engine.uiState.activeArea`
 * and the source-view indicator follows `engine.uiState.sourceMode` — no
 * state is duplicated locally. Reads the engine via {@link useEngine} —
 * the caller wraps this in an `EngineProvider`.
 *
 * The alt+double-click source-view toggle is kept as a DOM event —
 * double-click has no Invoker Commands equivalent (the no-click rule
 * targets single-click activation).
 * @example
 * ```tsx
 * const container = document.createElement('div');
 * engine.viewArea.insertAdjacentElement('beforebegin', container);
 * reactMount(
 * 	<EngineProvider engine={engine}>
 * 		<DraftSwitcher />
 * 	</EngineProvider>,
 * 	container,
 * );
 * ```
 */
export function DraftSwitcher() {
	const engine = useEngine();
	const sourceMode = useUIState((s) => s.sourceMode);
	const isMain = useUIState((s) => s.activeArea === 'main');

	const isVisualMode = !sourceMode[isMain ? 'main' : 'draft'];

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
					commandfor={engine.commandBus.receiverId}
					value="main"
					onDoubleClick={onDblClickMain}>
					本稿モード
					{isMain && !isVisualMode ? <span>ソース表示</span> : null}
				</button>
				<button
					type="button"
					aria-pressed={!isMain}
					command={BGE_COMMAND.switchContent}
					commandfor={engine.commandBus.receiverId}
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
						commandfor={engine.commandBus.receiverId}>
						本稿を下書きにコピー
					</button>
				) : (
					<button
						type="button"
						command={BGE_COMMAND.copyDraftToMain}
						commandfor={engine.commandBus.receiverId}>
						下書きを本稿にコピー
					</button>
				)}
			</div>
		</div>
	);
}
