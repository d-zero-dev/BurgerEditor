import { generateFileTree } from '../model/file-tree.js';

import { NavTree } from './nav-tree.js';

/**
 *
 * @param root0
 * @param root0.rootPath
 */
export async function Nav({ rootPath }: { rootPath: string }) {
	const tree = await generateFileTree(rootPath);
	return (
		<nav class="nav">
			<div>
				<button type="button" command="show-modal" commandfor="new-file-dialog">
					新規ファイル作成
				</button>
			</div>
			<dialog id="new-file-dialog">
				<div>
					<form id="new-file-form" method="dialog">
						<label>File path</label>
						<input type="text" name="path" />
					</form>
				</div>
				<footer>
					<button type="button" command="close" commandfor="new-file-dialog">
						Cancel
					</button>
					<button type="submit" form="new-file-form">
						Create
					</button>
				</footer>
			</dialog>
			<div>
				<NavTree items={tree} />
			</div>
		</nav>
	);
}
