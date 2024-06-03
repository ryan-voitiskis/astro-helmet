import { renderAttrs } from './index'
import { describe, it, expect } from 'vitest'

const testCases = [
	{
		description: 'Preload a font with standard attributes',
		attributes: {
			rel: 'preload',
			as: 'font',
			type: 'font/woff2',
			crossorigin: 'anonymous',
			href: '/fonts/InterVariable.woff2'
		},
		expected:
			'rel="preload" as="font" type="font/woff2" crossorigin="anonymous" href="/fonts/InterVariable.woff2"'
	},
	{
		description: 'Link a stylesheet with standard attributes',
		attributes: {
			rel: 'stylesheet',
			href: '/css/styles.css'
		},
		expected: 'rel="stylesheet" href="/css/styles.css"'
	},
	{
		description: "Preload font with missing 'as' attribute",
		attributes: {
			rel: 'preload',
			type: 'font/woff2',
			crossorigin: 'anonymous',
			href: '/fonts/InterVariable.woff2'
		},
		expected:
			'rel="preload" type="font/woff2" crossorigin="anonymous" href="/fonts/InterVariable.woff2"'
	},
	{
		description: 'Use non-standard rel attribute',
		attributes: {
			rel: 'data',
			href: '/data/config.json'
		},
		expected: 'rel="data" href="/data/config.json"'
	},
	{
		description: 'Link tag with invalid type attribute for CSS',
		attributes: {
			rel: 'stylesheet',
			type: 'text/plain',
			href: '/css/styles.css'
		},
		expected: 'rel="stylesheet" type="text/plain" href="/css/styles.css"'
	},
	{
		description: 'Attributes with boolean values',
		attributes: {
			async: true,
			defer: false,
			src: '/js/script.js'
		},
		expected: 'async src="/js/script.js"'
	},
	{
		description: 'Attributes with special characters',
		attributes: {
			'data-test': 'value with spaces',
			'data-test2': 'value with "quotes"',
			src: '/js/script.js'
		},
		expected:
			'data-test="value with spaces" data-test2="value with &quot;quotes&quot;" src="/js/script.js"'
	},
	{
		description: 'Attributes with empty values',
		attributes: {
			rel: '',
			href: '/css/styles.css'
		},
		expected: 'rel="" href="/css/styles.css"'
	},
	{
		description: 'Attributes with undefined values',
		attributes: {
			rel: undefined,
			href: '/css/styles.css'
		},
		expected: 'href="/css/styles.css"'
	},
	{
		description: 'Attributes with null values',
		attributes: {
			rel: null,
			href: '/css/styles.css'
		},
		expected: 'href="/css/styles.css"'
	},
	{
		description: 'Attributes with number values',
		attributes: {
			width: 100,
			height: 200,
			src: '/img/image.jpg'
		},
		expected: 'width="100" height="200" src="/img/image.jpg"'
	}
]

describe('renderAttrs', () => {
	testCases.forEach(({ description, attributes, expected }) => {
		it(description, () => {
			expect(renderAttrs(attributes)).toEqual(expected)
		})
	})
})
