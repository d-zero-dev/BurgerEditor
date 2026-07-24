import {
	IconArrowsTransferDown,
	IconRowInsertBottom,
	IconTrash,
} from '@tabler/icons-react';
import { useId } from 'react';

import { useCommand } from '../use-command.js';

import styles from './table-editor.module.css';

/**
 * Row-aligned table cell text: `th[i]` and `td[i]` form one row. In the
 * table item the `td` cells hold Markdown while editing (converted
 * to/from HTML via `toEditorState`/`toItemData`); `th` cells stay plain.
 */
export interface TableEditorData {
	readonly th: readonly string[];
	readonly td: readonly string[];
}

/**
 * Table row editor as a fully controlled component. The table item's
 * editor owns the state; row operations are declared as local commands.
 * @param root0
 * @param root0.value
 * @param root0.onChange
 * @example
 * ```tsx
 * <TableEditor
 * 	value={{ th: state.th ?? [], td: state.td ?? [] }}
 * 	onChange={({ th, td }) => setState({ ...state, th: [...th], td: [...td] })}
 * />
 * ```
 */
export function TableEditor({
	value,
	onChange,
}: {
	readonly value: TableEditorData;
	readonly onChange: (value: TableEditorData) => void;
}) {
	const rootId = useId();

	const rows: readonly [th: string, td: string][] = value.th.map((th, i) => [
		th,
		value.td[i] ?? '',
	]);

	const commit = (next: readonly [string, string][]) => {
		onChange({
			th: next.map(([th]) => th),
			td: next.map(([, td]) => td),
		});
	};

	const rootRef = useCommand<HTMLDivElement>({
		'--add-row': (e) => {
			const index = Number((e.source as HTMLButtonElement | null)?.value);
			commit(rows.toSpliced(index + 1, 0, ['', '']));
		},
		'--remove-row': (e) => {
			const index = Number((e.source as HTMLButtonElement | null)?.value);
			commit(rows.toSpliced(index, 1));
		},
		'--move-row-down': (e) => {
			const from = Number((e.source as HTMLButtonElement | null)?.value);
			const to = from + 1;
			const fromRow = rows[from];
			const toRow = rows[to];
			if (!fromRow || !toRow) {
				return;
			}
			commit(rows.toSpliced(from, 1, toRow).toSpliced(to, 1, fromRow));
		},
	});

	return (
		<div className={styles['table']} ref={rootRef} id={rootId}>
			{rows.map(([th, td], i) => (
				<div className={styles['row']} key={i}>
					<div className={styles['th']}>
						<textarea
							aria-label={`${i}行目の見出しセル`}
							name={`bge-th-${i}`}
							value={th}
							onChange={(e) => {
								commit(rows.with(i, [e.currentTarget.value, td]));
							}}></textarea>
					</div>
					<div className={styles['td']}>
						<textarea
							aria-label={`${i}行目の内容セル`}
							name={`bge-td-${i}`}
							value={td}
							onChange={(e) => {
								commit(rows.with(i, [th, e.currentTarget.value]));
							}}></textarea>
					</div>
					<div className={styles['btn']}>
						<ul>
							<li>
								<button
									type="button"
									title="下に追加"
									command="--add-row"
									commandfor={rootId}
									value={i}>
									<IconRowInsertBottom />
								</button>
							</li>
							<li>
								<button
									type="button"
									title="削除"
									disabled={rows.length === 1}
									command="--remove-row"
									commandfor={rootId}
									value={i}>
									<IconTrash />
								</button>
							</li>
							<li>
								<button
									type="button"
									title="下に移動"
									disabled={i === rows.length - 1}
									command="--move-row-down"
									commandfor={rootId}
									value={i}>
									<IconArrowsTransferDown className="icon" />
								</button>
							</li>
						</ul>
					</div>
				</div>
			))}
		</div>
	);
}
