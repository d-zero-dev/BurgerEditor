import type {
	BlockCatalog as BlockCatalogData,
	BurgerEditorEngine,
} from '@burger-editor/core';

import { BGE_COMMAND, COMMAND_BUS_ID } from '@burger-editor/core';
import { IconClipboard } from '@tabler/icons-react';
import { Fragment } from 'react';

import styles from './block-catalog.module.css';

/**
 * Block catalog dialog content. Adding and pasting blocks are declared
 * as engine commands; the catalog entry is identified by
 * `data-category` / `data-index` on the invoker button.
 * @param root0
 * @param root0.engine
 * @param root0.catalog
 */
export function BlockCatalog({
	engine,
	catalog,
}: {
	readonly engine: BurgerEditorEngine;
	readonly catalog: BlockCatalogData;
}) {
	const hasCopiedBlock = !!sessionStorage.getItem(engine.storageKey.blockClipboard);

	return (
		<div className={styles['blockCatalog']}>
			{hasCopiedBlock ? (
				<div className={styles['pasteSection']}>
					<button
						type="button"
						className={styles['pasteButton']}
						command={BGE_COMMAND.pasteBlock}
						commandfor={COMMAND_BUS_ID}>
						<IconClipboard />
						<span>クリップボードから貼り付け</span>
					</button>
				</div>
			) : null}

			<dl>
				{Object.entries(catalog).map(([category, blocks]) => (
					<Fragment key={category}>
						<dt>{category}</dt>
						<div>
							{blocks.map((blockInfo, index) => (
								<dd key={category + blockInfo.label + blockInfo.definition.name}>
									<button
										type="button"
										command={BGE_COMMAND.addBlock}
										commandfor={COMMAND_BUS_ID}
										data-category={category}
										data-index={index}>
										{blockInfo.definition.img || blockInfo.definition.svg ? (
											<figure>
												{blockInfo.definition.img ? (
													<div className={styles['img']}>
														<img src={blockInfo.definition.img} alt="" loading="lazy" />
													</div>
												) : (
													<div
														className={styles['img']}
														dangerouslySetInnerHTML={{
															__html: blockInfo.definition.svg ?? '',
														}}
													/>
												)}
												<figcaption>{blockInfo.label}</figcaption>
											</figure>
										) : (
											blockInfo.label
										)}
									</button>
								</dd>
							))}
						</div>
					</Fragment>
				))}
			</dl>
		</div>
	);
}
