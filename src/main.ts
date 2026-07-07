const DEFAULT_CHARSET = { charset: 'UTF-8' }
const DEFAULT_VIEWPORT = {
	name: 'viewport',
	content: 'width=device-width, initial-scale=1'
}

const VALID_PRELOAD_AS_VALUES = new Set([
	'audio',
	'document',
	'embed',
	'fetch',
	'font',
	'image',
	'object',
	'provider',
	'script',
	'style',
	'track',
	'video',
	'worker'
])

type TagName =
	'title' | 'base' | 'meta' | 'link' | 'style' | 'script' | 'noscript'

type BaseItem = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any
	key?: string
	priority?: number
}

type ContentItem = BaseItem & {
	innerHTML?: string
	textContent?: string
}

export type HelmetOptions = {
	omitHeadTags?: boolean
	applyPriority?: (tag: Tag) => Required<Tag>
	csp?: boolean
	validate?: boolean | HeadValidationOptions
}

export type CrossOrigin = 'anonymous' | 'use-credentials' | ''

export type FetchPriority = 'high' | 'low' | 'auto'

export type ReferrerPolicy =
	| 'no-referrer'
	| 'no-referrer-when-downgrade'
	| 'origin'
	| 'origin-when-cross-origin'
	| 'same-origin'
	| 'strict-origin'
	| 'strict-origin-when-cross-origin'
	| 'unsafe-url'

export type MetaItem = BaseItem & {
	name?: string
	property?: string
	content?: string | number | boolean
	charset?: string
	'http-equiv'?: string
	media?: string
}

export type LinkItem = BaseItem & {
	rel?: string
	href?: string | URL
	as?: string
	type?: string
	crossorigin?: CrossOrigin
	integrity?: string
	media?: string
	fetchpriority?: FetchPriority
	referrerpolicy?: ReferrerPolicy
	imagesrcset?: string
	imagesizes?: string
}

export type ScriptItem = ContentItem & {
	src?: string | URL
	type?: string
	async?: boolean
	defer?: boolean
	crossorigin?: CrossOrigin
	integrity?: string
	nonce?: string
	referrerpolicy?: ReferrerPolicy
	fetchpriority?: FetchPriority
}

export type StyleItem = ContentItem & {
	media?: string
	nonce?: string
}

export type NoscriptItem = ContentItem

export type HeadValidationSeverity = 'warning' | 'error'

export type HeadValidationCode =
	| 'missing-title'
	| 'missing-description'
	| 'duplicate-canonical'
	| 'relative-canonical'
	| 'canonical-with-noindex'
	| 'invalid-url'
	| 'invalid-preload-as'
	| 'missing-preload-as'
	| 'font-preload-missing-crossorigin'
	| 'modulepreload-with-as'
	| 'preconnect-missing-href'
	| 'dns-prefetch-missing-href'
	| 'sri-missing-crossorigin'
	| 'missing-sri'
	| 'unsafe-inner-html'
	| 'unsafe-event-attribute'
	| 'missing-og-required'
	| 'relative-og-url'
	| 'relative-og-image'
	| 'relative-twitter-image'
	| 'invalid-json-ld'

export type HeadValidationIssue = {
	code: HeadValidationCode
	severity: HeadValidationSeverity
	message: string
	tagName?: TagName | 'jsonLd' | 'title'
	path?: string
}

export type HeadValidationOptions = {
	baseUrl?: string | URL
	requireDescription?: boolean
	requireOpenGraphImage?: boolean
	requireSri?: boolean
	warnOnInnerHTML?: boolean
	warnOnEventAttributes?: boolean
}

export type ResourceHintOptions = Omit<LinkItem, 'rel' | 'href' | 'as'> & {
	key?: string
}

export type PreloadOptions = ResourceHintOptions & {
	as: string
}

export type PreloadFontOptions = ResourceHintOptions & {
	type?: string
	crossorigin?: CrossOrigin | false
}

export type PreloadImageOptions = ResourceHintOptions & {
	imagesrcset?: string
	imagesizes?: string
	fetchpriority?: FetchPriority
}

export type StylesheetOptions = Omit<LinkItem, 'rel' | 'href'>

export type ExternalScriptOptions = Omit<ScriptItem, 'src'>

export type RobotsOptions = {
	index?: boolean
	follow?: boolean
	noarchive?: boolean
	nosnippet?: boolean
	noimageindex?: boolean
	nocache?: boolean
	maxSnippet?: number
	maxImagePreview?: 'none' | 'standard' | 'large'
	maxVideoPreview?: number
	extra?: string | string[]
}

export type SeoImage =
	| string
	| URL
	| {
			url: string | URL
			alt?: string
			width?: number
			height?: number
			type?: string
	  }

export type OpenGraphOptions = {
	title?: string
	description?: string
	type?: string
	url?: string | URL
	siteName?: string
	locale?: string
	image?: SeoImage | SeoImage[]
}

export type TwitterOptions = {
	card?: 'summary' | 'summary_large_image' | 'app' | 'player' | string
	site?: string
	creator?: string
	title?: string
	description?: string
	image?: string | URL
	imageAlt?: string
}

export type AlternateLink = {
	hrefLang: string
	href: string | URL
}

