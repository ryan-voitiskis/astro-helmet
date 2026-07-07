import { getInlineContent, renderHead, type HeadItems } from '../src/main'
import { describe, it, expect } from 'vitest'

describe('getInlineContent', () => {
	it('Returns empty array for head with no inline content', () => {
		const params: HeadItems = {
			title: 'My Site Title',
			meta: [{ name: 'description', content: 'desc' }],
			link: [{ rel: 'stylesheet', href: '/style.css' }]
		}
		expect(getInlineContent(params)).toEqual([])
	})

	it('Returns inline style content', () => {
		const params: HeadItems = {
			title: 'My Site Title',
			style: [{ innerHTML: 'body { color: red }' }]
		}
		expect(getInlineContent(params)).toEqual([
			{ type: 'style', content: 'body { color: red }' }
		])
	})

	it('Returns inline script content', () => {
		const params: HeadItems = {
			title: 'My Site Title',
			script: [{ innerHTML: 'console.log("hello")' }]
		}
		expect(getInlineContent(params)).toEqual([
			{ type: 'script', content: 'console.log("hello")' }
		])
	})

	it('Returns JSON-LD content with @context and escaping', () => {
		const params: HeadItems = {
			title: 'My Site Title',
			jsonLd: { '@type': 'WebSite', name: 'My Site' }
		}
		const result = getInlineContent(params)
		expect(result).toHaveLength(1)
		expect(result[0].type).toBe('script')
		expect(result[0].content).toContain('"@context":"https://schema.org"')
		expect(result[0].content).toContain('"@type":"WebSite"')
		expect(result[0].content).toContain('"name":"My Site"')
	})

	it('Escapes </ in JSON-LD content', () => {
		const params: HeadItems = {
			title: 'My Site Title',
			jsonLd: { '@type': 'WebSite', name: '</script>' }
		}
		const result = getInlineContent(params)
		expect(result[0].content).toContain('<\\/script>')
		expect(result[0].content).not.toContain('</script>')
	})

	it('Returns multiple JSON-LD items', () => {
		const params: HeadItems = {
			title: 'My Site Title',
			jsonLd: [
				{ '@type': 'WebSite', name: 'My Site' },
				{ '@type': 'Organization', name: 'My Org' }
			]
		}
		const result = getInlineContent(params)
		expect(result).toHaveLength(2)
		expect(result[0].type).toBe('script')
		expect(result[1].type).toBe('script')
		expect(result[0].content).toContain('"@type":"WebSite"')
		expect(result[1].content).toContain('"@type":"Organization"')
	})

	it('Returns mixed inline content in order: styles, scripts, jsonLd', () => {
		const params: HeadItems = {
			title: 'My Site Title',
			style: [{ innerHTML: 'body { margin: 0 }' }],
			script: [{ innerHTML: 'var x = 1' }],
			jsonLd: { '@type': 'WebSite', name: 'Test' }
		}
		const result = getInlineContent(params)
		expect(result).toHaveLength(3)
		expect(result[0]).toEqual({ type: 'style', content: 'body { margin: 0 }' })
		expect(result[1]).toEqual({ type: 'script', content: 'var x = 1' })
		expect(result[2].type).toBe('script')
		expect(result[2].content).toContain('"@type":"WebSite"')
	})

	it('Skips scripts and styles without innerHTML', () => {
		const params: HeadItems = {
			title: 'My Site Title',
			style: [{ innerHTML: 'body {}' }, {}],
			script: [{ src: '/app.js' }, { innerHTML: 'var y = 2' }]
		}
		const result = getInlineContent(params)
		expect(result).toEqual([
			{ type: 'style', content: 'body {}' },
			{ type: 'script', content: 'var y = 2' }
		])
	})

	it('Skips empty-string innerHTML', () => {
		const params: HeadItems = {
			title: 'Test',
			style: [{ innerHTML: '' }, { innerHTML: 'body {}' }],
			script: [{ innerHTML: '' }, { innerHTML: 'var x = 1' }]
		}
		expect(getInlineContent(params)).toEqual([
			{ type: 'style', content: 'body {}' },
			{ type: 'script', content: 'var x = 1' }
		])
	})

	it('Uses textContent and keyed deduplication to match rendered inline content', () => {
		const params: HeadItems[] = [
			{
				title: 'Test',
				style: [{ key: 'critical', textContent: 'body { color: red }' }],
				script: [{ key: 'boot', textContent: 'window.old = true;' }]
			},
			{
				style: [{ key: 'critical', textContent: 'body { color: blue }' }],
				script: [{ key: 'boot', textContent: 'window.new = true;' }]
			}
		]
		expect(getInlineContent(params)).toEqual([
			{ type: 'style', content: 'body { color: blue }' },
			{ type: 'script', content: 'window.new = true;' }
		])
	})

	it('Excludes noscript innerHTML from inline content', () => {
		const params: HeadItems = {
			title: 'Test',
			noscript: [{ innerHTML: '<p>Enable JS</p>' }]
		}
		expect(getInlineContent(params)).toEqual([])
	})

	it('Returns content matching what renderHead embeds inline', () => {
		const params: HeadItems = {
			title: 'Test',
			style: [{ innerHTML: 'body { margin: 0 }' }],
			script: [{ innerHTML: 'console.log("hi")' }],
			jsonLd: { '@type': 'WebSite', name: 'Test </script>' }
		}
		const inline = getInlineContent(params)
		const rendered = renderHead(params)
		for (const { content } of inline) {
			expect(rendered).toContain(`>${content}<`)
		}
	})

	it('Works with merged HeadItems array', () => {
		const layout: HeadItems = {
			title: 'Layout',
			style: [{ innerHTML: ':root { --bg: white }' }]
		}
		const page: HeadItems = {
			title: 'Page',
			jsonLd: { '@type': 'Article', name: 'Post' }
		}
		const result = getInlineContent([layout, page])
		expect(result).toHaveLength(2)
		expect(result[0]).toEqual({
			type: 'style',
			content: ':root { --bg: white }'
		})
		expect(result[1].type).toBe('script')
		expect(result[1].content).toContain('"@type":"Article"')
	})
})
