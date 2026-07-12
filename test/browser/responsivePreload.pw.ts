import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

import { expect, test } from '@playwright/test'

import { preloadImage, renderHead } from '../../src/main'

const transparentPng = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
	'base64'
)

test('reuses a matching href-less density preload at DPR 1', async ({
	page
}) => {
	const requests = new Map<string, number>()
	const server = createServer((request, response) => {
		const path = new URL(request.url || '/', 'http://localhost').pathname
		requests.set(path, (requests.get(path) || 0) + 1)

		if (path.endsWith('.png')) {
			response.writeHead(200, {
				'Cache-Control': 'public, max-age=3600',
				'Content-Type': 'image/png'
			})
			response.end(transparentPng)
			return
		}

		const head = renderHead({
			title: 'Responsive preload reuse',
			link: [
				preloadImage({
					imagesrcset: '/hero.png 1x, /hero@2x.png 2x',
					fetchpriority: 'high'
				})
			]
		})
		response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
		response.end(`<!doctype html>
			<html>
				<head>${head}</head>
				<body>
					<img id="hero" src="/hero.png" srcset="/hero.png 1x, /hero@2x.png 2x" alt="">
				</body>
			</html>`)
	})

	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
	const { port } = server.address() as AddressInfo

	try {
		await page.goto(`http://127.0.0.1:${port}/`)
		await expect(page.locator('#hero')).toHaveJSProperty('complete', true)
		expect(
			await page
				.locator('#hero')
				.evaluate((image: HTMLImageElement) => image.currentSrc)
		).toBe(`http://127.0.0.1:${port}/hero.png`)
		expect(requests.get('/hero.png')).toBe(1)
		expect(requests.get('/hero@2x.png') || 0).toBe(0)
	} finally {
		await new Promise<void>((resolve, reject) =>
			server.close((error) => (error ? reject(error) : resolve()))
		)
	}
})
