import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { expect, test } from '@playwright/test'
import { renderHead } from '../../src/main'

const png = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
	'base64'
)

test('preserves distinct image CORS modes without redundant consumption requests', async ({
	page,
	browserName
}) => {
	let requests = 0
	const modes: (string | undefined)[] = []
	const assets = createServer((_request, response) => {
		requests++
		modes.push(_request.headers['sec-fetch-mode'] as string | undefined)
		response.writeHead(200, {
			'Content-Type': 'image/png',
			'Cache-Control': 'no-store',
			'Access-Control-Allow-Origin': '*'
		})
		response.end(png)
	})
	await new Promise<void>((resolve) => assets.listen(0, '127.0.0.1', resolve))
	const assetUrl = `http://127.0.0.1:${(assets.address() as AddressInfo).port}/image.png`
	const server = createServer((_request, response) => {
		response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
		response.end(
			`<!doctype html><html><head>${renderHead({
				title: 'CORS preloads',
				link: [
					{ rel: 'preload', as: 'image', href: assetUrl },
					{ rel: 'preload', as: 'image', href: assetUrl, crossorigin: '' }
				]
			})}</head><body></body></html>`
		)
	})
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
	try {
		await page.goto(
			`http://127.0.0.1:${(server.address() as AddressInfo).port}/`
		)
		await expect(page.locator('link[rel="preload"]')).toHaveCount(2)
		// Chromium preloads only the first image for a URL even when both modes
		// are present; Firefox and WebKit fetch and reuse both preloads. The DOM
		// must retain both hints regardless of the browser's preload strategy.
		await expect.poll(() => requests).toBe(browserName === 'chromium' ? 1 : 2)
		await page.evaluate(async (src) => {
			await Promise.all(
				[false, true].map(
					(cors) =>
						new Promise<void>((resolve, reject) => {
							const image = new Image()
							if (cors) image.crossOrigin = 'anonymous'
							image.onload = () => resolve()
							image.onerror = () => reject(new Error('Image did not load'))
							image.src = src
							document.body.append(image)
						})
				)
			)
		}, assetUrl)
		expect(requests).toBe(2)
		expect(modes.sort()).toEqual(['cors', 'no-cors'])
	} finally {
		await Promise.all(
			[server, assets].map(
				(listener) =>
					new Promise<void>((resolve, reject) =>
						listener.close((error) => (error ? reject(error) : resolve()))
					)
			)
		)
	}
})
