import { createFilter, type FilterPattern } from "@rollup/pluginutils";
import { traverse, is } from "estree-toolkit";
import MagicString from "magic-string";
import * as acorn from "acorn";
import tsPlugin from "acorn-typescript";
import type { TransformResult } from "rollup";
import type { Node as AstNode } from "estree";

declare module "estree" {
	export interface BaseNodeWithoutComments {
		type: string;
		loc?: SourceLocation | null | undefined;
		start: number; // Added by acorn
		end: number; // Added by acorn
	}
}

export default function dedent(strings: TemplateStringsArray, ...values: string[]): string {
	return ""; // Imports of "dedent" get stripped during build
}

interface Options {
	include?: FilterPattern;
	exclude?: FilterPattern;
	sourcemap?: boolean;
}

export function dedentPlugin(options: Options = {}) {
	const filter = createFilter(
		options.include || ["**/*.(js|cjs|mjs|ts|cts|mtx|jsx|tsx)"],
		options.exclude || ["node_modules/**"],
	);

	return {
		name: "dedentPlugin",
		enforce: "pre" as "pre", // run plugin before JSX has been transpiled
		transform(code: string, id: string): TransformResult {
			if (!filter(id)) return null;

			const magicString = new MagicString(code);
			// @ts-ignore
			const ast = acorn.Parser.extend(tsPlugin()).parse(code, {
				locations: true,
				sourceType: "module",
				ecmaVersion: "latest",
			});

			let importSpecifier = "dedent";
			traverse(ast, {
				ImportDeclaration(path) {
					if (!path.node) return;
					if (is.literal(path.node.source, { value: "rollup-plugin-dedent" })) {
						// Get correct importSpecifier if aliased
						for (const specifier of path.node.specifiers) {
							// Default export
							if (is.importDefaultSpecifier(specifier)) {
								importSpecifier = specifier.local.name;
							}

							// Named export
							if (is.importSpecifier(specifier)) {
								if (
									is.identifier(specifier.imported, { name: "dedent" }) ||
									is.identifier(specifier.imported, { name: "default" })
								) {
									importSpecifier = specifier.local.name;
								}
							}
						}

						// Remove import
						magicString.remove(path.node.start, path.node.end);
					}
				},
				TaggedTemplateExpression(path) {
					if (!path.node) return;
					const tag = path.node.tag;

					// Tagged Template Expression using "dedent"
					if (is.identifier(tag, { name: importSpecifier })) {
						magicString.remove(tag.start, tag.end);

						for (const quasi of path.node.quasi.quasis) {
							const linesRaw = quasi.value.raw.split("\n");
							const dedentedLines = stripIndentation(linesRaw);
							magicString.overwrite(quasi.start, quasi.end, dedentedLines);
						}
					}

					// Triple Backticks
					if (is.taggedTemplateExpression(tag)) {
						const startTag = tag.tag;
						const endTag = path.node.quasi;
						// template string is surrounded by empty template literals
						if (isEmptyTemplateLiteral(startTag) && isEmptyTemplateLiteral(endTag)) {
							magicString.remove(startTag.start, startTag.end);
							magicString.remove(endTag.start, endTag.end);

							for (const quasi of tag.quasi.quasis) {
								const linesRaw = quasi.value.raw.split("\n");
								const dedentedLines = stripIndentation(linesRaw);
								magicString.overwrite(quasi.start, quasi.end, dedentedLines);
							}
						}
					}
				},
			});

			const map = magicString.generateMap({
				source: id,
				includeContent: true,
				hires: "boundary",
			});

			return {
				code: magicString.toString(),
				map: options.sourcemap ? map : null,
			};
		},
	};
}

function isEmptyTemplateLiteral(node: AstNode): boolean {
	if (!is.templateLiteral(node)) return false;
	if (node.quasis.length !== 1) return false;
	if (is.templateElement(node.quasis[0], { value: { raw: "", cooked: "" } })) return false;
	return true;
}

// This file includes code from [dmnd/dedent] (https://github.com/dmnd/dedent/)
// Copyright (c) 2025 Desmond Brand
// Licensed under the MIT License
function stripIndentation(lines: string[]): string {
	let minIndent = null;
	for (const l of lines) {
		const m = l.match(/^(\s+)\S+/);
		if (m && m[1]) {
			const indent = m[1].length;
			if (!minIndent) {
				minIndent = indent; // indent of the the first line
			} else {
				minIndent = Math.min(minIndent, indent);
			}
		}
	}

	if (minIndent == null) return "";
	return lines
		.map((l) => (l[0] === " " || l[0] === "\t" ? l.slice(minIndent) : l))
		.join("\n")
		.trim();
}
