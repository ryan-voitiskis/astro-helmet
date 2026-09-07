import { parse, type DefaultTreeAdapterMap } from 'parse5'
import { describe, expect, it, vi } from 'vitest'

import {
	getCspSource,
	getInlineContent,
	prepareHead,
	validateHeadItems,
	type HeadItems
} from '../src/main'

type Node = DefaultTreeAdapterMap['node']
function inlineElements(
	node: Node
): { type: 'script' | 'style'; content: string }[] {
	return [
		...('tagName' in node &&
		(node.tagName === 'script' || node.tagName === 'style')
			? [
					{
						type: node.tagName as 'script' | 'style',
						content: node.childNodes
							.map((child) => ('value' in child ? child.value : ''))
							.join('')
					}
				]
			: []),
		...('childNodes' in node ? node.childNodes.flatMap(inlineElements) : [])
	]
}

describe('CSP content preparation', () => {
	it.each(['\n', '\r', '\r\n', '\0', '\u2028', '\u2029'])(
		'hashes the actual HTML element text with separator %j',
		(separator) => {
			const items: HeadItems = {
				title: 'CSP',
				script: [{ textContent: `window.ready = true;${separator}` }],
				style: [{ innerHTML: `body { color: red; }${separator}` }],
				jsonLd: { '@type': 'Thing', name: `</SCRIPT><!--<script>${separator}` }
			}
			const head = prepareHead(items)
			const browser = inlineElements(
				parse(`<html><head>${head.html}</head><body>after</body></html>`)
			)
			expect(head.inline).toEqual(browser)
			for (const item of getInlineContent(items)) {
				expect(browser).toContainEqual(item)
			}
		}
	)

	it('uses callback results once for output, hashes, external resources and the base URL', () => {
		const callback = vi.fn((tag) => ({
			...tag,
			priority: tag.priority ?? 0,
			...(tag.tagName === 'script' && tag.textContent
				? { textContent: 'window.changed = true;\r\n' }
				: {}),
			...(tag.src ? { src: 'https://new.example.com/app.js' } : {}),
			...(tag.tagName === 'base' ? { href: 'https://new.example.com/' } : {})
		}))
		const head = prepareHead(
			{
				title: 'CSP',
				base: [{ href: 'https://old.example.com/' }],
				script: [
					{ textContent: 'window.old = true;' },
					{ src: 'https://old.example.com/app.js' }
				]
			},
			callback
		)
		expect(callback).toHaveBeenCalledTimes(6)
		expect(head.inline).toEqual([
			{ type: 'script', content: 'window.changed = true;\n' }
		])
		expect(head.resources).toEqual([
			{ type: 'script', url: 'https://new.example.com/app.js' }
		])
		expect(head.baseHref).toBe('https://new.example.com/')
		expect(head.html).not.toContain('old')
	})

	it('serializes JSON-LD once and leaves input objects unchanged', () => {
		const toJSON = vi.fn(() => ({ '@type': 'Thing', value: 'one' }))
		const script = Object.freeze({
			key: 'boot',
			textContent: 'window.boot = 1;\r\n'
		})
		const head = prepareHead({
			title: 'CSP',
			script: [script],
			jsonLd: { '@type': 'Thing', toJSON }
		})
		expect(toJSON).toHaveBeenCalledTimes(1)
		expect(script.textContent).toContain('\r\n')
		expect(head.inline).toContainEqual({
			type: 'script',
			content: '{"@type":"Thing","value":"one"}'
		})
	})

	it('extracts only the final keyed tags and correct link destinations', () => {
		const head = prepareHead([
			{
				title: 'CSP',
				script: [{ key: 'app', src: 'https://old.example.com/app.js' }]
			},
			{
				script: [{ key: 'app', src: '/app.js' }],
				link: [
					{ rel: 'stylesheet', href: '/app.css' },
					{ rel: 'preload', as: 'style', href: '/critical.css' },
					{ rel: 'preload', as: 'script', href: '/classic.js' },
					{ rel: 'modulepreload', as: 'worker', href: '/worker.js' },
					{ rel: 'modulepreload', as: 'style', href: '/module.css' },
					{ rel: 'modulepreload', as: 'json', href: '/data.json' },
					{ rel: 'preload', as: 'image', href: '/image.jpg' }
				]
			}
		])
		expect(head.resources).toHaveLength(6)
		expect(head.resources).not.toContainEqual(
			expect.objectContaining({ url: 'https://old.example.com/app.js' })
		)
		expect(head.resources).toContainEqual({ type: 'style', url: '/module.css' })
		expect(head.resources).toContainEqual({ type: 'script', url: '/worker.js' })
	})
})