export type SeoHeadOptions = {
	title: string
	titleTemplate?: string | ((title: string) => string)
	description?: string
	canonical?: string | URL
	site?: string | URL
	path?: string
	robots?: string | RobotsOptions
	noindex?: boolean
	nofollow?: boolean
	openGraph?: OpenGraphOptions
	twitter?: TwitterOptions
	alternates?: AlternateLink[]
	jsonLd?: JsonLdItem | JsonLdItem[]
	meta?: MetaItem[]
	link?: LinkItem[]
}

export type Tag = (BaseItem | ContentItem) & {
	tagName: TagName
	priority?: number
}

export type JsonLdItem = {
	'@type': string
	/** Automatically injected — do not provide. */
	'@context'?: never
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any
}

export type HeadItems = {
	title?: string
	base?: BaseItem[]
	meta?: MetaItem[]
	link?: LinkItem[]
	style?: StyleItem[]
	script?: ScriptItem[]
	noscript?: NoscriptItem[]
	jsonLd?: JsonLdItem | JsonLdItem[]
}

type NormalisedHeadItems = {
	title: string
	base: BaseItem[]
	meta: BaseItem[]
	link: BaseItem[]
	style: ContentItem[]
	script: ContentItem[]
	noscript: ContentItem[]
	jsonLd: JsonLdItem[]
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
	items.link = deduplicateLinkItems(items.link)
	items.style = deduplicateKeyedItems(items.style)
	items.script = deduplicateKeyedItems(items.script)
	items.noscript = deduplicateKeyedItems(items.noscript)
	items.base = items.base.slice(-1)

	const { title: _title, jsonLd: _jsonLd, ...rest } = items
	const tags: Tag[] = Object.entries(rest).flatMap(([tagName, tagItems]) =>
		tagItems.map((item) => ({ ...item, tagName }) as Tag)
	)
	tags.push({ tagName: 'title', innerHTML: escapeHtml(items.title) })
	tags.push(...getDefaultTags(tags))

	for (const item of items.jsonLd) {
		tags.push({
			tagName: 'script',
			type: 'application/ld+json',
			innerHTML: escapeJsonLd(
				JSON.stringify({ ...item, '@context': 'https://schema.org' })
			)
		})
	}

	const prioritisedTags = tags.map((tag) =>
		applyPriority ? applyPriority(tag) : applyPriorityDefault(tag)
	)

	const orderedTags = prioritisedTags.sort((a, b) => a.priority - b.priority)

	return orderedTags.map((i) => renderHeadTag(i)).join('\n')
}

function normaliseHeadItems(items: HeadItems): NormalisedHeadItems {
	return {
		title: items.title || '',
		base: items.base || [],
		meta: items.meta || [],
		link: items.link || [],
		style: items.style || [],
		script: items.script || [],
		noscript: items.noscript || [],
		jsonLd: Array.isArray(items.jsonLd)
			? items.jsonLd
			: items.jsonLd
				? [items.jsonLd]
				: []
	}
}

function mergeHeadItems(items: NormalisedHeadItems[]): NormalisedHeadItems {
	return items.reduce((merged, item) => {
		merged.title = item.title || merged.title
		merged.base.push(...item.base)
		merged.meta.push(...item.meta)
		merged.link.push(...item.link)
		merged.style.push(...item.style)
		merged.script.push(...item.script)
		merged.noscript.push(...item.noscript)
		merged.jsonLd.push(...item.jsonLd)
		return merged
	}, normaliseHeadItems({}))
}

function getDefaultTags(tags: Tag[]): Tag[] {
	const defaultTags: Tag[] = []
	if (
		tags.every(
			(tag) => tag.tagName !== 'meta' || !hasNonEmptyAttr(tag, 'charset')
		)
	)
		defaultTags.push({ ...DEFAULT_CHARSET, tagName: 'meta' })

	if (
		tags.every(
			(tag) => tag.tagName !== 'meta' || !attrEquals(tag.name, 'viewport')
		)
	)
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
			if (hasNonEmptyAttr(tag, 'charset')) priority = -4
			else if (attrEquals(tag.name, 'viewport')) priority = -3
			else if (hasNonEmptyAttr(tag, 'http-equiv')) priority = -1
			else priority = 100
			break

		case 'link':
			if (hasRel(tag, 'preconnect')) priority = 10
			else if (hasRel(tag, 'dns-prefetch')) priority = 11
			else if (hasRel(tag, 'preload') || hasRel(tag, 'modulepreload'))
				priority = 60
			else if (hasRel(tag, 'prefetch') || hasRel(tag, 'prerender'))
				priority = 80
			else if (hasRel(tag, 'stylesheet')) priority = 50
			else priority = 90
			break

		case 'style':
			priority = getTagContent(tag).includes('@import') ? 30 : 51
			break

		case 'script':
			if (tag.type === 'application/ld+json') priority = 105
			else if (tag.async) priority = 20
			else if (tag.defer) priority = 70
			else priority = 40
			break

		default:
			priority = 110
	}
	return { ...tag, priority } as Required<Tag>
}

