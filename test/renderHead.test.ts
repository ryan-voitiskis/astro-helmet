import { renderHead, type Tag } from '../src/main'
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
})
