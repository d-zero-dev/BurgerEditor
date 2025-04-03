interface ElementNotFoundErrorOptions extends ErrorOptions {
	additionalMessage?: string;
}

export class ElementNotFoundError extends Error {
	static {
		this.prototype.name = 'ElementNotFoundError';
	}
	constructor(
		selector: string = 'unknown selector',
		options: ElementNotFoundErrorOptions = {},
	) {
		const { additionalMessage, ...rest } = options;
		const message = `Selector didn't match: ${selector}${additionalMessage ? `: ${additionalMessage}` : ''}`;
		super(message, rest);
	}
}

interface NoHTMLElementErrorOptions extends ErrorOptions {
	element?: Element;
}

export class NoHTMLElementError extends Error {
	static {
		this.prototype.name = 'NoHTMLElementError';
	}
	constructor(
		selector: string = 'unknown selector',
		options: NoHTMLElementErrorOptions = {},
	) {
		const { element, ...rest } = options;
		let message = `"${selector}" element is not HTMLElement`;
		if (element) {
			message += `: Its namespace is "${element.namespaceURI}"`;
		}
		super(message, rest);
	}
}
