import { Layout } from './layout.js';
import { Nav } from './nav.js';

type Props = {
	path: string;
	content: string | null | Error;
	lang: string;
	virtualTreeEnabled: boolean;
	// Front Matter support (optional)
	frontMatter?: Record<string, unknown>;
	hasFrontMatter?: boolean;
};

/**
 * App component for BurgerEditor local server
 * @param props - Component properties
 * @param props.path - Current page path
 * @param props.content - Page content or error
 * @param props.lang - Language code
 * @param props.virtualTreeEnabled - Whether the server is running in virtualTree mode
 * @param props.frontMatter - Front Matter data
 * @param props.hasFrontMatter - Whether Front Matter exists
 */
export function App({
	path,
	content,
	lang,
	virtualTreeEnabled,
	frontMatter,
	hasFrontMatter,
}: Props) {
	return (
		<Layout lang={lang}>
			<div class="app">
				<Nav virtualTreeEnabled={virtualTreeEnabled} />
				<div class="content">
					<h1>{path}</h1>

					{/*
					 * Always render the virtualTree mode flag — `new-file.ts` must read
					 * it even on error pages where the editor itself isn't mounted.
					 */}
					<input
						type="hidden"
						id="virtual-tree-enabled"
						value={String(virtualTreeEnabled)}
					/>

					{content instanceof Error ? (
						<p>{content.message}</p>
					) : (
						<>
							<div class="front-matter-editor"></div>
							<main class="editor"></main>
							<input type="hidden" id="main" value={content ?? '新規作成'} />
							<input
								type="hidden"
								id="front-matter"
								value={JSON.stringify(frontMatter ?? {})}
							/>
							<input
								type="hidden"
								id="has-front-matter"
								value={String(hasFrontMatter ?? false)}
							/>
						</>
					)}
				</div>
			</div>
		</Layout>
	);
}
