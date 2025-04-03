import type { PropsWithChildren } from 'hono/jsx';

type Props = {
	lang: string;
};

/**
 *
 * @param root0
 * @param root0.children
 * @param root0.lang
 */
export function Layout({ children, lang }: PropsWithChildren<Props>) {
	return (
		<html lang={lang}>
			<head>
				<link rel="stylesheet" href="https://unpkg.com/trix@2.0.8/dist/trix.css" />
				<link rel="stylesheet" href="/client.css" />
				<link rel="stylesheet" href="/app.css" />
				<script
					src="https://unpkg.com/invokers-polyfill@latest/invoker.min.js"
					type="module"></script>
				<script src="/client.js" type="module"></script>
			</head>
			<body>{children}</body>
		</html>
	);
}
