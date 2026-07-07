import { validateHeadItems, type HeadItems } from '../src/main'
import { describe, expect, it } from 'vitest'

function codes(headItems: HeadItems | HeadItems[], options = {}) {
	return validateHeadItems(headItems, options).map((issue) => issue.code)
}

describe('validateHeadItems', () => {
	it('Reports missing title and description by default', () => {
		expect(codes({})).toEqual(['missing-title', 'missing-description'])
	})

	it('Allows disabling the description requirement', () => {
		expect(
			codes({ title: 'Only title' }, { requireDescription: false })
		).toEqual([])
	})

	it('Warns for relative and noindex canonical links after deduplication', () => {
		const result = codes({
			title: 'Canonical',
			meta: [
				{ name: 'description', content: 'Description' },
				{ name: 'robots', content: 'noindex, follow' }
			],
			link: [
				{ rel: 'canonical', href: 'https://example.com/first' },
				{ rel: 'canonical', href: '/second' }
			]
		})
		expect(result).toEqual(['relative-canonical', 'canonical-with-noindex'])
	})

	it('Validates after render-time deduplication', () => {
		const result = codes({
			title: 'Canonical',
			meta: [{ name: 'description', content: 'Description' }],
			link: [
				{ rel: 'canonical', href: 'https://example.com/generated' },
				{ rel: 'canonical', href: 'https://example.com/manual' }
			]
		})
		expect(result).toEqual([])
	})

	it('Warns for preload and connection-hint mistakes', () => {
		const result = codes({
			title: 'Hints',
			meta: [{ name: 'description', content: 'Description' }],
			link: [
				{ rel: 'preconnect' },
				{ rel: 'dns-prefetch' },
				{ rel: 'preload', href: '/asset' },
				{ rel: 'preload', href: '/asset', as: 'invalid' },
				{ rel: 'preload', href: '/font.woff2', as: 'font' },
				{ rel: 'modulepreload', href: '/entry.js', as: 'script' }
			]
		})
		expect(result).toEqual([
			'preconnect-missing-href',
			'dns-prefetch-missing-href',
			'missing-preload-as',
			'invalid-preload-as',
			'font-preload-missing-crossorigin',
			'modulepreload-with-as'
		])
	})

	it('Treats empty crossorigin as present for validation', () => {
		const result = codes({
			title: 'Crossorigin',
			meta: [{ name: 'description', content: 'Description' }],
			link: [
				{
					rel: 'preload',
					href: 'https://cdn.example.com/font.woff2',
					as: 'font',
					crossorigin: ''
				},
				{
					rel: 'stylesheet',
					href: 'https://cdn.example.com/site.css',
					integrity: 'sha384-style',
					crossorigin: ''
				}
			],
			script: [
				{
					src: 'https://cdn.example.com/app.js',
					integrity: 'sha384-app',
					crossorigin: ''
				}
			]
		})
		expect(result).toEqual([])
	})

	it('Warns for trusted raw HTML and inline event attributes', () => {
		const result = codes({
			title: 'Unsafe',
			meta: [{ name: 'description', content: 'Description' }],
			link: [{ rel: 'preconnect', href: 'https://example.com', onload: 'x()' }],
			script: [{ innerHTML: 'alert(1)' }],
			style: [{ innerHTML: 'body{}' }],
			noscript: [{ innerHTML: '<p>Enable JS</p>' }]
		})
		expect(result).toEqual([
			'unsafe-event-attribute',
			'unsafe-inner-html',
			'unsafe-inner-html',
			'unsafe-inner-html'
		])
	})

	it('Warns for SRI and optional missing-integrity requirements on external resources', () => {
		const result = codes(
			{
				title: 'SRI',
				meta: [{ name: 'description', content: 'Description' }],
				link: [
					{
						rel: 'stylesheet',
						href: 'https://cdn.example.com/site.css',
						integrity: 'sha384-style'
					},
					{ rel: 'modulepreload', href: 'https://cdn.example.com/entry.js' }
				],
				script: [
					{
						src: 'https://cdn.example.com/app.js',
						integrity: 'sha384-app'
					},
					{ src: 'https://cdn.example.com/no-sri.js' }
				]
			},
			{ baseUrl: 'https://example.com', requireSri: true }
		)
		expect(result).toEqual([
			'sri-missing-crossorigin',
			'missing-sri',
			'sri-missing-crossorigin',
			'missing-sri'
		])
	})

	it('Warns for incomplete and relative social metadata', () => {
		const result = codes({
			title: 'Social',
			meta: [
				{ name: 'description', content: 'Description' },
				{ property: 'og:title', content: 'Social' },
				{ property: 'og:image', content: '/image.jpg' },
				{ name: 'twitter:image', content: '/twitter.jpg' }
			]
		})
		expect(result).toEqual([
			'relative-og-image',
			'relative-twitter-image',
			'missing-og-required',
			'missing-og-required'
		])
	})

	it('Allows image-less Open Graph metadata by default', () => {
		const result = codes({
			title: 'Website',
			meta: [
				{ name: 'description', content: 'Description' },
				{ property: 'og:title', content: 'Website' },
				{ property: 'og:type', content: 'website' },
				{ property: 'og:url', content: 'https://example.com' }
			]
		})
		expect(result).toEqual([])
	})

	it('Allows layout-level og:type without requiring page Open Graph tags', () => {
		const result = codes({
			title: 'Layout only',
			meta: [
				{ name: 'description', content: 'Description' },
				{ property: 'og:type', content: 'website' }
			]
		})
		expect(result).toEqual([])
	})

	it('Can require Open Graph images for stricter previews', () => {
		const result = codes(
			{
				title: 'Website',
				meta: [
					{ name: 'description', content: 'Description' },
					{ property: 'og:title', content: 'Website' },
					{ property: 'og:type', content: 'website' },
					{ property: 'og:url', content: 'https://example.com' }
				]
			},
			{ requireOpenGraphImage: true }
		)
		expect(result).toEqual(['missing-og-required'])
	})

	it('Reports invalid URL values', () => {
		const result = codes({
			title: 'Invalid URLs',
			meta: [
				{ name: 'description', content: 'Description' },
				{ property: 'og:url', content: 'https://exa mple.com/page' },
				{ property: 'og:type', content: 'website' },
				{ property: 'og:title', content: 'Invalid URLs' },
				{ property: 'og:image', content: 'https://example.com/image.jpg' },
				{ name: 'twitter:image', content: 'ftp://example.com/image.jpg' }
			],
			link: [{ rel: 'canonical', href: 'https://exa mple.com/page' }],
			script: [{ src: 'ftp://example.com/app.js' }]
		})
		expect(result).toEqual([
			'invalid-url',
			'invalid-url',
			'invalid-url',
			'invalid-url'
		])
	})

	it('Reports non-serializable JSON-LD and missing @type', () => {
		const circular: Record<string, unknown> = {}
		circular.self = circular
		const result = codes({
			title: 'JSON-LD',
			meta: [{ name: 'description', content: 'Description' }],
			jsonLd: [
				circular as HeadItems['jsonLd'],
				{ '@type': '' }
			] as HeadItems['jsonLd']
		})
		expect(result).toEqual(['invalid-json-ld', 'invalid-json-ld'])
	})
})
