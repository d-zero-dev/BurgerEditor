/**
 * `package.json` の `version`。`build.mjs` と `vitest.config.ts` の `define` で置き換わる。
 * `package.json` を直接 import しないのは、default import では JSON 全体（依存の一覧を含む）がバンドルに入り、
 * NodeNext の TypeScript では JSON の名前付き import が使えないため
 */
declare const __BGE_VERSION__: string;