export function getInlineContent(
	headItems: HeadItems | HeadItems[]
): { type: 'script' | 'style'; content: string }[] {
	const items = Array.isArray(headItems)
		? mergeHeadItems(headItems.map((i) => normaliseHeadItems(i)))
		: normaliseHeadItems(headItems)
	items.style = deduplicateKeyedItems(items.style)
	items.script = deduplicateKeyedItems(items.script)

	const result: { type: 'script' | 'style'; content: string }[] = []

	for (const style of items.style) {
		const content = getTagContent({ ...style, tagName: 'style' })
		if (content) result.push({ type: 'style', content })
	}

	for (const script of items.script) {
		const content = getTagContent({ ...script, tagName: 'script' })
		if (content) result.push({ type: 'script', content })
	}

	for (const item of items.jsonLd) {
		result.push({
			type: 'script',
			content: escapeJsonLd(
				JSON.stringify({ ...item, '@context': 'https://schema.org' })
			)
		})
	}

	return result
}

export function getExternalResources(
	headItems: HeadItems | HeadItems[]
): { type: 'script' | 'style'; url: string }[] {
	const items = Array.isArray(headItems)
		? mergeHeadItems(headItems.map((i) => normaliseHeadItems(i)))
		: normaliseHeadItems(headItems)
	items.link = deduplicateLinkItems(items.link)
	items.script = deduplicateKeyedItems(items.script)

	const result: { type: 'script' | 'style'; url: string }[] = []

	for (const script of items.script) {
		if (script.src)
			result.push({ type: 'script', url: toUrlString(script.src) })
	}

	for (const link of items.link) {
		if (hasRel(link, 'stylesheet') && link.href)
			result.push({ type: 'style', url: toUrlString(link.href) })
		else if (hasRel(link, 'modulepreload') && link.href) {
			result.push({ type: 'script', url: toUrlString(link.href) })
		} else if (hasRel(link, 'preload') && link.href) {
			if (attrEquals(link.as, 'script'))
				result.push({ type: 'script', url: toUrlString(link.href) })
			else if (attrEquals(link.as, 'style'))
				result.push({ type: 'style', url: toUrlString(link.href) })
		}
	}

	return result
}

export function preconnect(
	href: string | URL,
	options: ResourceHintOptions = {}
): LinkItem {
	return { ...options, rel: 'preconnect', href: toUrlString(href) }
}

export function dnsPrefetch(
	href: string | URL,
	options: ResourceHintOptions = {}
): LinkItem {
	return { ...options, rel: 'dns-prefetch', href: toUrlString(href) }
}

export function preload(href: string | URL, options: PreloadOptions): LinkItem {
	const { as, ...rest } = options
	return { ...rest, rel: 'preload', href: toUrlString(href), as }
}

export function preloadFont(
	href: string | URL,
	options: PreloadFontOptions = {}
): LinkItem {
	const { crossorigin = 'anonymous', type, ...rest } = options
	const link: LinkItem = {
		...rest,
		rel: 'preload',
		href: toUrlString(href),
		as: 'font'
	}
	if (type) link.type = type
	if (crossorigin !== false) link.crossorigin = crossorigin
	return link
}

export function preloadImage(
	href: string | URL,
	options: PreloadImageOptions = {}
): LinkItem {
	return { ...options, rel: 'preload', href: toUrlString(href), as: 'image' }
}

export function modulepreload(
	href: string | URL,
	options: ResourceHintOptions = {}
): LinkItem {
	return { ...options, rel: 'modulepreload', href: toUrlString(href) }
}

export function stylesheet(
	href: string | URL,
	options: StylesheetOptions = {}
): LinkItem {
	return { ...options, rel: 'stylesheet', href: toUrlString(href) }
}

export function externalScript(
	src: string | URL,
	options: ExternalScriptOptions = {}
): ScriptItem {
	return { ...options, src: toUrlString(src) }
}

export function createSeoHead(options: SeoHeadOptions): HeadItems {
	const title = applyTitleTemplate(options.title, options.titleTemplate)
	const canonical =
		options.canonical !== undefined
			? resolveUrlString(options.canonical, options.site)
			: options.site && options.path
				? resolveUrlString(options.path, options.site)
				: undefined

	const meta: MetaItem[] = []
	const link: LinkItem[] = []

	if (options.description)
		meta.push({
			name: 'description',
			content: options.description
		})

	const robots = createRobotsContent(options)
	if (robots) meta.push({ name: 'robots', content: robots })

	if (canonical) link.push({ rel: 'canonical', href: canonical })

	for (const alternate of options.alternates || []) {
		link.push({
			key: `alternate:${alternate.hrefLang}`,
			rel: 'alternate',
			hreflang: alternate.hrefLang,
			href: resolveUrlString(alternate.href, options.site)
		})
	}

	if (options.openGraph) {
		meta.push(
			...createOpenGraphMeta(options.openGraph, {
				title,
				description: options.description,
				url: canonical,
				site: options.site
			})
		)
	}

	if (options.twitter) {
		meta.push(
			...createTwitterMeta(options.twitter, {
				title,
				description: options.description,
				site: options.site
			})
		)
	}

	meta.push(...(options.meta || []))
	link.push(...(options.link || []))

	return {
		title,
		meta,
		link,
		jsonLd: options.jsonLd
	}
}

