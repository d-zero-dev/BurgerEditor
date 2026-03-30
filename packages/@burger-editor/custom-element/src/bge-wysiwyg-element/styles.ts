export const controlUIStyles = `
	:host {
		display: block;
	}

	textarea,
	iframe  {
		block-size: 50svh;
		inline-size: 100%;
		resize: vertical;
		overflow-y: auto;
		background: var(--bge-lightest-color);
		border: 1px solid var(--bge-border-color);
		border-radius: var(--border-radius);
	}

	iframe[data-focus-within="true"],
	textarea:focus-visible {
		--bge-border-color: var(--bge-ui-primary-color);
		--bge-outline-color: var(--bge-ui-primary-color);
		outline: var(--bge-focus-outline-width) solid var(--bge-outline-color);
	}

	textarea {
		font-family: var(--bge-font-family-monospace);
	}

	[data-bge-mode="wysiwyg"] textarea {
		display: none;
	}

	[data-bge-mode="html"] iframe {
		display: none;
	}

	[data-text-only-editor] {
		block-size: 50svh;
		inline-size: 100%;
		resize: vertical;
		overflow-y: auto;
		background: var(--bge-lightest-color);
		border: 1px solid var(--bge-border-color);
		border-radius: var(--border-radius);
		padding: 1rem;
		box-sizing: border-box;
	}

	[data-bge-mode="wysiwyg"] [data-text-only-editor],
	[data-bge-mode="html"] [data-text-only-editor] {
		display: none;
	}

	[data-bge-mode="text-only"] iframe,
	[data-bge-mode="text-only"] textarea {
		display: none;
	}

	[contenteditable="plaintext-only"] {
		outline: 1px dashed var(--bge-border-color);
		cursor: text;
	}

	[contenteditable="plaintext-only"]:hover {
		outline-color: var(--bge-ui-primary-color);
	}

	[contenteditable="plaintext-only"]:focus {
		outline: 2px solid var(--bge-ui-primary-color);
		outline-offset: 2px;
	}

	[role="alert"] {
		margin-block-start: 0.5rem;
		padding: 0.5rem;
		background-color: var(--bge-error-color, #fee);
		border: 1px solid var(--bge-error-border-color, #fcc);
		border-radius: var(--border-radius);
		color: var(--bge-error-text-color, #c00);
		font-size: 0.875rem;
	}
`;

export const editorContentStyles = (css: string) => `
	:where(html, body) {
		margin: 0;
		padding: 0;

		:where(&, *) {
			box-sizing: border-box;
		}
	}

	iframe,
	[contenteditable="true"] {
		padding: 1rem;
		block-size: 100%;
		box-sizing: border-box;
	}

	[contenteditable="true"]:focus-visible {
		outline: none;
	}

	${css}

	a:any-link {
		pointer-events: none !important;
	}
`;
