import { Layout } from './layout.js';
import { Nav } from './nav.js';

type Props = {
	path: string;
	content: string | null;
	rootDir: string;
	lang: string;
};

/**
 *
 * @param root0
 * @param root0.path
 * @param root0.content
 * @param root0.rootDir
 * @param root0.lang
 */
export function App({ path, content, rootDir, lang }: Props) {
	return (
		<Layout lang={lang}>
			<div class="app">
				<Nav rootPath={rootDir} />
				<div class="content">
					<h1>{path}</h1>

					<main class="editor"></main>

					<input type="hidden" id="main" value={content ?? '新規作成'} />
				</div>
			</div>
		</Layout>
	);
}
