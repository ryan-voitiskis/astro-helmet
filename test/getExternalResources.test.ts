import { getExternalResources, type HeadItems } from '../src/main'
import { describe, it, expect } from 'vitest'

describe('getExternalResources', () => {
	it('Returns empty array when no external resources', () => {
		const params: HeadItems = {
			title: 'Test',
			meta: [{ name: 'description', content: 'desc' }],
			style: [{ innerHTML: 'body {}' }]
		}
		expect(getExternalResources(params)).toEqual([])
	})

	it('Returns external script src URLs', () => {
		const params: HeadItems = {
			title: 'Test',
			script: [{ src: 'https://cdn.example.com/app.js' }]
		}
		expect(getExternalResources(params)).toEqual([
			{ type: 'script', url: 'https://cdn.example.com/app.js' }
		])
	})

	it('Normalizes URL object script and link resources to strings', () => {
		const params: HeadItems = {
			title: 'Test',
			script: [{ src: new URL('https://cdn.example.com/app.js') }],
			link: [
				{
					rel: 'stylesheet',
					href: new URL('https://cdn.example.com/site.css')
				},
				{
					rel: 'modulepreload',
					href: new URL('https://cdn.example.com/entry.js')
				}
			]
		}
		expect(getExternalResources(params)).toEqual([
			{ type: 'script', url: 'https://cdn.example.com/app.js' },
			{ type: 'style', url: 'https://cdn.example.com/site.css' },
			{ type: 'script', url: 'https://cdn.example.com/entry.js' }
		])
	})

	it('Skips inline scripts (no src)', () => {
		const params: HeadItems = {
			title: 'Test',
			script: [{ innerHTML: 'console.log("hi")' }, { src: '/app.js' }]
		}
		expect(getExternalResources(params)).toEqual([
			{ type: 'script', url: '/app.js' }
		])
	})

	it('Returns stylesheet link URLs', () => {
		const params: HeadItems = {
			title: 'Test',
			link: [{ rel: 'stylesheet', href: 'https://cdn.example.com/style.css' }]
		}
		expect(getExternalResources(params)).toEqual([
			{ type: 'style', url: 'https://cdn.example.com/style.css' }
		])
	})

	it('Returns preload as="script" URLs as script type', () => {
		const params: HeadItems = {
			title: 'Test',
			link: [{ rel: 'preload', href: '/app.js', as: 'script' }]
		}
		expect(getExternalResources(params)).toEqual([
			{ type: 'script', url: '/app.js' }
		])
	})

	it('Returns modulepreload URLs as script type', () => {
		const params: HeadItems = {
			title: 'Test',
			link: [{ rel: 'modulepreload', href: '/entry.js' }]
		}
		expect(getExternalResources(params)).toEqual([
			{ type: 'script', url: '/entry.js' }
		])
	})

	it('Classifies standard modulepreload destinations for CSP registration', () => {
		const params: HeadItems = {
			title: 'Test',
			link: [
				{ rel: 'modulepreload', href: '/default.js' },
				{ rel: 'modulepreload', href: '/script.js', as: 'script' },
				{ rel: 'modulepreload', href: '/worker.js', as: 'worker' },
				{ rel: 'modulepreload', href: '/style.css', as: 'style' },
				{ rel: 'modulepreload', href: '/data.json', as: 'json' },
				{ rel: 'modulepreload', href: '/text.txt', as: 'text' }
			]
		}

		expect(getExternalResources(params)).toEqual([
			{ type: 'script', url: '/default.js' },
			{ type: 'script', url: '/script.js' },
			{ type: 'script', url: '/worker.js' },
			{ type: 'style', url: '/style.css' }
		])
	})

	it('Matches rel and as values case-insensitively', () => {
		const params: HeadItems = {
			title: 'Test',
			link: [
				{ rel: 'StyleSheet', href: '/site.css' },
				{ rel: 'PRELOAD', href: '/app.js', as: 'SCRIPT' },
				{ rel: 'preload', href: '/style.css', as: 'STYLE' },
				{ rel: 'MODULEPRELOAD', href: '/module.js' }
			]
		}
		expect(getExternalResources(params)).toEqual([
			{ type: 'style', url: '/site.css' },
			{ type: 'script', url: '/app.js' },
			{ type: 'style', url: '/style.css' },
			{ type: 'script', url: '/module.js' }
		])
	})

	it('Deduplicates preload and modulepreload resources before returning external resources', () => {
		const params: HeadItems = {
			title: 'Test',
			link: [
				{ rel: 'preload', href: '/app.js', as: 'script' },
				{ rel: 'preload', href: '/app.js', as: 'script' },
				{ rel: 'modulepreload', href: '/entry.js' },
				{ rel: 'modulepreload', href: '/entry.js' }
			]
		}
		expect(getExternalResources(params)).toEqual([
			{ type: 'script', url: '/app.js' },
			{ type: 'script', url: '/entry.js' }
		])
	})

	it('Returns preload as="style" URLs as style type', () => {
		const params: HeadItems = {
			title: 'Test',
			link: [{ rel: 'preload', href: '/style.css', as: 'style' }]
		}
		expect(getExternalResources(params)).toEqual([
			{ type: 'style', url: '/style.css' }
		])
	})

	it('Ignores preload for non-script/style resources', () => {
		const params: HeadItems = {
			title: 'Test',
			link: [
				{ rel: 'preload', href: '/font.woff2', as: 'font' },
				{ rel: 'preload', href: '/image.png', as: 'image' }
			]
		}
		expect(getExternalResources(params)).toEqual([])
	})

	it('Ignores preconnect and prefetch links', () => {
		const params: HeadItems = {
			title: 'Test',
			link: [
				{ rel: 'preconnect', href: 'https://cdn.example.com' },
				{ rel: 'prefetch', href: '/next-page.js' }
			]
		}
		expect(getExternalResources(params)).toEqual([])
	})

	it('Returns mixed external resources', () => {
		const params: HeadItems = {
			title: 'Test',
			script: [{ src: '/app.js' }, { innerHTML: 'var x = 1' }],
			link: [
				{ rel: 'stylesheet', href: '/style.css' },
				{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
				{ rel: 'preload', href: '/critical.js', as: 'script' }
			]
		}
		expect(getExternalResources(params)).toEqual([
			{ type: 'script', url: '/app.js' },
			{ type: 'style', url: '/style.css' },
			{ type: 'script', url: '/critical.js' }
		])
	})

	it('Skips links missing rel or href', () => {
		const params: HeadItems = {
			title: 'Test',
			link: [
				{ href: '/no-rel.css' },
				{ rel: 'stylesheet' },
				{ rel: 'preload', as: 'script' },
				{ rel: 'stylesheet', href: '/keep.css' }
			]
		}
		expect(getExternalResources(params)).toEqual([
			{ type: 'style', url: '/keep.css' }
		])
	})

	it('Skips preload links without an `as` attribute', () => {
		const params: HeadItems = {
			title: 'Test',
			link: [{ rel: 'preload', href: '/unknown' }]
		}
		expect(getExternalResources(params)).toEqual([])
	})

	it('Works with merged HeadItems array', () => {
		const layout: HeadItems = {
			title: 'Layout',
			link: [{ rel: 'stylesheet', href: '/global.css' }]
		}
		const page: HeadItems = {
			title: 'Page',
			script: [{ src: '/page.js' }]
		}
		expect(getExternalResources([layout, page])).toEqual([
			{ type: 'script', url: '/page.js' },
			{ type: 'style', url: '/global.css' }
		])
	})
})
