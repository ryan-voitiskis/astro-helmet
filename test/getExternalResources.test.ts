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

	it('Skips inline scripts (no src)', () => {
		const params: HeadItems = {
			title: 'Test',
			script: [
				{ innerHTML: 'console.log("hi")' },
				{ src: '/app.js' }
			]
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
