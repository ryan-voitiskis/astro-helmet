import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { expect, test } from '@playwright/test'
import { parse, type DefaultTreeAdapterMap } from 'parse5'

const execFileAsync = promisify(execFile)
const root = fileURLToPath(new URL('../../', import.meta.url))
const fixture = join(root, 'test/fixtures/csp')
let output: string
let server: Server
let origin: string

function policy(node: DefaultTreeAdapterMap['node']): string | undefined {
	if (
		'tagName' in node &&
		node.tagName === 'meta' &&
		node.attrs.some(
			(attr) =>
				attr.name === 'http-equiv' &&
				attr.value.toLowerCase() === 'content-security-policy'
		)
	) {
		return node.attrs.find((attr) => attr.name === 'content')?.value
	}
	if ('childNodes' in node) {
		for (const child of node.childNodes) {
			const value = policy(child)
			if (value) return value
		}
	}
}

test.beforeAll(async () => {
	test.setTimeout(90_000)
	output = await mkdtemp(join(tmpdir(), 'helmet-csp-browser-'))
	await execFileAsync(
		process.execPath,
		[
			join(root, 'node_modules/astro/bin/astro.mjs'),
			'build',
			'--outDir',
			output
		],
		{
			cwd: fixture,
			env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
			timeout: 60_000
		}
	)
	const pages = new Map<string, { html: string; csp: string }>()
	for (const name of ['', 'base/', 'manual-base/', 'malformed-base/']) {
		const html = await readFile(join(output, name, 'index.html'), 'utf8')
		const csp = policy(parse(html))
		expect(csp, `generated policy for ${name || '/'}`).toBeTruthy()
		pages.set(`/${name}`, { html, csp: csp! })
	}
	server = createServer((request, response) => {
		const page = pages.get(request.url || '/')
		if (!page) {
			response.writeHead(404).end()
			return
		}
		// Enforce the actual generated policy from the start of parsing. Astro's
		// static meta placement alone does not govern preceding head resources.
		response.writeHead(200, {
			'Content-Type': 'text/html; charset=utf-8',
			'Content-Security-Policy': page.csp
		})
		response.end(page.html)
	})
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
	origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

test.afterAll(async () => {
	if (server)
		await new Promise<void>((resolve, reject) =>
			server.close((error) => (error ? reject(error) : resolve()))
		)
	if (output) await rm(output, { recursive: true, force: true })
})

test('generated CSP authorizes normalized final content and blocks unauthorized code', async ({
	page
}) => {
	await page.route('https://assets.example.test/app.js', (route) =>
		route.fulfill({
			contentType: 'text/javascript',
			headers: { 'Access-Control-Allow-Origin': '*' },
			body: 'window.__external = true;'
		})
	)
	await page.goto(origin)
	await expect(page.locator('#after')).toHaveText('AFTER')
	expect(
		await page.evaluate(() => ({
			boot: Reflect.get(window, '__boot'),
			transformed: Reflect.get(window, '__transformed'),
			external: Reflect.get(window, '__external'),
			closing: Reflect.get(window, '__closingTag'),
			closedComment: Reflect.get(window, '__closedComment'),
			original: Reflect.has(window, '__original'),
			superseded: Reflect.has(window, '__superseded'),
			unauthorized: Reflect.has(window, '__unauthorized'),
			unauthorizedHead: Reflect.has(window, '__unauthorizedHead')
		}))
	).toEqual({
		boot: true,
		transformed: true,
		external: true,
		closing: '</SCRIPT>',
		closedComment: '<!-- closed --> later <script>',
		original: false,
		superseded: false,
		unauthorized: false,
		unauthorizedHead: false
	})
	await expect(page.locator('body')).toHaveCSS('color', 'rgb(1, 2, 3)')
	const json = await page
		.locator('script[type="application/ld+json"]')
		.textContent()
	expect(JSON.parse(json!)).toMatchObject({ name: '</script><!--<script\r>' })
})

test('rendered SRI rejects modified external script bytes', async ({
	page
}) => {
	await page.route('https://assets.example.test/app.js', (route) =>
		route.fulfill({
			contentType: 'text/javascript',
			headers: { 'Access-Control-Allow-Origin': '*' },
			body: 'window.__external = "tampered";'
		})
	)
	await page.goto(origin)
	expect(await page.evaluate(() => Reflect.has(window, '__external'))).toBe(
		false
	)
	expect(await page.evaluate(() => Reflect.get(window, '__boot'))).toBe(true)
})

test('a malformed base preserves independent CSP resources and the standard fallback', async ({
	page
}) => {
	await page.route('https://assets.example.test/absolute.js', (route) =>
		route.fulfill({
			contentType: 'text/javascript',
			body: 'window.__absoluteBase = true;'
		})
	)
	await page.route(`${origin}/fallback.js`, (route) =>
		route.fulfill({
			contentType: 'text/javascript',
			body: 'window.__fallbackBase = true;'
		})
	)
	const response = await page.goto(`${origin}/malformed-base/`)
	expect(response!.headers()['content-security-policy']).toContain("'self'")
	const state = await page.evaluate(() => ({
		absolute: Reflect.get(window, '__absoluteBase'),
		fallback: Reflect.get(window, '__fallbackBase'),
		data: Reflect.get(window, '__dataBase'),
		base: document.baseURI
	}))
	// Chromium currently uses about:blank for this malformed base and cannot
	// resolve relative requests. Firefox/WebKit follow HTML's document fallback.
	expect([`${origin}/malformed-base/`, 'about:blank']).toContain(state.base)
	expect(state).toEqual({
		absolute: true,
		fallback: state.base === 'about:blank' ? undefined : true,
		data: true,
		base: state.base
	})
})

for (const path of ['base', 'manual-base']) {
	test(`registers external resources using the ${path} URL`, async ({
		page
	}) => {
		await page.route('https://assets.example.test/assets/base.js', (route) =>
			route.fulfill({
				contentType: 'text/javascript',
				body: 'window.__base = true;'
			})
		)
		await page.route('https://assets.example.test/base.css', (route) =>
			route.fulfill({
				contentType: 'text/css',
				body: 'body { color: rgb(4, 5, 6); }'
			})
		)
		await page.goto(`${origin}/${path}/`)
		expect(await page.evaluate(() => Reflect.get(window, '__base'))).toBe(true)
		await expect(page.locator('body')).toHaveCSS('color', 'rgb(4, 5, 6)')
	})
}