describe('effective CSP URLs', () => {
	it.each([
		['/app.js', undefined, "'self'"],
		['./app.js', undefined, "'self'"],
		['../app.js', undefined, "'self'"],
		['https://site.example.com/app.js', undefined, "'self'"],
		['app.js', 'https://cdn.example.com/assets/', 'https://cdn.example.com'],
		['/app.js', 'https://cdn.example.com/assets/', 'https://cdn.example.com'],
		['app.js', '//cdn.example.com/assets/', 'https://cdn.example.com'],
		['app.js', '/assets/', "'self'"],
		['//cdn.example.com/app.js', undefined, 'https://cdn.example.com'],
		['data:text/javascript,void(0)', undefined, 'data:'],
		['blob:https://site.example.com/id', undefined, 'blob:'],
		['javascript:alert(1)', undefined, undefined],
		['//[bad', undefined, undefined],
		['https://[bad', undefined, undefined],
		['app.js', 'https://[bad', undefined],
		['', undefined, undefined]
	])('resolves %s against base %s', (url, baseUrl, expected) => {
		expect(
			getCspSource(url!, {
				documentUrl: 'https://site.example.com/page',
				baseUrl
			})
		).toBe(expected)
	})

	it('resolves protocol-relative resources using the document scheme', () => {
		expect(
			getCspSource('//cdn.example.com/app.js', {
				documentUrl: 'http://site.example.com/'
			})
		).toBe('http://cdn.example.com')
	})
})

describe('SRI validation', () => {
	it.each(['script', 'link'] as const)(
		'warns for scheme-relative %s resources without a base',
		(tagName) => {
			const items: HeadItems = {
				title: 'SRI',
				[tagName]:
					tagName === 'script'
						? [{ src: '//cdn.example.com/app.js' }]
						: [{ rel: 'stylesheet', href: '//cdn.example.com/app.css' }]
			}
			expect(
				validateHeadItems(items, {
					requireSri: true,
					requireDescription: false
				})
			).toContainEqual(expect.objectContaining({ code: 'missing-sri' }))
			const item = items[tagName]![0]
			item.integrity = 'sha384-example'
			expect(
				validateHeadItems(items, {
					requireSri: true,
					requireDescription: false
				})
			).toContainEqual(
				expect.objectContaining({ code: 'sri-missing-crossorigin' })
			)
		}
	)

	it('compares the effective base with the document origin', () => {
		const items = {
			title: 'SRI',
			base: [{ href: 'https://cdn.example.com/assets/' }],
			script: [{ src: 'app.js' }]
		}
		expect(
			validateHeadItems(items, {
				requireSri: true,
				baseUrl: 'https://site.example.com/page'
			})
		).toContainEqual(expect.objectContaining({ code: 'missing-sri' }))
		expect(
			validateHeadItems(items, {
				requireSri: true,
				baseUrl: 'https://cdn.example.com/page'
			})
		).not.toContainEqual(expect.objectContaining({ code: 'missing-sri' }))
	})

	it('uses a manual base for resolution while retaining the separate document origin', () => {
		expect(
			validateHeadItems(
				{ title: 'SRI', script: [{ src: 'app.js' }] },
				{
					requireSri: true,
					requireDescription: false,
					documentUrl: 'https://site.example.com/page',
					baseUrl: 'https://cdn.example.com/assets/'
				}
			)
		).toEqual([expect.objectContaining({ code: 'missing-sri' })])
	})

	it('resolves a Helmet base against the document even when a manual base option is supplied', () => {
		expect(
			validateHeadItems(
				{
					title: 'SRI',
					base: [{ href: '/assets/' }],
					script: [{ src: 'app.js' }]
				},
				{
					requireSri: true,
					requireDescription: false,
					documentUrl: 'https://site.example.com/page',
					baseUrl: 'https://cdn.example.com/assets/'
				}
			)
		).toEqual([])
	})

	it.each(['//[bad', '//bad host/app.js', 'https://[bad'])(
		'reports malformed URLs without throwing: %s',
		(src) => {
			expect(
				validateHeadItems({ title: 'SRI', script: [{ src }] })
			).toContainEqual(expect.objectContaining({ code: 'invalid-url' }))
		}
	)
})
