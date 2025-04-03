export interface PaginationOptions<T> {
	readonly page?: number;
	readonly filter?: (item: T) => boolean;
	readonly selected?: (item: T) => boolean;
}

/**
 *
 * @param allList
 * @param pageSize
 * @param options
 */
export function pagination<T>(
	allList: readonly T[],
	pageSize: number,
	options: PaginationOptions<T>,
) {
	const { page = 0, filter, selected } = options ?? {};

	// If a filter function is provided, filter the list.
	const list = filter ? allList.filter(filter) : allList;

	// Split the list into pages.
	const pageList: T[][] = [];
	for (let i = 0; i < list.length; i += pageSize) {
		pageList.push(list.slice(i, i + pageSize));
	}

	const total = pageList.length;

	// Optimize the page index:
	// Clamp page to 0 if it is less than 0,
	// Clamp page to total - 1 if it is greater than or equal to total,
	// If a selected function is provided, find the page containing the selected item.
	const currentPage = selected
		? pageList.findIndex((page) => page.some(selected))
		: Math.min(Math.max(page, 0), total - 1);

	// Get the target page.
	const targetPage = pageList.at(currentPage) ?? [];

	// If a selected function is provided and the selected file is not included
	// in the filtered list, add the selected file to the beginning.
	if (selected && !targetPage.some(selected)) {
		const selectedFile = allList.find(selected);
		if (selectedFile) {
			targetPage.unshift(selectedFile);
		}
	}

	return {
		data: targetPage,
		pagination: {
			current: currentPage,
			total: total,
		},
	};
}
