import { describe, expect, it } from 'vitest'
import { parse, type DefaultTreeAdapterMap } from 'parse5'

import { createSeoHead, renderHead, validateHeadItems } from '../src/main'

type Node = DefaultTreeAdapterMap['node']
function imageMeta(node: Node): { property: string; content?: string }[] {
	const property =
		'attrs' in node
			? node.attrs.find((attr) => attr.name === 'property')?.value
			: undefined
	return [
		...(property?.startsWith('og:image')
			? [
					{
						property,
						content:
							'attrs' in node
								? node.attrs.find((attr) => attr.name === 'content')?.value
								: undefined
					}
				]
			: []),
		...('childNodes' in node ? node.childNodes.flatMap(imageMeta) : [])
	]
}

describe('Open Graph composition', () => {
	const layout = createSeoHead({
		title: 'Layout',
		openGraph: {
			image: [
				{
					url: 'https://example.com/layout.jpg',
					alt: 'Layout',
					width: 1200,
					height: 630,
					type: 'image/jpeg'
				},
				{ url: 'https://example.com/other.jpg', alt: 'Other' }
			]
		}
	})

	it('replaces the complete layout image list and removes stale structured properties', () => {
		const page = createSeoHead({
			title: 'Page',
			openGraph: { image: 'https://example.com/page.png' }
		})
		expect(imageMeta(parse(renderHead([layout, page])))).toEqual([
			{ property: 'og:image', content: 'https://example.com/page.png' }
		])
	})

	it('keeps new structured properties next to their own image', () => {
		const page = createSeoHead({
			title: 'Page',
			openGraph: {
				image: [
					{ url: 'https://example.com/first.png', alt: 'First', width: 800 },
					{ url: 'https://example.com/second.png', height: 400 }
				]
			}
		})
		expect(imageMeta(parse(renderHead([layout, page])))).toEqual([
			{ property: 'og:image', content: 'https://example.com/first.png' },
			{ property: 'og:image:alt', content: 'First' },
			{ property: 'og:image:width', content: '800' },
			{ property: 'og:image', content: 'https://example.com/second.png' },
			{ property: 'og:image:height', content: '400' }
		])
	})

	it('lets raw image groups override helper images inside createSeoHead', () => {
		const head = createSeoHead({
			title: 'Override',
			openGraph: {
				image: { url: 'https://example.com/generated.jpg', alt: 'Generated' }
			},
			meta: [
				{ property: 'og:image', content: 'https://example.com/raw.jpg' },
				{ property: 'og:image:alt', content: 'Raw' },
				{ property: 'og:image', content: 'https://example.com/raw-2.jpg' }
			]
		})
		expect(imageMeta(parse(renderHead(head)))).toEqual([
			{ property: 'og:image', content: 'https://example.com/raw.jpg' },
			{ property: 'og:image:alt', content: 'Raw' },
			{ property: 'og:image', content: 'https://example.com/raw-2.jpg' }
		])
	})

	it('supports raw-to-helper and helper-to-raw replacement across sources', () => {
		const raw = {
			meta: [
				{ property: 'og:image:url', content: 'https://example.com/raw.jpg' },
				{ property: 'og:image:alt', content: 'Raw' }
			]
		}
		expect(imageMeta(parse(renderHead([layout, raw])))).toEqual(
			raw.meta.map(({ property, content }) => ({ property, content }))
		)
		expect(imageMeta(parse(renderHead([raw, layout])))).toEqual(
			imageMeta(parse(renderHead(layout)))
		)
	})

	it('replaces an explicitly keyed image together with its old properties', () => {
		expect(
			imageMeta(
				parse(
					renderHead({
						title: 'Keyed images',
						meta: [
							{ key: 'hero', property: 'og:image', content: '/old.png' },
							{ property: 'og:image:alt', content: 'Old' },
							{ property: 'og:image', content: '/other.png' },
							{ property: 'og:image:alt', content: 'Other' },
							{ key: 'hero', property: 'og:image', content: '/new.png' },
							{ property: 'og:image:width', content: 600 }
						]
					})
				)
			)
		).toEqual([
			{ property: 'og:image', content: '/new.png' },
			{ property: 'og:image:width', content: '600' },
			{ property: 'og:image', content: '/other.png' },
			{ property: 'og:image:alt', content: 'Other' }
		])
	})

	it('extends and overrides properties on the final inherited image', () => {
		const images = imageMeta(
			parse(
				renderHead([
					layout,
					{
						meta: [
							{ property: 'og:image:alt', content: 'Updated other' },
							{ property: 'og:image:width', content: 500 }
						]
					}
				])
			)
		)
		expect(images.slice(-3)).toEqual([
			{ property: 'og:image', content: 'https://example.com/other.jpg' },
			{ property: 'og:image:alt', content: 'Updated other' },
			{ property: 'og:image:width', content: '500' }
		])
		expect(images).toContainEqual({
			property: 'og:image:alt',
			content: 'Layout'
		})
	})

	it('validates the og:image:url alias as an image root', () => {
		const items = createSeoHead({
			title: 'Alias',
			description: 'Image alias validation',
			canonical: 'https://example.com',
			openGraph: { type: 'website' },
			meta: [
				{ property: 'og:image:url', content: 'https://example.com/image.png' }
			]
		})
		expect(validateHeadItems(items, { requireOpenGraphImage: true })).toEqual(
			[]
		)
		items.meta!.at(-1)!.content = '/image.png'
		expect(validateHeadItems(items).map((issue) => issue.code)).toContain(
			'relative-og-image'
		)
	})

	it('inherits the image list when a later source does not specify images', () => {
		expect(
			imageMeta(
				parse(
					renderHead([
						layout,
						createSeoHead({ title: 'Page', openGraph: { type: 'article' } })
					])
				)
			)
		).toEqual(imageMeta(parse(renderHead(layout))))
	})
})

describe('robots shortcuts', () => {
	it.each([
		'max-image-preview:large',
		'INDEX, FOLLOW, max-snippet:100',
		'all, max-snippet:100'
	])('applies exclusion shortcuts to string directives %s', (robots) => {
		const head = createSeoHead({
			title: 'Private',
			robots,
			noindex: true,
			nofollow: true
		})
		const content = String(
			head.meta?.find((meta) => meta.name === 'robots')?.content
		)
		expect(content.split(', ')).toContain('noindex')
		expect(content.split(', ')).toContain('nofollow')
		expect(content.toLowerCase().split(', ')).not.toContain('index')
		expect(content.toLowerCase().split(', ')).not.toContain('follow')
		expect(content.toLowerCase().split(', ')).not.toContain('all')
	})

	it('retains unrelated directives and resolves explicit opt-in against none', () => {
		const content = createSeoHead({
			title: 'Public',
			robots: 'none, max-snippet:50',
			noindex: false
		}).meta?.[0].content
		expect(content).toBe('nofollow, max-snippet:50, index')
	})

	it('keeps restrictive indexing directives when only following is overridden', () => {
		const content = createSeoHead({
			title: 'Conflict',
			robots: 'index, noindex, max-snippet:50',
			nofollow: true
		}).meta?.[0].content
		expect(content).toBe('index, noindex, max-snippet:50, nofollow')
	})

	it('preserves a string exactly when no shortcut is supplied', () => {
		expect(
			createSeoHead({ title: 'Page', robots: 'INDEX, follow' }).meta?.[0]
				.content
		).toBe('INDEX, follow')
	})
})
