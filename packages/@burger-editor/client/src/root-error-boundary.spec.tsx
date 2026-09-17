import { cleanup, screen } from '@testing-library/react';
import { test, expect, afterEach, vi } from 'vitest';

import { RootErrorBoundary } from './root-error-boundary.js';
import { createMockEngine } from './testing/create-mock-engine.js';
import { renderWithEngine } from './testing/render-with-engine.js';
import { suppressConsoleErrors } from './testing/suppress-console-error.js';

afterEach(cleanup);

// React自身がキャッチ済みのエラーもconsole.errorへ二重に出力する仕様
// （このテストではその挙動そのものを意図的に発生させている）。他specへの
// 影響を避けるため、このファイルに限定してノイズだけを黙らせる
suppressConsoleErrors();

/**
 * 指定した回数レンダーされるまでthrowし続けるコンポーネント。
 * ErrorBoundaryはRenderで一度キャッチした後もStrictModeの再試行などで
 * 複数回呼ばれうるため、`shouldThrow`を親から制御できるようにしている
 * @param root0
 * @param root0.shouldThrow
 */
function Bomb({ shouldThrow }: { readonly shouldThrow: boolean }) {
	if (shouldThrow) {
		throw new Error('boom');
	}
	return <p>OK</p>;
}

test('子がthrowするとbge:errorが発火し、フォールバックは何も描画しない', async () => {
	const engine = createMockEngine();
	const events: CustomEvent[] = [];
	engine.el.addEventListener('bge:error', (e) => {
		events.push(e as CustomEvent);
	});

	const { container } = renderWithEngine(
		engine,
		<RootErrorBoundary>
			<Bomb shouldThrow />
		</RootErrorBoundary>,
	);

	await vi.waitFor(() => {
		expect(events).toHaveLength(1);
	});
	expect(events[0]?.detail.error).toBeInstanceOf(Error);
	expect((events[0]?.detail.error as Error).message).toBe('boom');
	expect(container.textContent).toBe('');
});

test('境界の外側にある兄弟は、境界内のエラーで巻き込まれない', async () => {
	const engine = createMockEngine();

	renderWithEngine(
		engine,
		<>
			<p>sibling content</p>
			<RootErrorBoundary>
				<Bomb shouldThrow />
			</RootErrorBoundary>
		</>,
	);

	await vi.waitFor(() => {
		expect(screen.queryByText('OK')).toBeNull();
	});
	expect(screen.getByText('sibling content')).toBeTruthy();
});

test('エラーが起きなければ子がそのまま描画される', () => {
	const engine = createMockEngine();

	renderWithEngine(
		engine,
		<RootErrorBoundary>
			<Bomb shouldThrow={false} />
		</RootErrorBoundary>,
	);

	expect(screen.getByText('OK')).toBeTruthy();
});