export function validateHeadItems(
	headItems: HeadItems | HeadItems[],
	options: HeadValidationOptions = {}
): HeadValidationIssue[] {
	const validationOptions: Required<
		Omit<HeadValidationOptions, 'baseUrl' | 'requireSri'>
	> &
		Pick<HeadValidationOptions, 'baseUrl' | 'requireSri'> = {
		baseUrl: options.baseUrl,
		requireSri: options.requireSri,
		requireDescription: options.requireDescription ?? true,
		requireOpenGraphImage: options.requireOpenGraphImage ?? false,
		warnOnInnerHTML: options.warnOnInnerHTML ?? true,
		warnOnEventAttributes: options.warnOnEventAttributes ?? true
	}
	const items = Array.isArray(headItems)
		? mergeHeadItems(headItems.map((i) => normaliseHeadItems(i)))
		: normaliseHeadItems(headItems)
	items.meta = deduplicateMetaItems(items.meta)
	items.link = deduplicateLinkItems(items.link)
	items.style = deduplicateKeyedItems(items.style)
	items.script = deduplicateKeyedItems(items.script)
	items.noscript = deduplicateKeyedItems(items.noscript)
	const issues: HeadValidationIssue[] = []

	if (!items.title.trim()) {
		issues.push({
			code: 'missing-title',
			severity: 'error',
			tagName: 'title',
			path: 'title',
			message: 'At least one non-empty title is required.'
		})
	}

	if (
		validationOptions.requireDescription &&
		!items.meta.some((meta) => attrEquals(meta.name, 'description'))
	) {
		issues.push({
			code: 'missing-description',
			severity: 'warning',
			tagName: 'meta',
			path: 'meta[name="description"]',
			message: 'Add a meta description for search and sharing previews.'
		})
	}

	const hasNoindex = hasRobotsDirective(items.meta, 'noindex')
	validateMetaItems(items.meta, issues, validationOptions)
	validateLinkItems(items.link, issues, validationOptions, hasNoindex)
	validateScriptItems(items.script, issues, validationOptions)
	validateContentItems(items.style, 'style', issues, validationOptions)
	validateContentItems(items.script, 'script', issues, validationOptions)
	validateContentItems(items.noscript, 'noscript', issues, validationOptions)
	validateJsonLd(items.jsonLd, issues)

	return issues
}

function validateMetaItems(
	metaItems: MetaItem[],
	issues: HeadValidationIssue[],
	options: HeadValidationOptions
): void {
	const ogProperties = new Set<string>()

	metaItems.forEach((meta, index) => {
		validateUnsafeAttributes(meta, 'meta', `meta[${index}]`, issues, options)
		const property = normaliseAttrValue(meta.property).toLowerCase()
		const name = normaliseAttrValue(meta.name).toLowerCase()
		const content = normaliseAttrValue(meta.content)

		if (property.startsWith('og:')) ogProperties.add(property)

		const ogUrlValid =
			property === 'og:url'
				? validateUrlValue(content, 'meta', `meta[${index}]`, issues, options)
				: true

		if (property === 'og:url' && ogUrlValid && isRelativeUrl(content)) {
			issues.push({
				code: 'relative-og-url',
				severity: 'warning',
				tagName: 'meta',
				path: `meta[${index}]`,
				message: 'Open Graph URLs should be absolute.'
			})
		}

		const ogImageValid =
			property === 'og:image'
				? validateUrlValue(content, 'meta', `meta[${index}]`, issues, options)
				: true

		if (property === 'og:image' && ogImageValid && isRelativeUrl(content)) {
			issues.push({
				code: 'relative-og-image',
				severity: 'warning',
				tagName: 'meta',
				path: `meta[${index}]`,
				message: 'Open Graph images should use absolute URLs.'
			})
		}

		const twitterImageValid =
			name === 'twitter:image'
				? validateUrlValue(content, 'meta', `meta[${index}]`, issues, options)
				: true

		if (
			name === 'twitter:image' &&
			twitterImageValid &&
			isRelativeUrl(content)
		) {
			issues.push({
				code: 'relative-twitter-image',
				severity: 'warning',
				tagName: 'meta',
				path: `meta[${index}]`,
				message: 'Twitter images should use absolute URLs.'
			})
		}
	})

	const hasActiveOpenGraph =
		ogProperties.size > 1 ||
		[...ogProperties].some((property) => property !== 'og:type')

	if (hasActiveOpenGraph) {
		const requiredProperties = [
			'og:title',
			'og:type',
			'og:url',
			...(options.requireOpenGraphImage ? ['og:image'] : [])
		]
		for (const property of requiredProperties) {
			if (!ogProperties.has(property)) {
				issues.push({
					code: 'missing-og-required',
					severity: 'warning',
					tagName: 'meta',
					path: `meta[property="${property}"]`,
					message: `Open Graph metadata is missing ${property}.`
				})
			}
		}
	}
}

