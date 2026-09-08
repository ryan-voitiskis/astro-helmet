import { parse, type DefaultTreeAdapterMap } from 'parse5'
import { describe, expect, it } from 'vitest'
import {
	renderHead,
	validateHeadItems,
	type HeadItems,
	type MetaItem
} from '../src/main'

function metadata(head: HeadItems | HeadItems[]): Record<string, string>[] {
	function visit(
		node: DefaultTreeAdapterMap['node']
	): Record<string, string>[] {
		const attrs =
			'attrs' in node
				? Object.fromEntries(node.attrs.map(({ name, value }) => [name, value]))
				: {}
		return [
			...('tagName' in node &&
			node.tagName === 'meta' &&
			!('charset' in attrs) &&
			attrs.name !== 'viewport'
				? [attrs]
				: []),
			...('childNodes' in node ? node.childNodes.flatMap(visit) : [])
		]
	}
	return visit(parse(renderHead(head)))
}

const image = (content: string, key?: string): MetaItem => ({
	property: 'og:image',
	content,
	...(key ? { key } : {})
})
const alt = (content: string): MetaItem => ({
	property: 'og:image:alt',
	content
})

describe('image-list replacement after explicit metadata overrides', () => {
	for (const splitSources of [false, true]) {
		it.each(['root', 'property'])(
			`does not revive metadata replaced by an image %s (split sources: ${splitSources})`,
			(kind) => {
				const previous: MetaItem[] = [
					{ key: 'shared', name: 'robots', content: 'noindex' },
					{ name: 'description', content: 'Keep description' }
				]
				const replacement =
					kind === 'root'
						? [image('/old.jpg', 'shared'), alt('Old image')]
						: [image('/old.jpg'), { ...alt('Old image'), key: 'shared' }]
				const sources: HeadItems[] = [
					{
						title: 'Page',
						meta: splitSources ? previous : [...previous, ...replacement]
					},
					...(splitSources ? [{ meta: replacement }] : []),
					{ meta: [image('/new.jpg')] }
				]
				expect(metadata(sources)).toEqual([
					{ name: 'description', content: 'Keep description' },
					{ property: 'og:image', content: '/new.jpg' }
				])
				expect(
					validateHeadItems([
						...sources,
						{ link: [{ rel: 'canonical', href: 'https://site.example/page' }] }
					])
				).not.toContainEqual(
					expect.objectContaining({ code: 'canonical-with-noindex' })
				)
			}
		)
	}

	it('keeps ordinary metadata that superseded an image', () => {
		expect(
			metadata([
				{
					title: 'Page',
					meta: [image('/old.jpg', 'shared'), alt('Remove with old image')]
				},
				{
					meta: [{ key: 'shared', name: 'description', content: 'Replacement' }]
				},
				{ meta: [image('/new.jpg')] }
			])
		).toEqual([
			{ name: 'description', content: 'Replacement' },
			{ property: 'og:image', content: '/new.jpg' }
		])
	})

	it('does not revive any earlier value after repeated key transitions', () => {
		expect(
			metadata([
				{
					title: 'Page',
					meta: [{ key: 'shared', name: 'robots', content: 'noindex' }]
				},
				{ meta: [image('/old.jpg', 'shared')] },
				{
					meta: [
						{ key: 'shared', name: 'description', content: 'Also superseded' }
					]
				},
				{ meta: [image('/newer.jpg', 'shared')] },
				{ meta: [image('/latest.jpg')] }
			])
		).toEqual([{ property: 'og:image', content: '/latest.jpg' }])
	})
})

