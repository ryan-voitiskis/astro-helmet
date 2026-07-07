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

	it('Escapes title text content', () => {
		const params = { title: '</title><script>alert("xss")</script>' }
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>&lt;/title&gt;&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</title>`
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

	it('Orders resource-hint links with case-insensitive rel tokens', () => {
		const params = {
			title: 'My Site Title',
			link: [
				{ rel: 'icon', href: '/favicon.ico' },
				{ rel: 'StyleSheet', href: '/site.css' },
				{ rel: 'MODULEPRELOAD', href: '/entry.js' },
				{ rel: 'dns-prefetch', href: 'https://cdn.example.com' },
				{ rel: 'preconnect', href: 'https://api.example.com' },
				{ rel: 'preload', href: '/font.woff2', as: 'font' },
				{ rel: 'prefetch', href: '/next.js' },
				{ rel: 'prerender', href: '/next-page' }
			]
		}
		const expected = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>
<link rel="preconnect" href="https://api.example.com">
<link rel="dns-prefetch" href="https://cdn.example.com">
<link rel="StyleSheet" href="/site.css">
<link rel="MODULEPRELOAD" href="/entry.js">
<link rel="preload" href="/font.woff2" as="font">
<link rel="prefetch" href="/next.js">
<link rel="prerender" href="/next-page">
<link rel="icon" href="/favicon.ico">`
		expect(renderHead(params)).toEqual(expected)
	})

	it('Deduplicates canonical and resource-hint links with last-write-wins', () => {
		const params = {
			title: 'My Site Title',
			link: [
				{ rel: 'canonical', href: 'https://example.com/old' },
				{ rel: 'canonical', href: 'https://example.com/new' },
				{ rel: 'preconnect', href: 'https://cdn.example.com' },
				{
					rel: 'preconnect',
					href: 'https://cdn.example.com',
					crossorigin: 'anonymous'
				},
				{ rel: 'preload', href: '/app.js', as: 'script' },
				{
					rel: 'preload',
					href: '/app.js',
					as: 'script',
					fetchpriority: 'high'
				}
			]
		}
		const result = renderHead(params)
		expect(result).not.toContain('https://example.com/old')
		expect(result).toContain(
			'<link rel="canonical" href="https://example.com/new">'
		)
		expect(result.match(/rel="preconnect"/g)).toHaveLength(1)
		expect(result).toContain(
			'<link rel="preconnect" href="https://cdn.example.com" crossorigin="anonymous">'
		)
		expect(result.match(/rel="preload"/g)).toHaveLength(1)
		expect(result).toContain(
			'<link rel="preload" href="/app.js" as="script" fetchpriority="high">'
		)
	})

	it('Keeps distinct preload variants for the same URL', () => {
		const params = {
			title: 'My Site Title',
			link: [
				{ rel: 'preload', href: '/asset', as: 'script' },
				{ rel: 'preload', href: '/asset', as: 'style' }
			]
		}
		const result = renderHead(params)
		expect(result).toContain('<link rel="preload" href="/asset" as="script">')
		expect(result).toContain('<link rel="preload" href="/asset" as="style">')
	})

	it('Deduplicates href-less responsive image preloads', () => {
		const params = {
			title: 'Responsive Preloads',
			link: [
				{
					rel: 'preload',
					as: 'image',
					imagesrcset: '/hero-640.jpg 640w, /hero-1280.jpg 1280w',
					imagesizes: '100vw',
					fetchpriority: 'low'
				},
				{
					rel: 'preload',
					as: 'image',
					imagesrcset: '/hero-640.jpg 640w, /hero-1280.jpg 1280w',
					imagesizes: '100vw',
					fetchpriority: 'high'
				},
				{
					rel: 'preload',
					as: 'image',
					imagesrcset: '/hero-640.jpg 640w, /hero-1280.jpg 1280w',
					imagesizes: '(min-width: 800px) 50vw, 100vw',
					fetchpriority: 'high'
				},
				{
					rel: 'preload',
					as: 'image',
					imagesrcset: '/hero-640.jpg 640w, /hero-1280.jpg 1280w',
					imagesizes: '100vw',
					media: '(min-width: 800px)',
					fetchpriority: 'high'
				}
			]
		}
		const result = renderHead(params)
		expect(result.match(/rel="preload"/g)).toHaveLength(3)
		expect(result).not.toContain('fetchpriority="low"')
		expect(result).toContain(
			'<link rel="preload" as="image" imagesrcset="/hero-640.jpg 640w, /hero-1280.jpg 1280w" imagesizes="100vw" fetchpriority="high">'
		)
		expect(result).toContain(
			'<link rel="preload" as="image" imagesrcset="/hero-640.jpg 640w, /hero-1280.jpg 1280w" imagesizes="(min-width: 800px) 50vw, 100vw" fetchpriority="high">'
		)
		expect(result).toContain(
			'<link rel="preload" as="image" imagesrcset="/hero-640.jpg 640w, /hero-1280.jpg 1280w" imagesizes="100vw" media="(min-width: 800px)" fetchpriority="high">'
		)
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

	it('Escapes textContent in inline style, script and noscript tags', () => {
		const params = {
			title: 'My Site Title',
			style: [{ textContent: 'body::before { content: "</style>"; }' }],
			script: [{ textContent: 'console.log("</SCRIPT>")' }],
			noscript: [{ textContent: '<p>Please enable JavaScript</p>' }]
		}
		const result = renderHead(params)
		expect(result).toContain(
			'<style>body::before { content: "<\\/style>"; }</style>'
		)
		expect(result).toContain('<script>console.log("<\\/script>")</script>')
		expect(result).toContain(
			'<noscript>&lt;p&gt;Please enable JavaScript&lt;/p&gt;</noscript>'
		)
	})

	it('Deduplicates keyed tags without rendering the key attribute', () => {
		const params = [
			{
				title: 'First',
				meta: [{ key: 'description', name: 'description', content: 'First' }],
				link: [
					{ key: 'canonical', rel: 'canonical', href: 'https://first.com' }
				],
				style: [{ key: 'critical', textContent: 'body { color: red; }' }],
				script: [{ key: 'analytics', textContent: 'window.first = true;' }],
				noscript: [{ key: 'fallback', textContent: 'First fallback' }]
			},
			{
				title: 'Second',
				meta: [{ key: 'description', name: 'description', content: 'Second' }],
				link: [
					{ key: 'canonical', rel: 'canonical', href: 'https://second.com' }
				],
				style: [{ key: 'critical', textContent: 'body { color: blue; }' }],
				script: [{ key: 'analytics', textContent: 'window.second = true;' }],
				noscript: [{ key: 'fallback', textContent: 'Second fallback' }]
			}
		]
		const result = renderHead(params)
		expect(result).not.toContain('First')
		expect(result).not.toContain('https://first.com')
		expect(result).not.toContain('color: red')
		expect(result).not.toContain('window.first')
		expect(result).toContain('<title>Second</title>')
		expect(result).toContain('<meta name="description" content="Second">')
		expect(result).toContain('<link rel="canonical" href="https://second.com">')
		expect(result).toContain('<style>body { color: blue; }</style>')
		expect(result).toContain('<script>window.second = true;</script>')
		expect(result).toContain('<noscript>Second fallback</noscript>')
		expect(result).not.toContain('key=')
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

	it('Orders @import styles early when authored with textContent', () => {
		const params = {
			title: 'My Site Title',
			style: [
				{ textContent: 'body { color: red; }' },
				{ textContent: '@import url("imported.css");body { color: blue; }' }
			],
			script: [{ textContent: 'window.ready = true;' }]
		}
		const result = renderHead(params)
		expect(result.indexOf('@import url')).toBeLessThan(
			result.indexOf('window.ready')
		)
		expect(result.indexOf('@import url')).toBeLessThan(
			result.indexOf('body { color: red; }')
		)
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

	it('Deduplicates base tags, keeping the last', () => {
		const params = {
			title: 'T',
			base: [{ href: 'https://first.com' }, { href: 'https://last.com' }]
		}
		const result = renderHead(params)
		expect(result).not.toContain('first.com')
		expect(result).toContain('<base href="https://last.com">')
	})

	it('Deduplicates charset meta tags, keeping the last', () => {
		const params = [
			{ title: 'T', meta: [{ charset: 'UTF-8' }] },
			{ meta: [{ charset: 'UTF-16' }] }
		]
		const result = renderHead(params)
		expect(result).toContain('charset="UTF-16"')
		expect(result).not.toMatch(/charset="UTF-8"/)
	})

	it('Deduplicates meta names and http-equiv values case-insensitively', () => {
		const params = {
			title: 'T',
			meta: [
				{ name: 'Description', content: 'Old' },
				{ name: 'description', content: 'New' },
				{ 'http-equiv': 'Refresh', content: '60' },
				{ 'http-equiv': 'refresh', content: '30' }
			]
		}
		const result = renderHead(params)
		expect(result).not.toContain('content="Old"')
		expect(result).not.toContain('content="60"')
		expect(result).toContain('<meta name="description" content="New">')
		expect(result).toContain('<meta http-equiv="refresh" content="30">')
	})

	it('Suppresses the default viewport with a case-insensitive viewport meta name', () => {
		const params = {
			title: 'T',
			meta: [{ name: 'Viewport', content: 'width=device-width' }]
		}
		const result = renderHead(params)
		expect(result.match(/name="Viewport"|name="viewport"/g)).toHaveLength(1)
		expect(result).toContain(
			'<meta name="Viewport" content="width=device-width">'
		)
	})

	it('Does not suppress default charset for an empty charset value', () => {
		const params = {
			title: 'T',
			meta: [{ charset: '' }]
		}
		const result = renderHead(params)
		expect(result).toContain('<meta charset="UTF-8">')
		expect(result).toContain('<meta charset="">')
	})

	it('Deduplicates same-media meta tags via last-write-wins', () => {
		const params = {
			title: 'T',
			meta: [
				{
					name: 'theme-color',
					media: '(prefers-color-scheme: light)',
					content: 'white'
				},
				{
					name: 'theme-color',
					media: '(prefers-color-scheme: dark)',
					content: 'black'
				},
				{
					name: 'theme-color',
					media: '(prefers-color-scheme: light)',
					content: 'cyan'
				}
			]
		}
		const result = renderHead(params)
		expect(result).not.toContain('content="white"')
		expect(result).toContain('content="cyan"')
		expect(result).toContain('content="black"')
	})

	it('Preserves multiple keyless metas with same value', () => {
		const params = {
			title: 'T',
			meta: [
				{ itemprop: 'name', content: 'Same' },
				{ itemprop: 'name', content: 'Same' }
			]
		}
		const result = renderHead(params)
		const matches = result.match(/itemprop="name"/g)
		expect(matches).toHaveLength(2)
	})

	it('Preserves relative order between keyed and keyless meta tags', () => {
		const params = {
			title: 'T',
			meta: [
				{ name: 'description', content: 'First' },
				{ itemprop: 'name', content: 'Keyless' },
				{ property: 'og:title', content: 'Open Graph title' }
			]
		}
		const result = renderHead(params)
		expect(result.indexOf('name="description"')).toBeLessThan(
			result.indexOf('itemprop="name"')
		)
		expect(result.indexOf('itemprop="name"')).toBeLessThan(
			result.indexOf('property="og:title"')
		)
	})

	it('Does not deduplicate meta tags across name and property namespaces', () => {
		const params = {
			title: 'T',
			meta: [
				{ name: 'description', content: 'Name description' },
				{ property: 'description', content: 'Property description' }
			]
		}
		const result = renderHead(params)
		expect(result).toContain(
			'<meta name="description" content="Name description">'
		)
		expect(result).toContain(
			'<meta property="description" content="Property description">'
		)
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
					itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home' }]
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

	it('Escapes mixed-case </script> in JSON-LD values', () => {
		const params: HeadItems = {
			title: 'My Article',
			jsonLd: {
				'@type': 'Article',
				headline: 'Test </SCRIPT>'
			}
		}
		const result = renderHead(params)
		expect(result).not.toContain('</SCRIPT>')
		expect(result).toContain('<\\/SCRIPT>')
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
		const metaDescIdx = lines.findIndex((l) => l.includes('name="description"'))
		const jsonLdIdx = lines.findIndex((l) => l.includes('application/ld+json'))
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
		expect(result).toContain('<\\/script>')
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
