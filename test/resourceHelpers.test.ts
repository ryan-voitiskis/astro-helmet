import {
	dnsPrefetch,
	externalScript,
	getExternalResources,
	modulepreload,
	preconnect,
	preload,
	preloadFont,
	preloadImage,
	renderHead,
	stylesheet,
	type HeadItems
} from '../src/main'
import { describe, expect, it } from 'vitest'

describe('resource helpers', () => {
	it('Creates common resource hint and resource tags', () => {
		expect(preconnect('https://api.example.com', { crossorigin: '' })).toEqual({
			rel: 'preconnect',
			href: 'https://api.example.com',
			crossorigin: ''
		})
		expect(dnsPrefetch('https://cdn.example.com')).toEqual({
			rel: 'dns-prefetch',
			href: 'https://cdn.example.com'
		})
		expect(preload('/app.js', { as: 'script', fetchpriority: 'high' })).toEqual(
			{
				rel: 'preload',
				href: '/app.js',
				as: 'script',
				fetchpriority: 'high'
			}
		)
		expect(modulepreload('/entry.js')).toEqual({
			rel: 'modulepreload',
			href: '/entry.js'
		})
		expect(stylesheet('/site.css', { media: 'screen' })).toEqual({
			rel: 'stylesheet',
			href: '/site.css',
			media: 'screen'
		})
		expect(externalScript('/app.js', { defer: true })).toEqual({
			src: '/app.js',
			defer: true
		})
	})

	it('Defaults font preloads to anonymous crossorigin and allows opting out', () => {
		expect(preloadFont('/Inter.woff2', { type: 'font/woff2' })).toEqual({
			rel: 'preload',
			href: '/Inter.woff2',
			as: 'font',
			type: 'font/woff2',
			crossorigin: 'anonymous'
		})
		expect(preloadFont('/Inter.woff2', { crossorigin: false })).toEqual({
			rel: 'preload',
			href: '/Inter.woff2',
			as: 'font'
		})
	})

	it('Creates responsive image preloads', () => {
		expect(
			preloadImage('/hero.jpg', {
				imagesrcset: '/hero.jpg 1x, /hero@2x.jpg 2x',
				imagesizes: '100vw',
				fetchpriority: 'high'
			})
		).toEqual({
			rel: 'preload',
			href: '/hero.jpg',
			as: 'image',
			imagesrcset: '/hero.jpg 1x, /hero@2x.jpg 2x',
			imagesizes: '100vw',
			fetchpriority: 'high'
		})

		expect(
			preloadImage({
				imagesrcset: '/hero-640.jpg 640w, /hero-1280.jpg 1280w',
				imagesizes: '100vw',
				fetchpriority: 'high'
			})
		).toEqual({
			rel: 'preload',
			as: 'image',
			imagesrcset: '/hero-640.jpg 640w, /hero-1280.jpg 1280w',
			imagesizes: '100vw',
			fetchpriority: 'high'
		})

		expect(
			preloadImage({
				href: '/hero.jpg',
				imagesrcset: '/hero.jpg 1x, /hero@2x.jpg 2x'
			})
		).toEqual({
			rel: 'preload',
			as: 'image',
			href: '/hero.jpg',
			imagesrcset: '/hero.jpg 1x, /hero@2x.jpg 2x'
		})
	})

	it('Renders responsive image preloads without a fallback href', () => {
		const rendered = renderHead({
			title: 'Responsive Image',
			link: [
				preloadImage({
					imagesrcset: '/hero-640.jpg 640w, /hero-1280.jpg 1280w',
					imagesizes: '100vw',
					fetchpriority: 'high'
				})
			]
		})

		expect(rendered).toContain(
			'<link imagesrcset="/hero-640.jpg 640w, /hero-1280.jpg 1280w" imagesizes="100vw" fetchpriority="high" rel="preload" as="image">'
		)
		expect(rendered).not.toContain('href=')
	})

	it('Works inside rendered head and CSP resource discovery', () => {
		const headItems: HeadItems = {
			title: 'Resources',
			link: [
				preconnect('https://api.example.com'),
				dnsPrefetch('https://cdn.example.com'),
				stylesheet('/site.css'),
				preload('/app.js', { as: 'script' }),
				modulepreload('/entry.js')
			],
			script: [externalScript('/runtime.js', { defer: true })]
		}
		const rendered = renderHead(headItems)
		expect(rendered).toContain('<link rel="preconnect"')
		expect(rendered).toContain('<link rel="dns-prefetch"')
		expect(rendered.indexOf('rel="preconnect"')).toBeLessThan(
			rendered.indexOf('rel="stylesheet"')
		)
		expect(getExternalResources(headItems)).toEqual([
			{ type: 'script', url: '/runtime.js' },
			{ type: 'style', url: '/site.css' },
			{ type: 'script', url: '/app.js' },
			{ type: 'script', url: '/entry.js' }
		])
	})
})
