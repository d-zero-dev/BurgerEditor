import type { BgeWysiwygEditorElement } from '@burger-editor/custom-element';

import { useEffect, useRef } from 'react';

declare module 'react' {
	namespace JSX {
		interface IntrinsicElements {
			'bge-wysiwyg-editor': React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLElement>,
				HTMLElement
			> & {
				'item-name'?: string;
				commands?: string;
				label?: string;
				name?: string;
			};
		}
	}
}

/**
 * Rich text field backed by the `<bge-wysiwyg-editor>` custom element
 * (TipTap). The element manages its own DOM; this wrapper feeds the
 * initial value and lifts edits into the editor state via the
 * `transaction` event.
 * @param root0
 * @param root0.value
 * @param root0.onChange
 * @param root0.itemName
 * @param root0.commands
 * @param root0.label
 * @example
 * ```tsx
 * <WysiwygField
 * 	itemName="wysiwyg"
 * 	value={state.wysiwyg ?? ''}
 * 	onChange={(wysiwyg) => setState({ ...state, wysiwyg })}
 * />
 * ```
 */
export function WysiwygField({
	value,
	onChange,
	itemName,
	commands,
	label,
}: {
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly itemName?: string;
	readonly commands?: string;
	readonly label?: string;
}) {
	const ref = useRef<BgeWysiwygEditorElement | null>(null);
	const initialValue = useRef(value);
	const onChangeRef = useRef(onChange);

	useEffect(() => {
		onChangeRef.current = onChange;
	});

	useEffect(() => {
		const el = ref.current;
		if (!el) {
			return;
		}
		// custom element側のinnerHTMLセッターがwysiwygのvalueに転送する
		el.innerHTML = initialValue.current;

		// transactionはバブリングしないため内側の要素で購読する
		const inner = el.querySelector('bge-wysiwyg');
		const onTransaction = () => {
			onChangeRef.current(el.value);
		};
		inner?.addEventListener('transaction', onTransaction);
		return () => {
			inner?.removeEventListener('transaction', onTransaction);
		};
	}, []);

	return (
		<bge-wysiwyg-editor
			ref={(el: HTMLElement | null) => {
				ref.current = el as BgeWysiwygEditorElement | null;
			}}
			item-name={itemName}
			commands={commands}
			label={label}
		/>
	);
}
