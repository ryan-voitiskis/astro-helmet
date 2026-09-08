import { runInNewContext } from 'node:vm'
import { parse, type DefaultTreeAdapterMap } from 'parse5'
import { describe, expect, it } from 'vitest'
import {
	getCspSource,
	getComponentValidationOptions,
	prepareHead,
	renderHead,
	validateHeadItems,
	type HeadItems
} from '../src/main'

function metas(html: string): string[] {
	return (
		html.match(
			/<meta (?:key=[^>]+ |)property="og:image[^>]*>|<meta name="replacement"[^>]*>/g
		) || []
	)
}

describe('reviewed URL boundaries', () => {
	it('preserves legacy validation origin options in development', () => {
		const options = getComponentValidationOptions(
			{
				validate: {
					requireSri: true,
					baseUrl: new URL('https://site.example.test')
				}
			},
			new URL('http://localhost:4321/page')
		)
		expect(
			validateHeadItems(
				{ title: 'Dev', script: [{ src: '/app.js' }] },
				{ ...options, requireDescription: false }
			)
		).toEqual([])
	})
	it('does not erase an explicit manual base when optional validation fields are undefined', () => {
		const options = getComponentValidationOptions(
			{
				baseUrl: 'https://cdn.example.test/assets/',
				validate: {
					baseUrl: undefined,
					documentUrl: undefined,
					requireSri: true
				}
			},
			new URL('https://site.example.test/page'),
			'https://ignored.example.test/'
		)
		expect(options.baseUrl).toBe('https://cdn.example.test/assets/')
		expect(
			validateHeadItems(
				{
					title: 'Manual',
					base: [{ href: 'https://ignored.example.test/' }],
					script: [{ src: 'app.js' }]
				},
				{ ...options, requireDescription: false }
			)
		).toEqual([expect.objectContaining({ code: 'missing-sri' })])
	})
	it('retains an explicitly supplied validation document origin', () => {
		const options = getComponentValidationOptions(
			{ validate: { documentUrl: 'https://preview.example.test/page' } },
			new URL('https://site.example.test/page')
		)
		expect(options.documentUrl).toBe('https://preview.example.test/page')
	})
	it.each(['https://[bad', '/assets/'])(
		'validates absolute resources independently of base %s',
		(baseUrl) => {
			const issues = validateHeadItems(
				{ title: 'URLs', script: [{ src: 'https://cdn.example.test/app.js' }] },
				{
					documentUrl: 'https://site.example.test/page',
					baseUrl,
					requireSri: true,
					requireDescription: false
				}
			)
			expect(issues).toContainEqual(
				expect.objectContaining({ code: 'missing-sri' })
			)
			expect(
				issues.filter((issue) => issue.tagName === 'script')
			).not.toContainEqual(expect.objectContaining({ code: 'invalid-url' }))
		}
	)
	it.each([
		['https://cdn.example.test/app.js', 'https://cdn.example.test'],
		['data:text/javascript,void(0)', 'data:'],
		['/app.js', "'self'"]
	])(
		'resolves CSP source %s with a malformed base using the HTML fallback',
		(url, expected) => {
			expect(
				getCspSource(url, {
					documentUrl: 'https://site.example.test/page',
					baseUrl: 'https://[bad'
				})
			).toBe(expected)
		}
	)
	it('resolves relative bases consistently for validation and CSP', () => {
		const options = {
			documentUrl: 'https://site.example.test/page',
			baseUrl: '/assets/'
		}
		expect(getCspSource('app.js', options)).toBe("'self'")
		expect(
			validateHeadItems(
				{ title: 'Relative base', script: [{ src: 'app.js' }] },
				{ ...options, requireSri: true, requireDescription: false }
			)
		).toEqual([])
	})
	it.each(['https://[bad', 'data:text/html,base', 'javascript:void(0)'])(
		'reports the invalid base %s without blaming independent resources',
		(href) => {
			expect(
				validateHeadItems(
					{
						title: 'Invalid base',
						base: [{ href }],
						script: [{ src: 'https://cdn.example.test/app.js' }]
					},
					{
						documentUrl: 'https://site.example.test/',
						requireDescription: false,
						requireSri: true
					}
				)
			).toEqual([
				expect.objectContaining({
					code: 'invalid-url',
					tagName: 'base',
					path: 'base[0].href'
				}),
				expect.objectContaining({ code: 'missing-sri', tagName: 'script' })
			])
			expect(
				getCspSource('/app.js', {
					documentUrl: 'https://site.example.test/',
					baseUrl: href
				})
			).toBe("'self'")
		}
	)
	it('treats a scheme-relative base as external when the document origin is unknown', () => {
		expect(
			validateHeadItems(
				{
					title: 'Unknown origin',
					base: [{ href: '//cdn.example.test/assets/' }],
					script: [{ src: 'app.js' }]
				},
				{ requireDescription: false, requireSri: true }
			)
		).toEqual([expect.objectContaining({ code: 'missing-sri' })])
	})
	it('validates a relative base without requiring an unknown document URL', () => {
		expect(
			validateHeadItems(
				{
					title: 'Relative',
					base: [{ href: '/assets/' }],
					script: [{ src: 'app.js' }]
				},
				{ requireDescription: false }
			)
		).toEqual([])
	})
})

