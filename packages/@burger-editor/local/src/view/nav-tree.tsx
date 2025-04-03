import type { Tree } from '../model/file-tree.js';

/**
 *
 * @param root0
 * @param root0.items
 */
export function NavTree({ items }: { items: Tree }) {
	return (
		<ul>
			{items.map((item) => (
				<>
					<li>
						{item.name.endsWith('.html') ? (
							<a class="file" href={item.path}>
								<span>{item.name}</span>
							</a>
						) : (
							<span class="dir">{item.name}</span>
						)}
						{'files' in item && <NavTree items={item.files} />}
					</li>
				</>
			))}
		</ul>
	);
}
