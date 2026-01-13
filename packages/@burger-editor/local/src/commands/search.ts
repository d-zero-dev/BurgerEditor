import type { LocalServerConfig } from '../types.js';
import type { SearchMatch, SearchParams } from '@burger-editor/inspector';

import fs from 'node:fs/promises';

import {
	parseSearchQuery,
	scanHtmlFilesWithMultipleQueries,
} from '@burger-editor/inspector';

import { getUserConfig } from '../model/get-user-config.js';
import { formatOutput } from '../search/output-formatter.js';

export interface SearchFlags {
	readonly url: boolean;
	readonly help: boolean;
}

export interface SearchResult {
	readonly success: boolean;
	readonly matches: readonly SearchMatch[];
	readonly error?: string;
}

/**
 * Validate and parse search queries (pure function)
 * @param queries Array of query strings
 * @returns Parsed search parameters or error
 */
export function validateAndParseQueries(
	queries: readonly string[],
):
	| { success: true; params: readonly SearchParams[] }
	| { success: false; error: string } {
	if (queries.length === 0) {
		return {
			success: false,
			error: 'Error: At least one search query is required',
		};
	}

	const searchParamsArray: SearchParams[] = [];
	for (const query of queries) {
		try {
			const params = parseSearchQuery(query);
			searchParamsArray.push(params);
		} catch (error) {
			if (error instanceof Error) {
				return { success: false, error: error.message };
			}
			return {
				success: false,
				error: `Error: Invalid query format: "${query}"`,
			};
		}
	}

	return { success: true, params: searchParamsArray };
}

/**
 * Execute search operation (testable with dependency injection)
 * @param documentRoot Root directory to search
 * @param searchParams Array of search parameters
 * @returns Search result
 */
export async function executeSearch(
	documentRoot: string,
	searchParams: readonly SearchParams[],
): Promise<SearchResult> {
	// Validate documentRoot exists
	const accessResult = await fs.access(documentRoot).catch((error) => error);
	if (accessResult instanceof Error) {
		return {
			success: false,
			matches: [],
			error: `Error: documentRoot does not exist: ${documentRoot}`,
		};
	}

	// Scan HTML files for matches
	const matchesOrError = await scanHtmlFilesWithMultipleQueries(
		documentRoot,
		searchParams,
	).catch((error) => error);

	if (matchesOrError instanceof Error) {
		return {
			success: false,
			matches: [],
			error: `Error: Failed to scan HTML files: ${matchesOrError.message}`,
		};
	}

	return {
		success: matchesOrError.length > 0,
		matches: matchesOrError,
	};
}

/**
 * Format and output search results (pure function)
 * @param matches Array of search matches
 * @param showUrl Whether to show URLs instead of file paths
 * @param config Server configuration
 * @returns Array of formatted output lines
 */
export function formatSearchResults(
	matches: readonly SearchMatch[],
	showUrl: boolean,
	config: LocalServerConfig,
): readonly string[] {
	return matches.map((match) => formatOutput(match, { showUrl, config }));
}

/**
 * Run the search command (entry point with side effects)
 * @param queries Array of search query strings (e.g., ["margin=normal", "bg-color=blue"])
 * @param flags Command line flags (--url, --help)
 */
export async function runSearchCommand(
	queries: readonly string[],
	flags: SearchFlags,
): Promise<void> {
	// Handle --help flag
	if (flags.help) {
		printSearchHelp();
		process.exit(0);
	}

	// Validate and parse queries
	const parseResult = validateAndParseQueries(queries);
	if (!parseResult.success) {
		// eslint-disable-next-line no-console
		console.error(parseResult.error);
		printSearchHelp();
		process.exit(1);
	}

	// Load configuration
	const config = await getUserConfig();

	// Execute search
	const searchResult = await executeSearch(config.documentRoot, parseResult.params);

	if (!searchResult.success && searchResult.error) {
		// eslint-disable-next-line no-console
		console.error(searchResult.error);
		process.exit(1);
	}

	// Format and output results
	const outputLines = formatSearchResults(searchResult.matches, flags.url, config);

	for (const line of outputLines) {
		// eslint-disable-next-line no-console
		console.log(line);
	}

	// Exit with appropriate code (0 = matches found, 1 = no matches)
	process.exit(searchResult.matches.length > 0 ? 0 : 1);
}

/**
 * Print help message for search command
 */
function printSearchHelp(): void {
	// eslint-disable-next-line no-console
	console.log(`
Usage: bge search <query> [<query>...] [options]

Search for CSS variables in HTML files under documentRoot.

Query Format:
  {category}={value}     Simple format (e.g., "margin=normal")
  {category}=*           Wildcard - match any value (e.g., "margin=*")
  {category}={v1,v2}     OR values (e.g., "margin=normal,large")

Multiple queries perform AND search (files must match ALL queries).

Options:
  --url         Show results as localhost URLs instead of file paths
  --help, -h    Show this help message

Examples:
  bge search "margin=normal"
  bge search "bg-color=blue" --url
  bge search "margin=normal" "bg-color=blue"        # AND search
  bge search "margin=*"                             # Any margin value
  bge search "margin=normal,large,xlarge"           # OR search
`);
}
