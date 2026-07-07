import { createSeoHead, renderHead, type HeadItems } from '../src/main'
import { describe, expect, it } from 'vitest'

describe('createSeoHead', () => {
	it('Creates common SEO tags with absolute canonical, Open Graph, Twitter, alternates and JSON-LD', () => {
		const headItems = createSeoHead({
			title: 'Article',
			titleTemplate: '%s | Example',
			description: 'An article description',
			site: 'https://example.com',
			path: '/articles/one',
			robots: {
				index: true,
				follow: true,
				maxImagePreview: 'large'
			},
			alternates: [
				{ hrefLang: 'en', href: '/articles/one' },
				{ hrefLang: 'fr', href: '/fr/articles/one' }
			],
			openGraph: {
				type: 'article',
				siteName: 'Example',
				locale: 'en_US',
				image: {
					url: '/images/article.jpg',
					alt: 'Article image',
					width: 1200,
					height: 630,
					type: 'image/jpeg'
				}
			},
			twitter: {
				site: '@example',
				creator: '@author',
				image: '/images/twitter.jpg',
				imageAlt: 'Twitter image'
			},
			jsonLd: { '@type': 'Article', headline: 'Article' }
		})

		expect(headItems.title).toBe('Article | Example')
		const rendered = renderHead(headItems)
		expect(rendered).toContain('<title>Article | Example</title>')
		expect(rendered).toContain(
			'<meta name="description" content="An article description">'
		)
		expect(rendered).toContain(
			'<link rel="canonical" href="https://example.com/articles/one">'
		)
		expect(rendered).toContain(
			'<meta name="robots" content="index, follow, max-image-preview:large">'
		)
		expect(rendered).toContain(
			'<link rel="alternate" hreflang="fr" href="https://example.com/fr/articles/one">'
		)
		expect(rendered).toContain(
			'<meta property="og:image" content="https://example.com/images/article.jpg">'
		)
		expect(rendered).toContain(
			'<meta property="og:image:alt" content="Article image">'
		)
		expect(rendered).toContain(
			'<meta name="twitter:image" content="https://example.com/images/twitter.jpg">'
		)
		expect(rendered).toContain('application/ld+json')
	})

	it('Supports function title templates and noindex/nofollow shortcuts', () => {
		const headItems = createSeoHead({
			title: 'Private',
			titleTemplate: (title) => `${title} - Hidden`,
			noindex: true,
			nofollow: true
		})
		expect(headItems.title).toBe('Private - Hidden')
		expect(renderHead(headItems)).toContain(
			'<meta name="robots" content="noindex, nofollow">'
		)
	})

	it('Lets explicit meta and link entries extend or override generated entries', () => {
		const headItems = createSeoHead({
			title: 'Override',
			description: 'Generated description',
			canonical: 'https://example.com/generated',
			meta: [{ name: 'description', content: 'Manual description' }],
			link: [{ rel: 'canonical', href: 'https://example.com/manual' }]
		})
		const rendered = renderHead(headItems)
		expect(rendered).not.toContain('Generated description')
		expect(rendered).not.toContain('https://example.com/generated')
		expect(rendered).toContain(
			'<meta name="description" content="Manual description">'
		)
		expect(rendered).toContain(
			'<link rel="canonical" href="https://example.com/manual">'
		)
	})

	it('Composes with raw HeadItems arrays', () => {
		const layout: HeadItems = {
			title: 'Layout',
			meta: [{ property: 'og:type', content: 'website' }]
		}
		const page = createSeoHead({
			title: 'Page',
			description: 'Page description'
		})
		const rendered = renderHead([layout, page])
		expect(rendered).toContain('<title>Page</title>')
		expect(rendered).toContain(
			'<meta name="description" content="Page description">'
		)
		expect(rendered).toContain('<meta property="og:type" content="website">')
	})
})
