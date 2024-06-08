const DEFAULT_CHARSET = { charset: 'UTF-8' }
const DEFAULT_VIEWPORT = {
	name: 'viewport',
	content: 'width=device-width, initial-scale=1'
}

type TagName =
	| 'title'
	| 'base'
	| 'meta'
	| 'link'
	| 'style'
	| 'script'
	| 'noscript'

type BaseItem = {
	[key: string]: any
	priority?: number
}

type ContentItem = BaseItem & {
	innerHTML?: string
}

export type Tag = (BaseItem | ContentItem) & {
	tagName: TagName
	priority?: number
}

export type HeadItems = {
	title?: string
	base?: BaseItem[]
	meta?: BaseItem[]
	link?: BaseItem[]
	style?: ContentItem[]
	script?: ContentItem[]
	noscript?: ContentItem[]
}

export function renderHead(
	headItems: HeadItems | HeadItems[],
	applyPriority?: (tag: Tag) => Required<Tag>
): string {
	const items = Array.isArray(headItems)
		? mergeHeadItems(headItems.map((i) => normaliseHeadItems(i)))
		: normaliseHeadItems(headItems)

	if (!items.title?.length) throw new Error('Missing title tag.')

	items.meta = deduplicateMetaItems(items.meta)
	items.base = items.base.slice(-1)

	const { title, ...rest } = items
	const tags: Tag[] = Object.entries(rest).flatMap(([tagName, tagItems]) =>
		tagItems.map((item) => ({ ...item, tagName }) as Tag)
	)
	tags.push({ tagName: 'title', innerHTML: items.title })
	tags.push(...getDefaultTags(tags))

	const prioritisedTags = tags.map((tag) =>
		applyPriority ? applyPriority(tag) : applyPriorityDefault(tag)
	)

	const orderedTags = prioritisedTags.sort((a, b) => a.priority - b.priority)

	return orderedTags.map((i) => renderHeadTag(i)).join('\n')
}

function normaliseHeadItems(items: HeadItems): Required<HeadItems> {
	return {
		title: items.title || '',
		base: items.base || [],
		meta: items.meta || [],
		link: items.link || [],
		style: items.style || [],
		script: items.script || [],
		noscript: items.noscript || []
	}
}

function mergeHeadItems(items: Required<HeadItems>[]): Required<HeadItems> {
	return items.reduce((merged, item) => {
		merged.title = item.title || merged.title
		merged.base.push(...item.base)
		merged.meta.push(...item.meta)
		merged.link.push(...item.link)
		merged.style.push(...item.style)
		merged.script.push(...item.script)
		merged.noscript.push(...item.noscript)
		return merged
	})
}

function getDefaultTags(tags: Tag[]): Tag[] {
	const defaultTags: Tag[] = []
	if (!tags.some((tag) => tag.tagName === 'meta' && tag.charset))
		defaultTags.push({ ...DEFAULT_CHARSET, tagName: 'meta' })

	if (!tags.some((tag) => tag.tagName === 'meta' && tag.name === 'viewport'))
		defaultTags.push({ ...DEFAULT_VIEWPORT, tagName: 'meta' })

	return defaultTags
}

function applyPriorityDefault(tag: Tag): Required<Tag> {
	if (typeof tag.priority === 'number') return tag as Required<Tag>
	let priority: number
	switch (tag.tagName) {
		case 'title':
			priority = 0
			break

		case 'base':
			priority = -2
			break

		case 'meta':
			if (tag.charset) priority = -4
			else if (tag.name === 'viewport') priority = -3
			else if (tag['http-equiv']) priority = -1
			else priority = 100
			break

		case 'link':
			if (tag.rel === 'preconnect') priority = 10
			else if (tag.rel === 'preload') priority = 60
			else if (tag.rel === 'prefetch') priority = 80
			else if (tag.rel === 'stylesheet') priority = 50
			else priority = 90
			break

		case 'style':
			priority = tag.innerHTML.includes('@import') ? 30 : 51
			break

		case 'script':
			if (tag.async) priority = 20
			else if (tag.defer) priority = 70
			else priority = 40
			break

		default:
			priority = 110
	}
	return { ...tag, priority }
}

function deduplicateMetaItems(metaItems: BaseItem[]): BaseItem[] {
	const metaMap = new Map<string, BaseItem>()

	metaItems.forEach((meta) => {
		const key = meta.property || meta.name || meta['http-equiv']
		if (key) metaMap.set(key, meta)
	})

	return Array.from(metaMap.values())
}

function renderHeadTag(item: BaseItem | ContentItem): string {
	const attrs = renderAttrs(item)
	return ['meta', 'link', 'base'].includes(item.tagName)
		? `<${item.tagName} ${attrs}>`
		: `<${item.tagName}${attrs && ' '}${attrs}>${item.innerHTML || ''}</${
				item.tagName
			}>`
}

export function renderAttrs(item: BaseItem | ContentItem): string {
	return Object.entries(item)
		.filter(([key]) => !['innerHTML', 'priority', 'tagName'].includes(key))
		.map(([key, value]) => {
			if (typeof value === 'boolean') return value ? key : ''
			else if (value === null || value === undefined) return ''
			else return `${key}="${escapeHtml(String(value))}"`
		})
		.filter((attr) => attr !== '')
		.join(' ')
}

function escapeHtml(str: string): string {
	const escapeMap: Record<string, string> = {
		'"': '&quot;',
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;'
	}

	return str.replace(/["&<>]/g, (match) => escapeMap[match] || match)
}
