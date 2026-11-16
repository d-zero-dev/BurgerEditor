#!/usr/bin/env node
// `.husky/pre-commit` が直接のコミットを拒否するブランチを、1 行に 1 つ出力する。
// 一覧の正は scripts/release-lines/lines.mjs の `commitGuard`。フックに同じ一覧を
// 書き写すと、ラインを足したり入れ替えたときに片方だけ古くなるので、フックは
// コミットのたびにこのスクリプトに尋ねる（node は lint-staged が要るので必ずある）。
//
// 使い方: node scripts/release-lines/guarded-branches.mjs

import { guardedBranches } from './lines.mjs';

console.log(guardedBranches().join('\n'));