function validateLinkItems(
	linkItems: LinkItem[],
	issues: HeadValidationIssue[],
	options: HeadValidationOptions,
	hasNoindex: boolean
): void {
	let canonicalCount = 0

	linkItems.forEach((link, index) => {
		validateUnsafeAttributes(link, 'link', `link[${index}]`, issues, options)
		const rels = getRelTokens(link)
		const href = normaliseAttrValue(link.href)
		const path = `link[${index}]`

		if (rels.includes('canonical')) {
			canonicalCount += 1
			const hrefValid = validateUrlValue(href, 'link', path, issues, options)
			if (href && hrefValid && isRelativeUrl(href)) {
				issues.push({
					code: 'relative-canonical',
					severity: 'warning',
					tagName: 'link',
					path,
					message: 'Canonical links should be absolute URLs.'
				})
			}

			if (hasNoindex) {
				issues.push({
					code: 'canonical-with-noindex',
					severity: 'warning',
					tagName: 'link',
					path,
					message: 'Avoid publishing a canonical URL on noindex pages.'
				})
			}
		}

		if (rels.includes('preconnect') && !href) {
			issues.push({
				code: 'preconnect-missing-href',
				severity: 'warning',
				tagName: 'link',
				path,
				message: 'Preconnect links need an href.'
			})
		}

		if (rels.includes('dns-prefetch') && !href) {
			issues.push({
				code: 'dns-prefetch-missing-href',
				severity: 'warning',
				tagName: 'link',
				path,
				message: 'DNS-prefetch links need an href.'
			})
		}

		if (rels.includes('preload')) validatePreload(link, issues, path)

		if (rels.includes('modulepreload') && hasNonEmptyAttr(link, 'as')) {
			issues.push({
				code: 'modulepreload-with-as',
				severity: 'warning',
				tagName: 'link',
				path,
				message: 'modulepreload does not use an as attribute.'
			})
		}

		validateSubresourceIntegrity(
			link,
			'link',
			path,
			issues,
			options,
			isSriRelevantLink(link)
		)
	})

	if (canonicalCount > 1) {
		issues.push({
			code: 'duplicate-canonical',
			severity: 'warning',
			tagName: 'link',
			path: 'link[rel="canonical"]',
			message: 'Multiple canonical links were provided; the last one wins.'
		})
	}
}

function validatePreload(
	link: LinkItem,
	issues: HeadValidationIssue[],
	path: string
): void {
	const as = normaliseAttrValue(link.as).toLowerCase()
	if (!as) {
		issues.push({
			code: 'missing-preload-as',
			severity: 'warning',
			tagName: 'link',
			path,
			message: 'Preload links need an as attribute.'
		})
		return
	}

	if (!VALID_PRELOAD_AS_VALUES.has(as)) {
		issues.push({
			code: 'invalid-preload-as',
			severity: 'warning',
			tagName: 'link',
			path,
			message: `Preload as="${as}" is not a standard destination.`
		})
	}

	if (as === 'font' && !hasAttr(link, 'crossorigin')) {
		issues.push({
			code: 'font-preload-missing-crossorigin',
			severity: 'warning',
			tagName: 'link',
			path,
			message: 'Font preloads should include crossorigin, usually anonymous.'
		})
	}
}

function validateScriptItems(
	scriptItems: ScriptItem[],
	issues: HeadValidationIssue[],
	options: HeadValidationOptions
): void {
	scriptItems.forEach((script, index) => {
		const path = `script[${index}]`
		validateUnsafeAttributes(script, 'script', path, issues, options)
		validateSubresourceIntegrity(script, 'script', path, issues, options, true)
	})
}

function validateContentItems(
	items: ContentItem[],
	tagName: 'style' | 'script' | 'noscript',
	issues: HeadValidationIssue[],
	options: HeadValidationOptions
): void {
	items.forEach((item, index) => {
		const path = `${tagName}[${index}]`
		validateUnsafeAttributes(item, tagName, path, issues, options)
		if (options.warnOnInnerHTML !== false && item.innerHTML !== undefined) {
			issues.push({
				code: 'unsafe-inner-html',
				severity: 'warning',
				tagName,
				path,
				message: `${tagName}.innerHTML is rendered as trusted raw HTML. Prefer textContent where possible.`
			})
		}
	})
}

function validateJsonLd(
	jsonLdItems: JsonLdItem[],
	issues: HeadValidationIssue[]
): void {
	jsonLdItems.forEach((item, index) => {
		let serializable = true
		try {
			JSON.stringify({ ...item, '@context': 'https://schema.org' })
		} catch {
			serializable = false
			issues.push({
				code: 'invalid-json-ld',
				severity: 'error',
				tagName: 'jsonLd',
				path: `jsonLd[${index}]`,
				message: 'JSON-LD must be serializable with JSON.stringify().'
			})
		}

		if (serializable && !normaliseAttrValue(item['@type'])) {
			issues.push({
				code: 'invalid-json-ld',
				severity: 'warning',
				tagName: 'jsonLd',
				path: `jsonLd[${index}].@type`,
				message: 'JSON-LD items should include @type.'
			})
		}
	})
}

function validateUnsafeAttributes(
	item: BaseItem,
	tagName: TagName,
	path: string,
	issues: HeadValidationIssue[],
	options: HeadValidationOptions
): void {
	if (options.warnOnEventAttributes === false) return

	for (const key of Object.keys(item)) {
		if (/^on/i.test(key)) {
			issues.push({
				code: 'unsafe-event-attribute',
				severity: 'warning',
				tagName,
				path: `${path}.${key}`,
				message: `Inline event attribute ${key} is allowed but should only contain trusted code.`
			})
		}
	}
}

