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

	it('Treats empty descriptions as missing', () => {
		expect(
			codes({
				title: 'Empty description',
				meta: [{ name: 'description', content: '   ' }]
			})
		).toEqual(['missing-description'])
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

	it('Rejects empty and non-HTTP canonical URLs', () => {
		const empty = codes({
			title: 'Empty canonical',
			meta: [{ name: 'description', content: 'Description' }],
			link: [{ rel: 'canonical', href: '' }]
		})
		const data = codes({
			title: 'Data canonical',
			meta: [{ name: 'description', content: 'Description' }],
			link: [{ rel: 'canonical', href: 'data:text/html,not-a-page' }]
		})

		expect(empty).toEqual(['invalid-url'])
		expect(data).toEqual(['invalid-url'])
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
				{ rel: 'modulepreload', href: '/entry.js', as: 'image' }
			]
		})
		expect(result).toEqual([
			'preconnect-missing-href',
			'dns-prefetch-missing-href',
			'missing-preload-as',
			'invalid-preload-as',
			'font-preload-missing-crossorigin',
			'invalid-modulepreload-as'
		])
	})

	it('Accepts only standard preload destinations', () => {
		const result = codes({
			title: 'Preload destinations',
			meta: [{ name: 'description', content: 'Description' }],
			link: [
				{ rel: 'preload', href: '/audio', as: 'audio' },
				{ rel: 'preload', href: '/document', as: 'document' },
				{ rel: 'preload', href: '/embed', as: 'embed' },
				{ rel: 'preload', href: '/object', as: 'object' },
				{ rel: 'preload', href: '/provider', as: 'provider' },
				{ rel: 'preload', href: '/video', as: 'video' },
				{ rel: 'preload', href: '/worker', as: 'worker' }
			]
		})

		expect(result).toEqual(Array(7).fill('invalid-preload-as'))
	})

	it('Allows standard modulepreload destinations', () => {
		const result = codes({
			title: 'Module preload destinations',
			meta: [{ name: 'description', content: 'Description' }],
			link: [
				{ rel: 'modulepreload', href: '/default.js' },
				{ rel: 'modulepreload', href: '/script.js', as: 'script' },
				{ rel: 'modulepreload', href: '/style.css', as: 'style' },
				{ rel: 'modulepreload', href: '/data.json', as: 'json' },
				{ rel: 'modulepreload', href: '/text.txt', as: 'text' },
				{ rel: 'modulepreload', href: '/worker.js', as: 'worker' }
			]
		})

		expect(result).toEqual([])
	})

	it('Allows href-less responsive image preloads with imagesrcset', () => {
		const result = codes({
			title: 'Responsive preload',
			meta: [{ name: 'description', content: 'Description' }],
			link: [
				{
					rel: 'preload',
					as: 'image',
					imagesrcset: '/hero.jpg 1x, /hero@2x.jpg 2x'
				}
			]
		})
		expect(result).toEqual([])
	})

	it('Warns when preload links have no usable source', () => {
		const result = codes({
			title: 'Missing preload sources',
			meta: [{ name: 'description', content: 'Description' }],
			link: [
				{ rel: 'preload', as: 'script' },
				{ rel: 'preload', as: 'font', crossorigin: 'anonymous' },
				{ rel: 'preload', as: 'image' }
			]
		})
		expect(result).toEqual([
			'missing-preload-source',
			'missing-preload-source',
			'missing-preload-source'
		])
	})

	it('Warns when responsive image width descriptors omit imagesizes', () => {
		const result = codes({
			title: 'Responsive sizes',
			meta: [{ name: 'description', content: 'Description' }],
			link: [
				{
					rel: 'preload',
					as: 'image',
					imagesrcset: '/hero-640.jpg 640w, /hero-1280.jpg 1280w'
				},
				{
					rel: 'preload',
					as: 'image',
					imagesrcset: '/hero.jpg 1x, /hero@2x.jpg 2x'
				}
			]
		})
		expect(result).toEqual(['responsive-image-missing-sizes'])
	})

	it('Warns when an href-less density srcset omits its 1x fallback', () => {
		const result = codes({
			title: 'Responsive density preload',
			meta: [{ name: 'description', content: 'Description' }],
			link: [
				{
					rel: 'preload',
					as: 'image',
					imagesrcset: '/hero@1.5x.jpg 1.5x, /hero@2x.jpg 2x'
				},
				{
					rel: 'preload',
					as: 'image',
					imagesrcset: '/hero.jpg 1.0x, /hero@2x.jpg 2x'
				},
				{
					rel: 'preload',
					as: 'image',
					imagesrcset: '/hero.jpg, /hero@2x.jpg 2x'
				},
				{
					rel: 'preload',
					as: 'image',
					href: '/hero.jpg',
					imagesrcset: '/hero@1.5x.jpg 1.5x, /hero@2x.jpg 2x'
				}
			]
		})

		expect(result).toEqual(['responsive-image-missing-1x'])
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

	it('Warns once for trusted raw HTML and inline event attributes', () => {
		const result = codes({
			title: 'Unsafe',
			meta: [{ name: 'description', content: 'Description' }],
			link: [{ rel: 'preconnect', href: 'https://example.com', onload: 'x()' }],
			script: [{ innerHTML: 'alert(1)', onload: 'x()' }],
			style: [{ innerHTML: 'body{}' }],
			noscript: [{ innerHTML: '<p>Enable JS</p>' }]
		})
		expect(result).toEqual([
			'unsafe-event-attribute',
			'unsafe-inner-html',
			'unsafe-event-attribute',
			'unsafe-inner-html',
			'unsafe-inner-html'
		])
	})

	it('Rejects script text that can enter the double-escaped parser state', () => {
		const result = validateHeadItems({
			title: 'Unsafe script text',
			meta: [{ name: 'description', content: 'Description' }],
			script: [{ textContent: 'console.log("<!--<script>")' }]
		})

		expect(result).toEqual([
			expect.objectContaining({
				code: 'unsafe-script-text',
				severity: 'error',
				path: 'script[0]'
			})
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

	it('Treats empty required Open Graph values as missing', () => {
		const result = codes({
			title: 'Empty Open Graph',
			meta: [
				{ name: 'description', content: 'Description' },
				{ property: 'og:title', content: '' },
				{ property: 'og:type', content: '   ' },
				{ property: 'og:url', content: '' }
			]
		})

		expect(result).toEqual([
			'missing-og-required',
			'missing-og-required',
			'missing-og-required'
		])
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

	it('Rejects an empty layout-level og:type', () => {
		const result = codes({
			title: 'Empty layout type',
			meta: [
				{ name: 'description', content: 'Description' },
				{ property: 'og:type', content: '' }
			]
		})

		expect(result).toEqual([
			'missing-og-required',
			'missing-og-required',
			'missing-og-required'
		])
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
