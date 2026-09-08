import { describe, expect, it } from 'vitest'
import { renderHead, type LinkItem } from '../src/main'

describe('resource request identity', () => {
	it.each(['preload', 'preconnect'])(
		'preserves all distinct CORS modes for %s',
		(rel) => {
			const links: LinkItem[] = [
				{ rel, href: '/app.js', as: 'script', fetchpriority: 'low' },
				{
					rel,
					href: '/app.js',
					as: 'script',
					crossorigin: '',
					fetchpriority: 'low'
				},
				{
					rel,
					href: '/app.js',
					as: 'script',
					crossorigin: 'anonymous',
					fetchpriority: 'high'
				},
				{ rel, href: '/app.js', as: 'script', crossorigin: 'use-credentials' }
			]
			const html = renderHead({ title: 'CORS', link: links })
			expect(html.match(/<link /g)).toHaveLength(3)
			expect(html).not.toContain('crossorigin=""')
			expect(html).toContain('crossorigin="anonymous" fetchpriority="high"')
			expect(html).toContain('crossorigin="use-credentials"')
		}
	)

	it('uses anonymous CORS by default for module preloads', () => {
		const html = renderHead({
			title: 'Modules',
			link: [
				{ rel: 'modulepreload', href: '/app.js' },
				{ rel: 'modulepreload', href: '/app.js', crossorigin: '' },
				{ rel: 'modulepreload', href: '/app.js', crossorigin: 'anonymous' },
				{
					rel: 'modulepreload',
					href: '/app.js',
					crossorigin: 'use-credentials'
				}
			]
		})
		expect(html.match(/<link /g)).toHaveLength(2)
		expect(html).toContain('crossorigin="anonymous"')
		expect(html).toContain('crossorigin="use-credentials"')
	})

	it('treats invalid CORS values as anonymous without trimming credential tokens', () => {
		const html = renderHead({
			title: 'CORS values',
			link: [
				{
					rel: 'preload',
					as: 'script',
					href: '/app.js',
					crossorigin: ' use-credentials ' as 'anonymous'
				},
				{
					rel: 'preload',
					as: 'script',
					href: '/app.js',
					crossorigin: 'anonymous'
				},
				{
					rel: 'preload',
					as: 'script',
					href: '/app.js',
					crossorigin: 'use-credentials'
				}
			]
		})
		expect(html.match(/<link /g)).toHaveLength(2)
		expect(html).not.toContain(' use-credentials ')
	})

	it('continues to deduplicate DNS hints independently of CORS', () => {
		const html = renderHead({
			title: 'DNS',
			link: [
				{ rel: 'dns-prefetch', href: '//cdn.example.com' },
				{
					rel: 'dns-prefetch',
					href: '//cdn.example.com',
					crossorigin: 'anonymous'
				}
			]
		})
		expect(html.match(/<link /g)).toHaveLength(1)
	})

	it('does not collide when attribute values contain key separators', () => {
		const html = renderHead({
			title: 'Tuple keys',
			link: [
				{
					rel: 'preload',
					href: '/img.jpg',
					as: 'image',
					imagesrcset: '/a:b',
					imagesizes: 'c'
				},
				{
					rel: 'preload',
					href: '/img.jpg',
					as: 'image',
					imagesrcset: '/a',
					imagesizes: 'b:c'
				}
			]
		})
		expect(html.match(/<link /g)).toHaveLength(2)
	})
})
