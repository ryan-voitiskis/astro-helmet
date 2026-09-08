import { describe, expect, it } from 'vitest'
import {
	validateHeadItems,
	type HeadItems,
	type HeadValidationOptions
} from '../src/main'

const cdn = 'https://cdn.example.com/assets/'
function resource(
	tag: 'script' | 'link',
	src: string,
	integrity?: string
): HeadItems {
	const attributes = integrity ? { integrity } : {}
	return {
		title: 'Origin checks',
		base: [{ href: cdn }],
		...(tag === 'script'
			? { script: [{ src, ...attributes }] }
			: { link: [{ rel: 'stylesheet', href: src, ...attributes }] })
	}
}

describe('SRI document origins independent of resource bases', () => {
	for (const tag of ['script', 'link'] as const) {
		for (const integrity of [undefined, 'sha384-example']) {
			it.each([
				'https://cdn.example.com/assets/app.js',
				'//cdn.example.com/assets/app.js',
				'app.js'
			])(
				`checks ${tag} %s without an assumed document origin (integrity: ${!!integrity})`,
				(src) => {
					expect(
						validateHeadItems(resource(tag, src, integrity), {
							requireSri: true,
							requireDescription: false
						})
					).toEqual([
						expect.objectContaining({
							code: integrity ? 'sri-missing-crossorigin' : 'missing-sri',
							tagName: tag
						})
					])
				}
			)
		}
		it.each<HeadValidationOptions>([
			{ documentUrl: 'https://cdn.example.com/page' },
			{ baseUrl: 'https://cdn.example.com/page' }
		])(
			`preserves an explicit same-origin document for ${tag}: %j`,
			(origin) => {
				expect(
					validateHeadItems(resource(tag, 'app.js'), {
						...origin,
						requireSri: true,
						requireDescription: false
					})
				).toEqual([])
			}
		)
		it(`keeps missing-integrity checking opt-in for ${tag}`, () => {
			expect(
				validateHeadItems(resource(tag, 'app.js'), {
					requireDescription: false
				})
			).toEqual([])
		})
		it(`checks existing ${tag} integrity without requiring the missing-integrity option`, () => {
			expect(
				validateHeadItems(resource(tag, 'app.js', 'sha384-example'), {
					requireDescription: false
				})
			).toEqual([expect.objectContaining({ code: 'sri-missing-crossorigin' })])
		})
	}
})