describe('reviewed image key boundaries', () => {
	it('moves a repeated explicit property key to its new image group', () => {
		const html = renderHead({
			title: 'Keys',
			meta: [
				{ property: 'og:image', content: '/first.png' },
				{ key: 'caption', property: 'og:image:alt', content: 'old' },
				{ property: 'og:image', content: '/second.png' },
				{ key: 'caption', property: 'og:image:alt', content: 'new' }
			]
		})
		expect(metas(html)).toEqual([
			'<meta property="og:image" content="/first.png">',
			'<meta property="og:image" content="/second.png">',
			'<meta property="og:image:alt" content="new">'
		])
	})
	it('does not lose properties after a keyed image root is evicted', () => {
		const html = renderHead({
			title: 'Eviction',
			meta: [
				{ key: 'shared', property: 'og:image', content: '/old.png' },
				{ property: 'og:image:alt', content: 'old' },
				{ key: 'shared', name: 'replacement', content: 'yes' },
				{ property: 'og:image:alt', content: 'keep' }
			]
		})
		expect(metas(html)).toEqual([
			'<meta name="replacement" content="yes">',
			'<meta property="og:image:alt" content="keep">'
		])
	})
	it('upserts an explicitly keyed image without deleting unrelated groups', () => {
		const first: HeadItems = {
			title: 'Upsert',
			meta: [
				{ key: 'hero', property: 'og:image', content: '/hero-old.png' },
				{ property: 'og:image:alt', content: 'Old hero' },
				{ key: 'other', property: 'og:image', content: '/other.png' },
				{ property: 'og:image:alt', content: 'Other' }
			]
		}
		const last: HeadItems = {
			meta: [{ key: 'hero', property: 'og:image', content: '/hero-new.png' }]
		}
		expect(metas(renderHead([first, last]))).toEqual(
			metas(renderHead({ ...first, meta: [...first.meta!, ...last.meta!] }))
		)
	})
	it('deduplicates orphan properties without merging them into a later image', () => {
		expect(
			metas(
				renderHead({
					title: 'Orphans',
					meta: [
						{ property: 'og:image:alt', content: 'old' },
						{ name: 'replacement', content: 'middle' },
						{ property: 'og:image:alt', content: 'orphan' },
						{ property: 'og:image', content: '/image.png' },
						{ property: 'og:image:alt', content: 'attached' }
					]
				})
			)
		).toEqual([
			'<meta property="og:image:alt" content="orphan">',
			'<meta name="replacement" content="middle">',
			'<meta property="og:image" content="/image.png">',
			'<meta property="og:image:alt" content="attached">'
		])
	})
	it('moves an explicit key from ordinary metadata to an image property and back', () => {
		const meta = [
			{ key: 'shared', name: 'replacement', content: 'old' },
			{ property: 'og:image', content: '/image.png' },
			{ key: 'shared', property: 'og:image:alt', content: 'attached' }
		]
		expect(metas(renderHead({ title: 'Key transition', meta }))).toEqual([
			'<meta property="og:image" content="/image.png">',
			'<meta property="og:image:alt" content="attached">'
		])
		expect(
			metas(
				renderHead({
					title: 'Key transition',
					meta: [
						...meta,
						{ key: 'shared', name: 'replacement', content: 'latest' }
					]
				})
			)
		).toEqual([
			'<meta property="og:image" content="/image.png">',
			'<meta name="replacement" content="latest">'
		])
	})
	it('moves a root key to a property of another image and clears the evicted properties', () => {
		expect(
			metas(
				renderHead({
					title: 'Root transition',
					meta: [
						{ key: 'shared', property: 'og:image', content: '/old.png' },
						{ key: 'old-alt', property: 'og:image:alt', content: 'old' },
						{ property: 'og:image', content: '/new.png' },
						{ key: 'shared', property: 'og:image:width', content: 600 },
						{ key: 'old-alt', property: 'og:image:alt', content: 'new' }
					]
				})
			)
		).toEqual([
			'<meta property="og:image" content="/new.png">',
			'<meta property="og:image:width" content="600">',
			'<meta property="og:image:alt" content="new">'
		])
	})
	it('reuses a keyed ordinary meta slot for a new image group', () => {
		expect(
			metas(
				renderHead({
					title: 'New root',
					meta: [
						{ key: 'shared', name: 'replacement', content: 'old' },
						{ key: 'shared', property: 'og:image', content: '/new.png' },
						{ property: 'og:image:alt', content: 'new' },
						{ key: 'alt', property: 'og:image:width', content: 300 },
						{ key: 'alt', property: 'og:image:width', content: 600 }
					]
				})
			)
		).toEqual([
			'<meta property="og:image" content="/new.png">',
			'<meta property="og:image:alt" content="new">',
			'<meta property="og:image:width" content="600">'
		])
	})
})

