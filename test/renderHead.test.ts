import { renderHead, type Tag, type HeadItems } from '../src/main'
import { describe, it, expect } from 'vitest'

describe('renderHead', () => {
	it('Render head with minimal content', () => {
		const params = { title: 'My Site Title' }
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Render head with base tag', () => {
		const params = {
			title: 'My Site Title',
			base: [{ href: 'https://example.com' }]
		}
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="https://example.com">
<title>My Site Title</title>`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Render head with meta tags', () => {
		const params = {
			title: 'My Site Title',
			meta: [{ name: 'description', content: 'My site description' }]
		}
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>
<meta name="description" content="My site description">`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Render head with link tags', () => {
		const params = {
			title: 'My Site Title',
			link: [{ rel: 'stylesheet', href: 'styles.css' }]
		}
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>
<link rel="stylesheet" href="styles.css">`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Render head with various link tags, from array in params', () => {
		const params = [
			{
				link: [
					{ rel: 'stylesheet', href: 'styles0.css' },
					{ rel: 'icon', href: 'favicon.ico' },
					{ rel: 'preload', href: 'preload0.js' }
				]
			},
			{
				title: 'My Site Title',
				link: [
					{ rel: 'stylesheet', href: 'styles1.css' },
					{ rel: 'prefetch', href: 'prefetch.js' },
					{ rel: 'preload', href: 'preload1.js' },
					{ rel: 'preconnect', href: 'https://example.com' }
				]
			}
		]
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>
<link rel="preconnect" href="https://example.com">
<link rel="stylesheet" href="styles0.css">
<link rel="stylesheet" href="styles1.css">
<link rel="preload" href="preload0.js">
<link rel="preload" href="preload1.js">
<link rel="prefetch" href="prefetch.js">
<link rel="icon" href="favicon.ico">`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Render head with style tags', () => {
		const params = {
			title: 'My Site Title',
			style: [{ innerHTML: 'body { color: red; }' }]
		}
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>
<style>body { color: red; }</style>`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Render head with ordered various style tags', () => {
		const params = {
			title: 'My Site Title',
			style: [
				{ innerHTML: 'body { color: red; }' },
				{ innerHTML: 'body { background-color: blue; }' },
				{ innerHTML: '@import url("imported.css");body { font-size: 16px; }' }
			]
		}
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>
<style>@import url("imported.css");body { font-size: 16px; }</style>
<style>body { color: red; }</style>
<style>body { background-color: blue; }</style>`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Render head with script tags', () => {
		const params = {
			title: 'My Site Title',
			script: [{ innerHTML: 'console.log("Hello, world!")' }]
		}
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>
<script>console.log("Hello, world!")</script>`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Render head with noscript tags', () => {
		const params = {
			title: 'My Site Title',
			noscript: [{ innerHTML: 'Please enable JavaScript' }]
		}
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>
<noscript>Please enable JavaScript</noscript>`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Render head with specified priorities', () => {
		const params = {
			title: 'My Site Title',
			meta: [
				{ name: 'description', content: 'My site description', priority: 1 },
				{ name: 'keywords', content: 'site, description', priority: 3 }
			],
			link: [
				{ rel: 'stylesheet', href: 'styles.css', priority: 4 },
				{ rel: 'icon', href: 'favicon.ico', priority: 2 }
			]
		}
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>
<meta name="description" content="My site description">
<link rel="icon" href="favicon.ico">
<meta name="keywords" content="site, description">
<link rel="stylesheet" href="styles.css">`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Merges duplicate meta tags', () => {
		const params = {
			title: 'My Site Title',
			meta: [
				{ name: 'description', content: 'My site description' },
				{ name: 'description', content: 'Another site description' }
			]
		}
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>
<meta name="description" content="Another site description">`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Merges various types of duplicate meta tags across array in params', () => {
		const params = [
			{
				title: 'My Site Title',
				meta: [
					{ name: 'description', content: 'My site description' },
					{ property: 'og:description', content: 'My site description' },
					{ 'http-equiv': 'refresh', content: '60' }
				]
			},
			{
				meta: [
					{ name: 'description', content: 'A different site description' },
					{
						property: 'og:description',
						content: 'A different site description'
					},
					{ 'http-equiv': 'refresh', content: '30' }
				]
			}
		]
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="30">
<title>My Site Title</title>
<meta name="description" content="A different site description">
<meta property="og:description" content="A different site description">`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Merge multiple titles', () => {
		const params = [{ title: 'My Site Title' }, { title: 'Another Site Title' }]
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Another Site Title</title>`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Merge multiple titles with one missing', () => {
		const params = [{ title: 'My Site Title' }, {}]
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Render head with all tags, merged', () => {
		const params = [
			{
				title: 'My Site Title',
				base: [{ href: 'https://example.com' }],
				meta: [{ name: 'description', content: 'My site description' }],
				link: [{ rel: 'stylesheet', href: 'styles.css' }],
				style: [{ innerHTML: 'body { color: red; }' }],
				script: [{ innerHTML: 'console.log("Hello, world!")' }],
				noscript: [{ innerHTML: 'Please enable JavaScript' }]
			},
			{
				meta: [
					{ name: 'viewport', content: 'width=device-width, initial-scale=2' }
				],
				link: [
					{ rel: 'prefetch', href: 'prefetch.js' },
					{ rel: 'preload', href: 'preload.js' },
					{ rel: 'preconnect', href: 'https://example.com' }
				],
				script: [
					{ src: 'my_script.js' },
					{ defer: true, innerHTML: 'console.log("defer!")' },
					{ async: true, innerHTML: 'console.log("async!")' }
				]
			}
		]
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=2">
<base href="https://example.com">
<title>My Site Title</title>
<link rel="preconnect" href="https://example.com">
<script async>console.log("async!")</script>
<script>console.log("Hello, world!")</script>
<script src="my_script.js"></script>
<link rel="stylesheet" href="styles.css">
<style>body { color: red; }</style>
<link rel="preload" href="preload.js">
<script defer>console.log("defer!")</script>
<link rel="prefetch" href="prefetch.js">
<meta name="description" content="My site description">
<noscript>Please enable JavaScript</noscript>`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Render head tags with correct order using applyPriority()', () => {
		const headItems = {
			title: 'My Site Title',
			meta: [{ name: 'description', content: 'My site description' }],
			script: [{ innerHTML: 'console.log("Hello, world!")' }]
		}
		function applyPriority(tag: Tag): Required<Tag> {
			if (typeof tag.priority === 'number') return tag as Required<Tag>
			let priority: number
			switch (tag.tagName) {
				case 'script':
					priority = 0
					break

				case 'title':
					priority = 1
					break

				default:
					priority = 2
			}
			return { ...tag, priority }
		}
		const expected = `<script>console.log("Hello, world!")</script>
<title>My Site Title</title>
<meta name="description" content="My site description">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">`
		expect(renderHead(headItems, applyPriority)).toEqual(expected)
	})

	it('Errors if title is missing', () => {
		const params = {}
		expect(() => renderHead(params)).toThrowError('Missing title tag')
	})

	it('Errors if empty array is passed', () => {
		expect(() => renderHead([])).toThrowError('Missing title tag')
	})

	it('Preserves meta tags with itemprop attribute', () => {
		const params = {
			title: 'My Site Title',
			meta: [{ itemprop: 'name', content: 'My Site' }]
		}
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>
<meta itemprop="name" content="My Site">`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Custom charset meta suppresses the default UTF-8', () => {
		const params = {
			title: 'My Site Title',
			meta: [{ charset: 'UTF-16' }]
		}
		const expected = `<meta charset="UTF-16">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Void elements with no attributes render without trailing space', () => {
		const params = { title: 'T', base: [{}] }
		const result = renderHead(params)
		expect(result).toContain('<base>')
		expect(result).not.toContain('<base >')
	})

	it('Style tag without innerHTML does not crash and renders correctly', () => {
		const params = { title: 'T', style: [{ media: 'print' }] }
		const result = renderHead(params)
		expect(result).toContain('<style media="print"></style>')
	})

	it('Does not deduplicate meta tags with same name but different media attributes', () => {
		const params = {
			title: 'My Site Title',
			meta: [
				{
					name: 'theme-color',
					media: '(prefers-color-scheme: light)',
					content: 'cyan'
				},
				{
					name: 'theme-color',
					media: '(prefers-color-scheme: dark)',
					content: 'black'
				}
			]
		}
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>
<meta name="theme-color" media="(prefers-color-scheme: light)" content="cyan">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="black">`
		expect(renderHead(params)).toEqual(expected)
	})
})

describe('JSON-LD', () => {
	it('Single JSON-LD block renders correctly with @context injected', () => {
		const params: HeadItems = {
			title: 'My Article',
			jsonLd: {
				'@type': 'Article',
				headline: 'My Article'
			}
		}
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Article</title>
<script type="application/ld+json">{"@type":"Article","headline":"My Article","@context":"https://schema.org"}</script>`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Multiple JSON-LD blocks render as separate script tags', () => {
		const params: HeadItems = {
			title: 'My Article',
			jsonLd: [
				{ '@type': 'Article', headline: 'My Article' },
				{
					'@type': 'BreadcrumbList',
					itemListElement: [
						{ '@type': 'ListItem', position: 1, name: 'Home' }
					]
				}
			]
		}
		const result = renderHead(params)
		const jsonLdTags = result
			.split('\n')
			.filter((line) => line.includes('application/ld+json'))
		expect(jsonLdTags).toHaveLength(2)
		expect(jsonLdTags[0]).toContain('"@type":"Article"')
		expect(jsonLdTags[1]).toContain('"@type":"BreadcrumbList"')
	})

	it('Value containing </script> is escaped to <\\/script>', () => {
		const params: HeadItems = {
			title: 'My Article',
			jsonLd: {
				'@type': 'Article',
				headline: 'Test </script><script>alert("xss")</script>'
			}
		}
		const result = renderHead(params)
		expect(result).not.toContain('</script><script>')
		expect(result).toContain('<\\/script>')
	})

	it('Array merge from HeadItems[] concatenates JSON-LD blocks', () => {
		const params: HeadItems[] = [
			{
				title: 'My Article',
				jsonLd: { '@type': 'WebSite', name: 'My Blog' }
			},
			{
				jsonLd: { '@type': 'Article', headline: 'My Article' }
			}
		]
		const result = renderHead(params)
		const jsonLdTags = result
			.split('\n')
			.filter((line) => line.includes('application/ld+json'))
		expect(jsonLdTags).toHaveLength(2)
		expect(jsonLdTags[0]).toContain('"@type":"WebSite"')
		expect(jsonLdTags[1]).toContain('"@type":"Article"')
	})

	it('JSON-LD sorts after regular meta (100) and before noscript (110)', () => {
		const params: HeadItems = {
			title: 'My Article',
			meta: [{ name: 'description', content: 'A description' }],
			noscript: [{ innerHTML: 'Please enable JavaScript' }],
			jsonLd: { '@type': 'Article', headline: 'My Article' }
		}
		const result = renderHead(params)
		const lines = result.split('\n')
		const metaDescIdx = lines.findIndex((l) =>
			l.includes('name="description"')
		)
		const jsonLdIdx = lines.findIndex((l) =>
			l.includes('application/ld+json')
		)
		const noscriptIdx = lines.findIndex((l) => l.includes('<noscript>'))
		expect(metaDescIdx).toBeLessThan(jsonLdIdx)
		expect(jsonLdIdx).toBeLessThan(noscriptIdx)
	})

	it('Works with custom applyPriority function', () => {
		const params: HeadItems = {
			title: 'My Article',
			jsonLd: { '@type': 'Article', headline: 'My Article' }
		}
		function applyPriority(tag: Tag): Required<Tag> {
			if (typeof tag.priority === 'number') return tag as Required<Tag>
			let priority: number
			if (tag.type === 'application/ld+json') priority = -10
			else if (tag.tagName === 'title') priority = 0
			else priority = 1
			return { ...tag, priority }
		}
		const result = renderHead(params, applyPriority)
		const lines = result.split('\n')
		expect(lines[0]).toContain('application/ld+json')
	})

	it('Renders correctly alongside other head elements', () => {
		const params: HeadItems = {
			title: 'My Article',
			meta: [{ name: 'description', content: 'A description' }],
			link: [{ rel: 'stylesheet', href: 'styles.css' }],
			script: [{ innerHTML: 'console.log("hi")' }],
			noscript: [{ innerHTML: 'Enable JS' }],
			jsonLd: { '@type': 'Article', headline: 'My Article' }
		}
		const result = renderHead(params)
		expect(result).toContain('<title>My Article</title>')
		expect(result).toContain('name="description"')
		expect(result).toContain('rel="stylesheet"')
		expect(result).toContain('console.log("hi")')
		expect(result).toContain('<noscript>Enable JS</noscript>')
		expect(result).toContain('application/ld+json')
		expect(result).toContain('"@context":"https://schema.org"')
	})

	it('Empty jsonLd array renders no script tags', () => {
		const params: HeadItems = { title: 'Test', jsonLd: [] }
		const result = renderHead(params)
		expect(result).not.toContain('application/ld+json')
	})

	it('@context cannot be overridden by user input', () => {
		const params = {
			title: 'Test',
			jsonLd: {
				'@type': 'Article',
				'@context': 'https://evil.com'
			}
		} as HeadItems
		const result = renderHead(params)
		expect(result).toContain('"@context":"https://schema.org"')
		expect(result).not.toContain('evil.com')
	})

	it('Escapes </script> in nested object values', () => {
		const params: HeadItems = {
			title: 'Test',
			jsonLd: {
				'@type': 'Article',
				author: {
					'@type': 'Person',
					name: '</script><script>alert(1)</script>'
				}
			}
		}
		const result = renderHead(params)
		expect(result).not.toContain('</script><script>')
	})

	it('No extra script tags when jsonLd is not provided', () => {
		const params: HeadItems = {
			title: 'My Site Title'
		}
		const result = renderHead(params)
		expect(result).not.toContain('application/ld+json')
		expect(result).not.toContain('@context')
	})
})