function validateSubresourceIntegrity(
	item: BaseItem,
	tagName: 'link' | 'script',
	path: string,
	issues: HeadValidationIssue[],
	options: HeadValidationOptions,
	relevant: boolean
): void {
	if (!relevant) return
	const url = normaliseAttrValue(tagName === 'script' ? item.src : item.href)
	if (!url) return
	validateUrlValue(url, tagName, path, issues, options)
	if (!isExternalHttpUrl(url, options.baseUrl)) return

	if (hasNonEmptyAttr(item, 'integrity') && !hasAttr(item, 'crossorigin')) {
		issues.push({
			code: 'sri-missing-crossorigin',
			severity: 'warning',
			tagName,
			path,
			message: 'Cross-origin SRI resources should include crossorigin.'
		})
	}

	if (options.requireSri && !hasNonEmptyAttr(item, 'integrity')) {
		issues.push({
			code: 'missing-sri',
			severity: 'warning',
			tagName,
			path,
			message:
				'External scripts and stylesheets should include integrity when requireSri is enabled.'
		})
	}
}

function validateUrlValue(
	value: string,
	tagName: 'meta' | 'link' | 'script',
	path: string,
	issues: HeadValidationIssue[],
	options: HeadValidationOptions
): boolean {
	if (!value || value.startsWith('//')) return true
	if (/\s/.test(value)) {
		issues.push({
			code: 'invalid-url',
			severity: 'warning',
			tagName,
			path,
			message: `Invalid URL: ${value}.`
		})
		return false
	}
	try {
		if (isRelativeUrl(value)) {
			if (options.baseUrl) new URL(value, toUrlString(options.baseUrl))
			return true
		}
		const parsed = new URL(value)
		if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return true
		if (parsed.protocol === 'data:' || parsed.protocol === 'blob:') return true
		issues.push({
			code: 'invalid-url',
			severity: 'warning',
			tagName,
			path,
			message: `Unsupported URL protocol in ${value}.`
		})
		return false
	} catch {
		issues.push({
			code: 'invalid-url',
			severity: 'warning',
			tagName,
			path,
			message: `Invalid URL: ${value}.`
		})
		return false
	}
}

function isSriRelevantLink(link: LinkItem): boolean {
	if (hasRel(link, 'stylesheet') || hasRel(link, 'modulepreload')) return true
	if (!hasRel(link, 'preload')) return false
	const as = normaliseAttrValue(link.as).toLowerCase()
	return as === 'script' || as === 'style'
}

function hasRobotsDirective(metaItems: MetaItem[], directive: string): boolean {
	return metaItems.some(
		(meta) =>
			attrEquals(meta.name, 'robots') &&
			normaliseAttrValue(meta.content)
				.toLowerCase()
				.split(',')
				.map((token) => token.trim())
				.includes(directive)
	)
}

function applyTitleTemplate(
	title: string,
	template: SeoHeadOptions['titleTemplate']
): string {
	if (!template) return title
	if (typeof template === 'function') return template(title)
	return template.includes('%s')
		? template.replace(/%s/g, title)
		: title + template
}

function createRobotsContent(options: SeoHeadOptions): string | undefined {
	if (typeof options.robots === 'string') return options.robots
	const robots: RobotsOptions = {
		...(typeof options.robots === 'object' ? options.robots : {})
	}

	if (options.noindex !== undefined) robots.index = !options.noindex
	if (options.nofollow !== undefined) robots.follow = !options.nofollow

	const tokens: string[] = []
	if (robots.index === false) tokens.push('noindex')
	else if (robots.index === true) tokens.push('index')

	if (robots.follow === false) tokens.push('nofollow')
	else if (robots.follow === true) tokens.push('follow')

	if (robots.noarchive) tokens.push('noarchive')
	if (robots.nosnippet) tokens.push('nosnippet')
	if (robots.noimageindex) tokens.push('noimageindex')
	if (robots.nocache) tokens.push('nocache')
	if (typeof robots.maxSnippet === 'number')
		tokens.push(`max-snippet:${robots.maxSnippet}`)
	if (robots.maxImagePreview)
		tokens.push(`max-image-preview:${robots.maxImagePreview}`)
	if (typeof robots.maxVideoPreview === 'number')
		tokens.push(`max-video-preview:${robots.maxVideoPreview}`)
	if (Array.isArray(robots.extra)) tokens.push(...robots.extra)
	else if (robots.extra) tokens.push(robots.extra)

	return tokens.length ? tokens.join(', ') : undefined
}

