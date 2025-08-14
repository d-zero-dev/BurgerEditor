import { Layout } from './layout.js';
import { Nav } from './nav.js';

type Props = {
	path: string;
	content: string | null | Error;
	rootDir: string;
	lang: string;
	// Front Matter support (optional)
	frontMatter?: Record<string, unknown>;
	hasFrontMatter?: boolean;
};

/**
 *
 * @param root0
 * @param root0.path
 * @param root0.content
 * @param root0.rootDir
 * @param root0.lang
 * @param root0.frontMatter
 * @param root0.hasFrontMatter
 */
export function App({
	path,
	content,
	rootDir,
	lang,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	frontMatter: _frontMatter,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	hasFrontMatter: _hasFrontMatter,
}: Props) {
	return (
		<Layout lang={lang}>
			<div class="app">
				<Nav rootPath={rootDir} />
				<div class="content">
					<h1>{path}</h1>

					{content instanceof Error ? (
						<p>{content.message}</p>
					) : (
						<>
							<main class="editor"></main>
							<input type="hidden" id="main" value={content ?? '新規作成'} />
						</>
					)}
				</div>
			</div>
		</Layout>
	);
}
