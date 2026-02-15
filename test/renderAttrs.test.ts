import { renderAttrs } from '../src/main'
import { describe, it, expect } from 'vitest'

describe('renderAttrs', () => {
	it('Filters priority, tagName and innerHTML attributes', () => {
		const attributes = {
			priority: 3,
			tagName: 'div',
			innerHTML: 'Hello, world!',
			id: 'main'
		}
		const expected = 'id="main"'
		expect(renderAttrs(attributes)).toEqual(expected)
	})

	it('Preload a font with standard attributes', () => {
		const attributes = {
			rel: 'preload',
			as: 'font',
			type: 'font/woff2',
			crossorigin: 'anonymous',
			href: '/fonts/InterVariable.woff2'
		}
		const expected =
			'rel="preload" as="font" type="font/woff2" crossorigin="anonymous" href="/fonts/InterVariable.woff2"'
		expect(renderAttrs(attributes)).toEqual(expected)
	})

	it('Link a stylesheet with standard attributes', () => {
		const attributes = {
			rel: 'stylesheet',
			href: '/css/styles.css'
		}
		const expected = 'rel="stylesheet" href="/css/styles.css"'
		expect(renderAttrs(attributes)).toEqual(expected)
	})

	it("Preload font with missing 'as' attribute", () => {
		const attributes = {
			rel: 'preload',
			type: 'font/woff2',
			crossorigin: 'anonymous',
			href: '/fonts/InterVariable.woff2'
		}
		const expected =
			'rel="preload" type="font/woff2" crossorigin="anonymous" href="/fonts/InterVariable.woff2"'
		expect(renderAttrs(attributes)).toEqual(expected)
	})

	it('Use non-standard rel attribute', () => {
		const attributes = {
			rel: 'data',
			href: '/data/config.json'
		}
		const expected = 'rel="data" href="/data/config.json"'
		expect(renderAttrs(attributes)).toEqual(expected)
	})

	it('Link tag with invalid type attribute for CSS', () => {
		const attributes = {
			rel: 'stylesheet',
			type: 'text/plain',
			href: '/css/styles.css'
		}
		const expected = 'rel="stylesheet" type="text/plain" href="/css/styles.css"'
		expect(renderAttrs(attributes)).toEqual(expected)
	})

	it('Attributes with boolean values', () => {
		const attributes = {
			async: true,
			defer: false,
			src: '/js/script.js'
		}
		const expected = 'async src="/js/script.js"'
		expect(renderAttrs(attributes)).toEqual(expected)
	})

	it('Attributes with special characters', () => {
		const attributes = {
			'data-test': 'value with spaces',
			'data-test2': 'value with "quotes"',
			src: '/js/script.js'
		}
		const expected =
			'data-test="value with spaces" data-test2="value with &quot;quotes&quot;" src="/js/script.js"'
		expect(renderAttrs(attributes)).toEqual(expected)
	})

	it('Attributes with empty values', () => {
		const attributes = {
			rel: '',
			href: '/css/styles.css'
		}
		const expected = 'rel="" href="/css/styles.css"'
		expect(renderAttrs(attributes)).toEqual(expected)
	})

	it('Attributes with undefined values', () => {
		const attributes = {
			rel: undefined,
			href: '/css/styles.css'
		}
		const expected = 'href="/css/styles.css"'
		expect(renderAttrs(attributes)).toEqual(expected)
	})

	it('Attributes with null values', () => {
		const attributes = {
			rel: null,
			href: '/css/styles.css'
		}
		const expected = 'href="/css/styles.css"'
		expect(renderAttrs(attributes)).toEqual(expected)
	})

	it('Attributes with number values', () => {
		const attributes = {
			width: 100,
			height: 200,
			src: '/img/image.jpg'
		}
		const expected = 'width="100" height="200" src="/img/image.jpg"'
		expect(renderAttrs(attributes)).toEqual(expected)
	})

	it('Ampersand in attribute value is escaped', () => {
		const attributes = { content: 'a&b' }
		expect(renderAttrs(attributes)).toEqual('content="a&amp;b"')
	})

	it('Angle brackets in attribute value are escaped', () => {
		const attributes = { content: 'a<b>c' }
		expect(renderAttrs(attributes)).toEqual('content="a&lt;b&gt;c"')
	})

	it('No attributes', () => {
		const attributes = {}
		const expected = ''
		expect(renderAttrs(attributes)).toEqual(expected)
	})
})
