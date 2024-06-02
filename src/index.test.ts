import { describe, it, expect } from 'vitest'
import { renderHead, renderAttrs, HeadItems } from './index'

describe('renderHead', () => {
	it('should render the head tags in the correct order', () => {
		const headItems: HeadItems[] = [
			{
				title: 'My Page',
				meta: [{ name: 'description', content: 'My page description' }],
				link: [{ rel: 'stylesheet', href: '/styles.css' }],
				script: [{ src: '/script.js' }]
			}
		]

		const expectedOutput = `<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>My Page</title>
<script src="/script.js"></script>
<link rel="stylesheet" href="/styles.css" />
<meta name="description" content="My page description" />`

		console.log(renderHead(headItems))

		expect(renderHead(headItems)).toEqual(expectedOutput)
	})

	it('should throw an error if no title is provided', () => {
		const headItems: HeadItems[] = [
			{
				meta: [{ name: 'description', content: 'My page description' }]
			}
		]

		expect(() => renderHead(headItems)).toThrowError('Missing title tag.')
	})

	it('should deduplicate meta tags', () => {
		const headItems: HeadItems[] = [
			{
				title: 'My Page',
				meta: [
					{ name: 'description', content: 'My page description' },
					{ name: 'description', content: 'Duplicate description' }
				]
			}
		]

		const expectedOutput = `<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>My Page</title>
<meta name="description" content="Duplicate description" />`

		expect(renderHead(headItems)).toEqual(expectedOutput)
	})
})

describe('renderAttrs', () => {
	it('should render boolean attributes correctly', () => {
		const item = { async: true, src: '/script.js' }
		expect(renderAttrs(item)).toEqual('async src="/script.js"')
	})

	it('should filter out invalid attributes', () => {
		const item = {
			innerHTML: '<p>Hello</p>',
			priority: 1,
			tagName: 'script',
			src: '/script.js'
		}
		expect(renderAttrs(item)).toEqual('src="/script.js"')
	})
})
