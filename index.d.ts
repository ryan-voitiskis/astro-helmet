declare const Helmet: (props: {
	headItems: HeadItems | HeadItems[]
	options?: {
		omitHeadTags?: boolean
		applyPriority?: (tag: Tag) => Required<Tag>
		csp?: boolean
	}
}) => unknown

export default Helmet

type TagName =
	| 'title'
	| 'base'
	| 'meta'
	| 'link'
	| 'style'
	| 'script'
	| 'noscript'

type BaseItem = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export type JsonLdItem = {
	'@type': string
	/** Automatically injected - do not provide. */
	'@context'?: never
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any
}

export type HeadItems = {
	title?: string
	base?: BaseItem[]
	meta?: BaseItem[]
	link?: BaseItem[]
	style?: ContentItem[]
	script?: ContentItem[]
	noscript?: ContentItem[]
	jsonLd?: JsonLdItem | JsonLdItem[]
}