describe('reviewed serialization boundaries', () => {
	it('keeps accepted combinations of HTML script-state transitions inside one script', () => {
		const fragments = [
			'<!--',
			'<!-->',
			'<!--->',
			'-->',
			'<script>',
			'<ScRiPt\r>',
			'</SCRIPT>',
			'<scripture>',
			'<!',
			'--',
			'<',
			'>'
		]
		let accepted = 0
		let rejected = 0
		for (const first of fragments)
			for (const second of fragments)
				for (const third of fragments) {
					const input = `${first}${second}${third}`
					let head
					try {
						head = prepareHead({
							title: 'Parser states',
							script: [{ textContent: `/*${input}*/` }]
						})
					} catch (error) {
						expect(String(error)).toContain('HTML parser sequence')
						rejected++
						continue
					}
					const document = parse(
						`<head>${head.html}</head><body><p id="after">after</p></body>`
					)
					function elements(
						node: DefaultTreeAdapterMap['node']
					): DefaultTreeAdapterMap['element'][] {
						return [
							...('tagName' in node ? [node] : []),
							...('childNodes' in node ? node.childNodes.flatMap(elements) : [])
						]
					}
					const nodes = elements(document)
					const scripts = nodes.filter((node) => node.tagName === 'script')
					expect(scripts, input).toHaveLength(1)
					expect(
						scripts[0].childNodes
							.map((node) => ('value' in node ? node.value : ''))
							.join(''),
						input
					).toBe(head.inline[0].content)
					expect(
						nodes.filter((node) => node.tagName === 'p'),
						input
					).toHaveLength(1)
					accepted++
				}
		expect(accepted).toBeGreaterThan(1000)
		expect(rejected).toBeGreaterThan(20)
	})
	it.each(['<!-- closed -->', '<!-->', '<!--->', '<!-- one --> <!-- two -->'])(
		'allows the closed comment %s before an ordinary script string',
		(comment) => {
			const value = `${comment} later <script>`
			const source = `result = ${JSON.stringify(value)};`
			const html = renderHead({
				title: 'Closed comment',
				script: [{ textContent: source }]
			})
			const document = parse(`<head>${html}</head><body><p>after</p></body>`)
			function text(node: DefaultTreeAdapterMap['node']): string[] {
				return [
					...('tagName' in node && node.tagName === 'script'
						? node.childNodes.map((child) =>
								'value' in child ? child.value : ''
							)
						: []),
					...('childNodes' in node ? node.childNodes.flatMap(text) : [])
				]
			}
			const context: { result?: string } = {}
			runInNewContext(text(document).join(''), context)
			expect(context.result).toBe(value)
		}
	)
	it('keeps false CORS absent and distinct from anonymous requests', () => {
		const html = renderHead({
			title: 'CORS false',
			link: [
				{ rel: 'preload', href: '/app.js', as: 'script' },
				{ rel: 'preload', href: '/app.js', as: 'script', crossorigin: false },
				{ rel: 'preload', href: '/app.js', as: 'script', crossorigin: '' }
			]
		})
		expect(html.match(/<link /g)).toHaveLength(2)
		expect(html.match(/crossorigin=/g)).toHaveLength(1)
		expect(html).not.toContain('crossorigin="false"')
		expect(
			validateHeadItems(
				{
					title: 'SRI false',
					script: [
						{
							src: 'https://cdn.example.test/app.js',
							integrity: 'sha256-example',
							crossorigin: false
						}
					]
				},
				{ requireDescription: false }
			)
		).toEqual([expect.objectContaining({ code: 'sri-missing-crossorigin' })])
	})
	it('keeps false omission for hidden without losing false data values', () => {
		const html = renderHead({
			title: 'Attributes',
			meta: [
				{
					name: 'flag',
					content: false,
					hidden: false,
					'data-flag': false,
					'aria-hidden': false
				}
			]
		})
		expect(html).toContain(
			'content="false" data-flag="false" aria-hidden="false"'
		)
		expect(html).not.toContain(' hidden=')
	})
	it('deduplicates implicit and explicit script module destinations', () => {
		const html = renderHead({
			title: 'Modules',
			link: [
				{ rel: 'modulepreload', href: '/app.js' },
				{
					rel: 'modulepreload',
					href: '/app.js',
					as: 'script',
					crossorigin: 'anonymous'
				}
			]
		})
		expect(html.match(/<link /g)).toHaveLength(1)
	})
})
