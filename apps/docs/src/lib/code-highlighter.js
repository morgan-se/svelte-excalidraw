/**
 * Custom highlighter for mdsvex.
 */
import { escapeSvelte } from "mdsvex";
import Prism from "prismjs";
import "prismjs/components/prism-markup.js";
import "prismjs/components/prism-javascript.js";
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-css.js";
import "prismjs/components/prism-bash.js";
import "prismjs/components/prism-json.js";
import "prismjs/components/prism-yaml.js";
import "prism-svelte";

const LANG_ALIASES = { js: "javascript", ts: "typescript", yml: "yaml" };

function escapeHtml(str) {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function highlightWithPrism(code, lang) {
	const normalised = (LANG_ALIASES[lang?.toLowerCase()] ?? lang ?? "").toLowerCase();
	const grammar = Prism.languages[normalised] ?? Prism.languages.markup;
	return grammar
		? Prism.highlight(code, grammar, normalised)
		: escapeHtml(code);
}

/**
 * Returns full-document highlighted code (same as markdown, so Svelte grammar works)
 * plus line count for the gutter. Use for code + line numbers with correct highlighting.
 */
export function getHighlightedCode(code, lang = "text") {
	const normalised = (LANG_ALIASES[lang?.toLowerCase()] ?? lang ?? "").toLowerCase();
	const html = escapeSvelte(highlightWithPrism(code, lang));
	const lineCount = code.split("\n").length;
	return { langClass: normalised || "text", html, lineCount };
}

/**
 * mdsvex highlighter.
 */
export function highlighter(code, lang, _meta, _filename, optimise = true) {
	const normalised = (LANG_ALIASES[lang?.toLowerCase()] ?? lang ?? "").toLowerCase() || "text";
	const highlighted = highlightWithPrism(code, lang);
	const escaped = escapeSvelte(highlighted);
	return optimise
		? `<pre class="language-${normalised}">{@html \`<code class="language-${normalised}">${escaped}</code>\`}</pre>`
		: `<pre class="language-${normalised}"><code class="language-${normalised}">${escaped}</code></pre>`;
}
