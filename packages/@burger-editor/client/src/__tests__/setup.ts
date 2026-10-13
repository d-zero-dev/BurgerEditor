// Vitest Browser Mode（実Chromium）向けの共通テストセットアップ。
//
// IS_REACT_ACT_ENVIRONMENT: @testing-library/reactは通常インポート時に
// このフラグを自動で立てるが、Browser Modeの各テストファイルが独立した
// モジュールグラフで評価されるタイミングによっては反映が間に合わず、
// 「The current testing environment is not configured to support
// act(...)」という警告とともにasync更新の反映待ちが不安定になることが
// ある。setupFilesで最初に明示しておくことで、render()経由でもcreateRoot
// を直接使うケース（front-matter-editor.tsx）でも安定させる。
(globalThis as Record<string, unknown>)['IS_REACT_ACT_ENVIRONMENT'] = true;

// ResizeObserverのコールバックが1フレーム内に収まらないと、Chromiumは
// 実装上の注意喚起として"ResizeObserver loop completed with undelivered
// notifications"を（エラーではなく）ワーニング相当でスローする。実際の
// レイアウト崩れではなく、テスト内でiframeやレイアウト計測を伴う
// コンポーネント（EditableAreaView等）が実ブラウザで動くようになった
// ことで初めて可視化された、無害だが黙らせるべきノイズ
window.addEventListener('error', (event) => {
	if (event.message === 'ResizeObserver loop completed with undelivered notifications.') {
		event.stopImmediatePropagation();
	}
});

// "not wrapped in act(...)" の既知false positive（iframeのload完了待ち、
// 既にfulfilled/rejectedのthenableをrender中に読むケース）は、ここで
// 全specに対して一括抑制しない。act警告は「非同期state更新をテストが
// 正しく待てていない」という実バグを検出する唯一のシグナルであり、
// グローバルに握りつぶすと今回書き換えたuseEffectEvent/use()/
// useActionState/startTransition経由の待ち漏れが将来紛れ込んでも
// 誰も気づけなくなる。該当することが分かっている特定のテストファイル
// （create-react-view.spec.ts等）側でローカルにspyOnして抑制すること。
