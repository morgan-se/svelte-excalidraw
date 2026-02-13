/**
 * Custom highlighter for mdsvex that ensures Svelte code blocks use prism-svelte.
 * Usage: pass as mdsvex highlight.highlighter. Escape output for Svelte {@html}.
 */
import Prism from 'prismjs';
import 'prismjs/components/prism-markup.js';
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-css.js';
import 'prismjs/components/prism-bash.js';
import 'prism-svelte';

/**
 * Returns full-document highlighted code (same as markdown, so Svelte grammar works)
 * plus line count for the gutter. Use for code + line numbers with correct highlighting.
 *
 * @param {string} code
 * @param {string} [lang='text']
 * @returns {{ langClass: string; html: string; lineCount: number }}
 */
export function getHighlightedCode(code, lang = 'text') {
	const normalised = (lang ?? '').toLowerCase();
	const grammar = Prism.languages[normalised] ?? Prism.languages.markup;
	const highlighted = grammar
		? Prism.highlight(code, grammar, normalised)
		: escapeHtml(code);
	const html = escapeSvelte(highlighted);
	const lineCount = code.split('\n').length;
	return { langClass: normalised || 'text', html, lineCount };
}

// Escape for Svelte {@html} (curly braces and backticks)
function escapeSvelte(str) {
	return str
		.replace(/[{}`]/g, (c) => ({ '{': '&#123;', '}': '&#125;', '`': '&#96;' }[c]))
		.replace(/\\([trn])/g, '&#92;$1');
}

function escapeHtml(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * mdsvex highlighter: returns full <pre><code>...</code></pre> with Prism highlighting.
 */
export function highlighter(code, lang, _meta, _filename) {
	const normalised = (lang ?? '').toLowerCase();
	const grammar = Prism.languages[normalised] ?? Prism.languages.markup;
	const highlighted = grammar
		? Prism.highlight(code, grammar, normalised)
		: escapeHtml(code);
	const escaped = escapeSvelte(highlighted);
	const langClass = normalised || 'text';
	return `<pre class="language-${langClass}">{@html \`<code class="language-${langClass}">${escaped}</code>\`}</pre>`;
}