describe('structured properties after image-root eviction', () => {
	it.each(['og:image:alt', 'og:image:width'])(
		'overrides the surviving image property %s',
		(property) => {
			const originalA = property === 'og:image:width' ? '800' : 'Original A'
			const originalB = property === 'og:image:width' ? '1200' : 'Original B'
			const updated = property === 'og:image:width' ? '600' : 'Updated A'
			expect(
				metadata([
					{
						title: 'Page',
						meta: [
							image('/a.jpg'),
							{ property, content: originalA },
							image('/b.jpg', 'secondary'),
							{ property, content: originalB }
						]
					},
					{
						meta: [
							{ key: 'secondary', name: 'description', content: 'Replacement' }
						]
					},
					{ meta: [{ property, content: updated }] }
				])
			).toEqual([
				{ property: 'og:image', content: '/a.jpg' },
				{ property, content: updated },
				{ name: 'description', content: 'Replacement' }
			])
		}
	)

	it('keeps the current image when another root is removed', () => {
		expect(
			metadata([
				{
					title: 'Page',
					meta: [
						image('/a.jpg', 'first'),
						alt('Original A'),
						image('/b.jpg'),
						alt('Original B')
					]
				},
				{
					meta: [{ key: 'first', name: 'description', content: 'Replacement' }]
				},
				{ meta: [alt('Updated B')] }
			])
		).toEqual([
			{ name: 'description', content: 'Replacement' },
			{ property: 'og:image', content: '/b.jpg' },
			{ property: 'og:image:alt', content: 'Updated B' }
		])
	})

	it('restores the final surviving image after an upsert in an earlier output slot', () => {
		expect(
			metadata([
				{
					title: 'Page',
					meta: [
						image('/a.jpg', 'first'),
						alt('Original A'),
						image('/b.jpg', 'last'),
						alt('Original B')
					]
				},
				{ meta: [image('/a-new.jpg', 'first'), alt('New A')] },
				{
					meta: [{ key: 'first', name: 'description', content: 'Replacement' }]
				},
				{ meta: [alt('Updated B')] }
			])
		).toEqual([
			{ name: 'description', content: 'Replacement' },
			{ property: 'og:image', content: '/b.jpg' },
			{ property: 'og:image:alt', content: 'Updated B' }
		])
	})

	it('skips empty and ordinary groups after consecutive image evictions', () => {
		expect(
			metadata([
				{
					title: 'Page',
					meta: [
						image('/a.jpg'),
						alt('Original A'),
						image('/b.jpg', 'middle'),
						alt('Original B'),
						image('/c.jpg', 'last'),
						alt('Original C')
					]
				},
				{ meta: [{ key: 'last', name: 'theme-color', content: 'red' }] },
				{
					meta: [{ key: 'middle', name: 'description', content: 'Replacement' }]
				},
				{ meta: [alt('Updated A')] }
			])
		).toEqual([
			{ property: 'og:image', content: '/a.jpg' },
			{ property: 'og:image:alt', content: 'Updated A' },
			{ name: 'description', content: 'Replacement' },
			{ name: 'theme-color', content: 'red' }
		])
	})

	it('attaches later properties to a replacement root rather than its fallback', () => {
		expect(
			metadata([
				{
					title: 'Page',
					meta: [
						image('/a.jpg'),
						alt('Original A'),
						image('/b.jpg', 'secondary'),
						alt('Original B')
					]
				},
				{ meta: [image('/b-new.jpg', 'secondary'), alt('Updated B')] },
				{ meta: [{ property: 'og:image:width', content: 600 }] }
			])
		).toEqual([
			{ property: 'og:image', content: '/a.jpg' },
			{ property: 'og:image:alt', content: 'Original A' },
			{ property: 'og:image', content: '/b-new.jpg' },
			{ property: 'og:image:alt', content: 'Updated B' },
			{ property: 'og:image:width', content: '600' }
		])
	})

	it.each([
		{ shared: false, replaceAttached: false },
		{ shared: true, replaceAttached: false },
		{ shared: true, replaceAttached: true }
	])(
		'retains orphan deduplication after cleanup %j',
		({ shared, replaceAttached }) => {
			const orphan = alt('Old orphan')
			const sources: HeadItems[] = [
				{
					title: 'Page',
					meta: [
						orphan,
						image('/old.jpg', 'removed'),
						shared ? orphan : { ...orphan },
						...(replaceAttached ? [alt('Replacement attached value')] : [])
					]
				},
				{
					meta: [
						{ key: 'removed', name: 'description', content: 'Replacement' }
					]
				},
				{ meta: [alt('Updated orphan')] }
			]
			const before = JSON.stringify(sources)
			for (const source of sources) {
				for (const item of source.meta || []) Object.freeze(item)
				Object.freeze(source.meta)
				Object.freeze(source)
			}
			Object.freeze(sources)
			expect(metadata(sources)).toEqual([
				{ property: 'og:image:alt', content: 'Updated orphan' },
				{ name: 'description', content: 'Replacement' }
			])
			expect(JSON.stringify(sources)).toBe(before)
		}
	)
})
