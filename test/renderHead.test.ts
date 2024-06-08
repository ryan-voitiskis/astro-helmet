import { renderHead, type HeadItems } from '../src/main'
import { describe, it, expect } from 'vitest'

// TODO: don't use array
// TODO: add test for missing title tag
// TODO: add test for deduplicateMetaItems
// TODO: add test for multiple titles specified

type TestCase = {
	description: string
	params: HeadItems[]
	expected: string
}

const testCases: TestCase[] = [
	{
		description: 'Render head with minimal content',
		params: [
			{
				title: 'My Site Title'
			}
		],
		expected: `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>`
	},
	{
		description: 'Render head with base tag',
		params: [
			{
				title: 'My Site Title',
				base: [{ href: 'https://example.com' }]
			}
		],
		expected: `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="https://example.com">
<title>My Site Title</title>`
	},
	{
		description: 'Render head with meta tags',
		params: [
			{
				title: 'My Site Title',
				meta: [{ name: 'description', content: 'My site description' }]
			}
		],
		expected: `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>
<meta name="description" content="My site description">`
	},
	{
		description: 'Render head with link tags',
		params: [
			{
				title: 'My Site Title',
				link: [{ rel: 'stylesheet', href: 'styles.css' }]
			}
		],
		expected: `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>
<link rel="stylesheet" href="styles.css">`
	},
	{
		description: 'Render head with style tags',
		params: [
			{
				title: 'My Site Title',
				style: [{ innerHTML: 'body { color: red; }' }]
			}
		],
		expected: `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>
<style>body { color: red; }</style>`
	},
	{
		description: 'Render head with script tags',
		params: [
			{
				title: 'My Site Title',
				script: [{ innerHTML: 'console.log("Hello, world!")' }]
			}
		],
		expected: `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>
<script>console.log("Hello, world!")</script>`
	},
	{
		description: 'Render head with noscript tags',
		params: [
			{
				title: 'My Site Title',
				noscript: [{ innerHTML: 'Please enable JavaScript' }]
			}
		],
		expected: `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My Site Title</title>
<noscript>Please enable JavaScript</noscript>`
	},
	{
		description: 'Render head with all tags',
		params: [
			{
				title: 'My Site Title',
				base: [{ href: 'https://example.com' }],
				meta: [{ name: 'description', content: 'My site description' }],
				link: [{ rel: 'stylesheet', href: 'styles.css' }],
				style: [{ innerHTML: 'body { color: red; }' }],
				script: [{ innerHTML: 'console.log("Hello, world!")' }],
				noscript: [{ innerHTML: 'Please enable JavaScript' }]
			}
		],
		expected: `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="https://example.com">
<title>My Site Title</title>
<script>console.log("Hello, world!")</script>
<link rel="stylesheet" href="styles.css">
<style>body { color: red; }</style>
<meta name="description" content="My site description">
<noscript>Please enable JavaScript</noscript>`
	}
]

describe('renderHead', () => {
	testCases.forEach(({ description, params, expected }) => {
		it(description, () => {
			expect(renderHead(params)).toEqual(expected)
		})
	})
})