function createOpenGraphMeta(
	openGraph: OpenGraphOptions,
	defaults: {
		title: string
		description?: string
		url?: string
		site?: string | URL
	}
): MetaItem[] {
	const meta: MetaItem[] = [
		{
			property: 'og:title',
			content: openGraph.title || defaults.title
		},
		{
			property: 'og:type',
			content: openGraph.type || 'website'
		}
	]

	const description = openGraph.description || defaults.description
	if (description)
		meta.push({
			property: 'og:description',
			content: description
		})

	const url = openGraph.url
		? resolveUrlString(openGraph.url, defaults.site)
		: defaults.url
	if (url) meta.push({ property: 'og:url', content: url })

	if (openGraph.siteName)
		meta.push({
			property: 'og:site_name',
			content: openGraph.siteName
		})

	if (openGraph.locale)
		meta.push({
			property: 'og:locale',
			content: openGraph.locale
		})

	const images = Array.isArray(openGraph.image)
		? openGraph.image
		: openGraph.image
			? [openGraph.image]
			: []
	images.forEach((image, index) => {
		const normalised = normaliseSeoImage(image, defaults.site)
		const key = `og:image:${index}`
		meta.push({ key, property: 'og:image', content: normalised.url })
		if (normalised.alt)
			meta.push({
				key: `${key}:alt`,
				property: 'og:image:alt',
				content: normalised.alt
			})
		if (normalised.width)
			meta.push({
				key: `${key}:width`,
				property: 'og:image:width',
				content: normalised.width
			})
		if (normalised.height)
			meta.push({
				key: `${key}:height`,
				property: 'og:image:height',
				content: normalised.height
			})
		if (normalised.type)
			meta.push({
				key: `${key}:type`,
				property: 'og:image:type',
				content: normalised.type
			})
	})

	return meta
}

function createTwitterMeta(
	twitter: TwitterOptions,
	defaults: { title: string; description?: string; site?: string | URL }
): MetaItem[] {
	const meta: MetaItem[] = [
		{
			name: 'twitter:card',
			content:
				twitter.card || (twitter.image ? 'summary_large_image' : 'summary')
		},
		{
			name: 'twitter:title',
			content: twitter.title || defaults.title
		}
	]

	const description = twitter.description || defaults.description
	if (description)
		meta.push({
			name: 'twitter:description',
			content: description
		})

	if (twitter.image)
		meta.push({
			name: 'twitter:image',
			content: resolveUrlString(twitter.image, defaults.site)
		})

	if (twitter.imageAlt)
		meta.push({
			name: 'twitter:image:alt',
			content: twitter.imageAlt
		})

	if (twitter.site)
		meta.push({
			name: 'twitter:site',
			content: twitter.site
		})

	if (twitter.creator)
		meta.push({
			name: 'twitter:creator',
			content: twitter.creator
		})

	return meta
}

function normaliseSeoImage(
	image: SeoImage,
	baseUrl?: string | URL
): {
	url: string
	alt?: string
	width?: number
	height?: number
	type?: string
} {
	if (typeof image === 'string' || image instanceof URL)
		return { url: resolveUrlString(image, baseUrl) }

	return {
		...image,
		url: resolveUrlString(image.url, baseUrl)
	}
}

function toUrlString(value: string | URL): string {
	return value instanceof URL ? value.toString() : String(value)
}

function resolveUrlString(value: string | URL, baseUrl?: string | URL): string {
	const url = toUrlString(value)
	if (!baseUrl) return url
	try {
		return new URL(url, toUrlString(baseUrl)).toString()
	} catch {
		return url
	}
}

function isRelativeUrl(value: string): boolean {
	if (!value) return false
	try {
		new URL(value)
		return false
	} catch {
		return true
	}
}

function isExternalHttpUrl(value: string, baseUrl?: string | URL): boolean {
	let url: URL
	try {
		url = baseUrl ? new URL(value, toUrlString(baseUrl)) : new URL(value)
	} catch {
		return false
	}

	if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
	if (!baseUrl) return true

	try {
		return url.origin !== new URL(toUrlString(baseUrl)).origin
	} catch {
		return true
	}
}

