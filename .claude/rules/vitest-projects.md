---
paths:
  - 'vitest.config.ts'
  - 'scripts/vitest-project-groups.js'
  - 'scripts/run-vitest-groups.mjs'
---

# Vitest のプロジェクト

- プロジェクトを追加したら `scripts/vitest-project-groups.js` の `VITEST_PROJECT_GROUPS` に 1 回だけ登録する。漏れ・重複・存在しない名前は設定の読み込み時に throw する
- グループは 1 プロセスで動く。ブラウザ系のプロジェクトはメモリを食うので、配置するグループは `scripts/vitest-project-groups.js` の JSDoc にある目安に従う（自動では強制されない）
- React Compiler の影響を受けるプロジェクトなら、`package.json` の `test:no-compiler:unit` の `--project` にも足す
- `BGE_NO_COMPILER` の扱いは `scripts/react-compiler-babel.js` に一元化している
