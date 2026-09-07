import { runInNewContext } from 'node:vm'
import { parse, type DefaultTreeAdapterMap } from 'parse5'
import { describe, expect, it } from 'vitest'

import {
	createSeoHead,
	getInlineContent,
	renderHead,
	validateHeadItems
} from '../src/main'

type Node = DefaultTreeAdapterMap['node']
type Element = DefaultTreeAdapterMap['element']

function elements(node: Node, tagName: string): Element[] {
	return [
		...('tagName' in node && node.tagName === tagName ? [node] : []),
		...('childNodes' in node
			? node.childNodes.flatMap((child) => elements(child, tagName))
			: [])
	]
}

describe('script parser boundaries', () => {
	it.each(['\t', '\n', '\r', '\r\n', '\f', ' ', '/', '>'])(
		'rejects a double-escape sequence with delimiter %j',
		(delimiter) => {
			const head = {
				title: 'Safety',
				script: [{ textContent: `const value = \`<!--<ScRiPt${delimiter}>\`;` }]
			}
			expect(validateHeadItems(head)).toContainEqual(
				expect.objectContaining({ code: 'unsafe-script-text' })
			)
			expect(() => renderHead(head)).toThrow(/HTML parser sequence/)
			expect(() => getInlineContent(head)).toThrow(/HTML parser sequence/)
		}
	)

	it.each([
		'</SCRIPT>',
		'</ScRiPt >',
		'</SCRIPT\r>',
		'</scripture>',
		'</script-name>'
	])(
		'preserves the runtime string %j without changing document structure',
		(value) => {
			const html = renderHead({
				title: 'Safety',
				script: [{ textContent: `result = ${JSON.stringify(value)};` }]
			})
			const document = parse(
				`<html><head>${html}</head><body><p>after</p></body></html>`
			)
			const scripts = elements(document, 'script')
			expect(scripts).toHaveLength(1)
			expect(elements(document, 'p')).toHaveLength(1)
			const code = scripts[0].childNodes
				.map((node) => ('value' in node ? node.value : ''))
				.join('')
			const context: { result?: string } = {}
			runInNewContext(code, context)
			expect(context.result).toBe(value)
		}
	)
})

describe('literal serialization', () => {
	it.each(['$&', '$$', "$'", '$`', '$1', 'ordinary < & " text'])(
		'inserts a title containing %s literally at every placeholder',
		(title) => {
			expect(createSeoHead({ title, titleTemplate: '%s | %s' }).title).toBe(
				`${title} | ${title}`
			)
		}
	)

	it('round-trips boolean metadata while preserving actual boolean attribute semantics', () => {
		const document = parse(
			`<html><head>${renderHead({
				title: 'Booleans',
				meta: [
					{ name: 'flag-true', content: true },
					{ name: 'flag-false', content: false }
				],
				script: [
					{
						src: '/app.js',
						async: true,
						defer: false,
						'data-enabled': false,
						'aria-hidden': true
					}
				]
			})}</head><body></body></html>`
		)
		const metas = elements(document, 'meta')
		for (const value of ['true', 'false']) {
			const meta = metas.find((node) =>
				node.attrs.some(
					(attr) => attr.name === 'name' && attr.value === `flag-${value}`
				)
			)
			expect(meta?.attrs).toContainEqual({ name: 'content', value })
		}
		const attrs = elements(document, 'script')[0].attrs
		expect(attrs).toContainEqual({ name: 'async', value: '' })
		expect(attrs.some((attr) => attr.name === 'defer')).toBe(false)
		expect(attrs).toContainEqual({ name: 'data-enabled', value: 'false' })
		expect(attrs).toContainEqual({ name: 'aria-hidden', value: 'true' })
	})
})