function escapeJsonLd(json: string): string {
	return json.replace(/<\//gi, '<\\/')
}

function deduplicateMetaItems(metaItems: BaseItem[]): BaseItem[] {
	const deduplicated: BaseItem[] = []
	const itemIndexByKey = new Map<string, number>()

	for (const meta of metaItems) {
		const key = getMetaDeduplicationKey(meta)
		if (!key) {
			deduplicated.push(meta)
			continue
		}

		const existingIndex = itemIndexByKey.get(key)
		if (existingIndex === undefined) {
			itemIndexByKey.set(key, deduplicated.length)
			deduplicated.push(meta)
		} else {
			deduplicated[existingIndex] = meta
		}
	}

	return deduplicated
}

function getMetaDeduplicationKey(meta: BaseItem): string | undefined {
	const explicitKey = getExplicitDeduplicationKey(meta)
	if (explicitKey) return explicitKey

	const media = normaliseAttrValue(meta.media)
	if (hasNonEmptyAttr(meta, 'property'))
		return `property:${normaliseAttrValue(meta.property)}:${media}`
	if (hasNonEmptyAttr(meta, 'name'))
		return `name:${normaliseAttrValue(meta.name).toLowerCase()}:${media}`
	if (hasNonEmptyAttr(meta, 'http-equiv'))
		return `http-equiv:${normaliseAttrValue(meta['http-equiv']).toLowerCase()}:${media}`
	if (hasNonEmptyAttr(meta, 'charset')) return `charset::${media}`
}

function deduplicateLinkItems(linkItems: BaseItem[]): BaseItem[] {
	const deduplicated: BaseItem[] = []
	const itemIndexByKey = new Map<string, number>()

	for (const link of linkItems) {
		const key = getLinkDeduplicationKey(link)
		if (!key) {
			deduplicated.push(link)
			continue
		}

		const existingIndex = itemIndexByKey.get(key)
		if (existingIndex === undefined) {
			itemIndexByKey.set(key, deduplicated.length)
			deduplicated.push(link)
		} else {
			deduplicated[existingIndex] = link
		}
	}

	return deduplicated
}

function deduplicateKeyedItems<T extends BaseItem>(items: T[]): T[] {
	const deduplicated: T[] = []
	const itemIndexByKey = new Map<string, number>()

	for (const item of items) {
		const key = getExplicitDeduplicationKey(item)
		if (!key) {
			deduplicated.push(item)
			continue
		}

		const existingIndex = itemIndexByKey.get(key)
		if (existingIndex === undefined) {
			itemIndexByKey.set(key, deduplicated.length)
			deduplicated.push(item)
		} else {
			deduplicated[existingIndex] = item
		}
	}

	return deduplicated
}

function getLinkDeduplicationKey(link: BaseItem): string | undefined {
	const explicitKey = getExplicitDeduplicationKey(link)
	if (explicitKey) return explicitKey

	const rels = getRelTokens(link)
	const href = normaliseAttrValue(link.href)
	const media = normaliseAttrValue(link.media)
	const as = normaliseAttrValue(link.as).toLowerCase()
	const type = normaliseAttrValue(link.type).toLowerCase()
	const crossorigin = normaliseAttrValue(link.crossorigin).toLowerCase()
	const imagesrcset = normaliseAttrValue(link.imagesrcset)
	const imagesizes = normaliseAttrValue(link.imagesizes)

	if (rels.includes('canonical')) return 'canonical'

	if ((rels.includes('preconnect') || rels.includes('dns-prefetch')) && href)
		return `${rels.join(' ')}:${href}`

	if ((rels.includes('preload') || rels.includes('modulepreload')) && href)
		return [
			rels.join(' '),
			href,
			as,
			type,
			crossorigin,
			media,
			imagesrcset,
			imagesizes
		].join(':')
}

function renderHeadTag(item: BaseItem | ContentItem): string {
	const attrs = renderAttrs(item)
	return ['meta', 'link', 'base'].includes(item.tagName)
		? `<${item.tagName}${attrs ? ' ' + attrs : ''}>`
		: `<${item.tagName}${attrs && ' '}${attrs}>${getTagContent(item)}</${
				item.tagName
			}>`
}

export function renderAttrs(item: BaseItem | ContentItem): string {
	return Object.entries(item)
		.filter(
			([key]) =>
				!['innerHTML', 'textContent', 'priority', 'tagName', 'key'].includes(
					key
				)
		)
		.filter(([key]) => isValidAttributeName(key))
		.map(([key, value]) => {
			if (typeof value === 'boolean') return value ? key : ''
			else if (value === null || value === undefined) return ''
			else return `${key}="${escapeHtml(String(value))}"`
		})
		.filter((attr) => attr !== '')
		.join(' ')
}

function isValidAttributeName(key: string): boolean {
	return /^[^\s"'<>/=]+$/.test(key)
}

function getTagContent(item: BaseItem | ContentItem): string {
	if ('textContent' in item && item.textContent !== undefined) {
		const content = String(item.textContent)
		if (item.tagName === 'script') return escapeRawText(content, 'script')
		if (item.tagName === 'style') return escapeRawText(content, 'style')
		return escapeHtml(content)
	}

	return 'innerHTML' in item && item.innerHTML !== undefined
		? String(item.innerHTML)
		: ''
}

function escapeRawText(content: string, tagName: 'script' | 'style'): string {
	return content.replace(new RegExp(`</${tagName}`, 'gi'), `<\\/${tagName}`)
}

function hasAttr(item: BaseItem | ContentItem, key: string): boolean {
	return item[key] !== null && item[key] !== undefined
}

function hasNonEmptyAttr(item: BaseItem | ContentItem, key: string): boolean {
	return normaliseAttrValue(item[key]) !== ''
}

function attrEquals(value: unknown, expected: string): boolean {
	return normaliseAttrValue(value).toLowerCase() === expected
}

function hasRel(item: BaseItem | ContentItem, rel: string): boolean {
	return getRelTokens(item).includes(rel)
}

function getRelTokens(item: BaseItem | ContentItem): string[] {
	return normaliseAttrValue(item.rel)
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean)
		.sort()
}

function normaliseAttrValue(value: unknown): string {
	return value === null || value === undefined ? '' : String(value).trim()
}

function getExplicitDeduplicationKey(item: BaseItem): string | undefined {
	const key = normaliseAttrValue(item.key)
	return key ? `key:${key}` : undefined
}

function escapeHtml(str: string): string {
	const escapeMap: Record<string, string> = {
		'"': '&quot;',
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;'
	}

	return str.replace(/["&<>]/g, (match) => escapeMap[match])
}
