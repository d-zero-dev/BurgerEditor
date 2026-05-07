type Props = {
	virtualTreeEnabled: boolean;
};

/**
 * Renders the nav skeleton. The file tree is hydrated client-side via GET /api/tree
 * so this view layer stays agnostic to virtualTree mode for tree data, but it does
 * expand the new-file dialog to require an `id` field when the server is configured
 * to use virtual paths.
 * @param props
 * @param props.virtualTreeEnabled
 */
export function Nav({ virtualTreeEnabled }: Props) {
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
						<label>
							<span>File path</span>
							<input type="text" name="path" required />
						</label>
						{virtualTreeEnabled ? (
							<label>
								<span>File ID</span>
								<input type="text" name="id" required />
							</label>
						) : null}
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
			<div id="nav-tree-mount"></div>
		</nav>
	);
}
