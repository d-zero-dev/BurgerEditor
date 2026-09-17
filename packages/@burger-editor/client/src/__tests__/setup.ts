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

// create-react-view.spec.tsのcreateAreaHost()は、iframeへのdocument.write
// →load完了という「Reactの外で起きる本物のブラウザ非同期」を経て
// Promiseを解決する。この解決を`act()`で包むと（iframeのload完了を
// Reactのスケジューラが握っている間ブロックしてしまい）テストがハング
// する — act()は「Reactが起こす更新」を対象にした仕組みで、iframeの
// load自体はその対象外であるため、ここは意図的にact()で包まない。
// その結果として出る"not wrapped in act(...)"警告は既知のfalse
// positiveなので、テスト出力のノイズとしてのみ抑制する（実際の更新の
// 反映漏れではないことは、この直後のexpectがDOMの実際の状態を検証して
// いることで担保されている）
// 同様に、既にfulfilled/rejectedとしてタグ付け済みのthenable
// （use()のキャッシュ契約 — react.devの`wrapPromise`パターン）をrender中に
// 読むテストで、Reactが「本当にSuspenseが再開されたとき用」の警告を
// 誤検知することがある（値は同期的に返っており、実際の再開待ちは発生
// していない）
const SUPPRESSED_REACT_TEST_WARNINGS = [
	'was not wrapped in act(...)',
	'the `act` call was not awaited',
];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
	const [first] = args;
	if (
		typeof first === 'string' &&
		SUPPRESSED_REACT_TEST_WARNINGS.some((pattern) => first.includes(pattern))
	) {
		return;
	}
	originalConsoleError(...args);
};
