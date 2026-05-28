interface JQueryStatic {
	camelCase(text: string): string;
	bcToken?: BcToken;
	bcUtil?: BcUtil;
}

interface JQuery {
	upload(
		url: string,
		data: unknown,
		callback: { (data: unknown): void },
		type: string,
	): JQuery;
	upload(url: string, callback: { (data: unknown): void }, type: string): JQuery;
	timepicker(option: unknown): JQuery;
}

interface BcToken {
	check(callback: () => unknown, config?: unknown): unknown;
	getForm(url: string, callback: () => unknown, config?: unknown): unknown;
	getHiddenToken(): unknown;
	key: string | null;
	replaceLinkToSubmitToken(selector: string): unknown;
	requested: boolean;
	requesting: boolean;
	submitToken(url: string): unknown;
	update(callback: () => unknown, config?: unknown): unknown;
}

interface BcUtil {
	baseUrl: string;
	showLoader(): unknown;
}
