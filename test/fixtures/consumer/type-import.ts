import {
	createSeoHead,
	externalScript,
	modulepreload,
	preconnect,
	preload,
	preloadFont,
	preloadImage,
	validateHeadItems,
	type HeadItems,
	type HelmetOptions,
	type HeadValidationIssue
} from 'astro-helmet'

const items: HeadItems = createSeoHead({
	title: 'Typed consumer',
	noindex: true,
	robots: 'max-snippet:100'
})
items.link = [
	preconnect('https://example.com', { crossorigin: false }),
	modulepreload('/app.js', { as: 'script' }),
	preload('/font.woff2', { as: 'font' }),
	preloadFont('/optional-cors.woff2', { crossorigin: false }),
	preloadImage({ imagesrcset: '/1.jpg 1x, /2.jpg 2x' })
]
items.script = [externalScript('/app.js', { crossorigin: false })]
const options: HelmetOptions = {
	csp: true,
	applyPriority: (tag) => ({ ...tag, priority: tag.priority ?? 100 }),
	baseUrl: new URL('https://cdn.example.com'),
	validate: { requireSri: true, documentUrl: 'https://example.com' }
}
const issues: HeadValidationIssue[] = validateHeadItems(items, {
	requireSri: true
})
// @ts-expect-error href-less responsive image preloads require imagesrcset
preloadImage({ imagesizes: '100vw' })
// @ts-expect-error image is not a module destination
modulepreload('/image.png', { as: 'image' })
void options
void issues
