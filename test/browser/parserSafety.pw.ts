import { expect, test } from '@playwright/test'

import { renderHead } from '../../src/main'

const parserPayloads = [
	'</script><script>alert(1)</script>',
	'</SCRIPT>',
	'<!--<script>',
	'prefix <!-- middle <script> suffix',
	'<tag attr="value">& text',
	'line separator:   paragraph separator:  '
]

test('JSON-LD round-trips without changing browser document structure', async ({
	page
}) => {
	for (const payload of parserPayloads) {
		const head = renderHead({
			title: 'Browser parser safety',
			jsonLd: { '@type': 'Thing', name: payload }
		})

		await page.setContent(
			`<!doctype html><html><head>${head}</head><body><p id="after">AFTER</p></body></html>`
		)

		await expect(page.locator('#after')).toHaveText('AFTER')
		await expect(
			page.locator('script[type="application/ld+json"]')
		).toHaveCount(1)
		const jsonLd = await page
			.locator('script[type="application/ld+json"]')
			.textContent()
		expect(JSON.parse(jsonLd || '')).toMatchObject({
			'@type': 'Thing',
			name: payload,
			'@context': 'https://schema.org'
		})
	}
})
