/**
 * Add id attributes to headings (h1–h6) for hash links. GitHub-style slug.
 */
function slugify(text) {
	return String(text)
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		|| "section";
}

function textContent(node) {
	if (node.type === "text") return node.value ?? "";
	if (node.children) return node.children.map(textContent).join("");
	return "";
}

function visit(node, fn) {
	if (node.children) for (const child of node.children) visit(child, fn);
	fn(node);
}

export default function rehypeHeadingId() {
	return (tree) => {
		visit(tree, (node) => {
			if (node.type === "element" && /^h[1-6]$/.test(node.tagName) && !node.properties?.id) {
				node.properties = node.properties ?? {};
				node.properties.id = slugify(textContent(node));
			}
		});
	};
}
