import { parse } from 'parse5'
import { describe, expect, it } from 'vitest'

import { renderHead } from '../src/main'

type HtmlNode = {
	attrs?: { name: string; value: string }[]
	childNodes?: HtmlNode[]
	tagName?: string
	value?: string
}

const parserPayloads = [
	'</script><script>alert(1)</script>',
	'</SCRIPT>',
	'<!--',
	'<script>',
	'<!--<script>',
	'prefix <!-- middle <script> suffix',
	'<tag attr="value">& text',
	'line separator:   paragraph separator:  '
]

function findElements(node: HtmlNode, tagName: string): HtmlNode[] {
	const matches = node.tagName === tagName ? [node] : []
	for (const child of node.childNodes || []) {
		matches.push(...findElements(child, tagName))
	}
	return matches
}

function getAttribute(node: HtmlNode, name: string): string | undefined {
	return node.attrs?.find((attribute) => attribute.name === name)?.value
}

function getTextContent(node: HtmlNode): string {
	return (node.childNodes || [])
		.map((child) => child.value || getTextContent(child))
		.join('')
}

describe('HTML parser safety', () => {
	it.each(parserPayloads)(
		'round-trips JSON-LD without changing document structure: %s',
		(payload) => {
			const head = renderHead({
				title: 'Parser safety',
				jsonLd: { '@type': 'Thing', name: payload }
			})
			const document = parse(
				`<!doctype html><html><head>${head}</head><body><p id="after">AFTER</p></body></html>`
			) as HtmlNode

			const bodies = findElements(document, 'body')
			const bodyParagraphs = findElements(bodies[0], 'p')
			const jsonLdScripts = findElements(document, 'script').filter(
				(script) => getAttribute(script, 'type') === 'application/ld+json'
			)

			expect(bodies).toHaveLength(1)
			expect(bodyParagraphs).toHaveLength(1)
			expect(getAttribute(bodyParagraphs[0], 'id')).toBe('after')
			expect(getTextContent(bodyParagraphs[0])).toBe('AFTER')
			expect(jsonLdScripts).toHaveLength(1)
			expect(JSON.parse(getTextContent(jsonLdScripts[0]))).toMatchObject({
				'@type': 'Thing',
				name: payload,
				'@context': 'https://schema.org'
			})
		}
	)

	it('rejects script text that can enter the double-escaped parser state', () => {
		expect(() =>
			renderHead({
				title: 'Unsafe script text',
				script: [{ textContent: 'console.log("<!--<script>")' }]
			})
		).toThrow(/HTML parser sequence/)
	})
})
