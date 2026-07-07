import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const rootDir = fileURLToPath(new URL('..', import.meta.url))
const fixtureDir = fileURLToPath(new URL('fixtures/astro-v7/', import.meta.url))
const astroBin = join(rootDir, 'node_modules/astro/bin/astro.mjs')
const fixtureAstroDir = join(fixtureDir, '.astro')
const fixtureNodeModulesDir = join(fixtureDir, 'node_modules')

function sha256CspHash(content: string): string {
	return `sha256-${createHash('sha256').update(content).digest('base64')}`
}

describe('Astro 7 build fixture', () => {
	it('renders Helmet output and registers CSP resources during build', async () => {
		const fixtureDist = await mkdtemp(join(tmpdir(), 'astro-helmet-v7-'))
		await rm(fixtureAstroDir, { recursive: true, force: true })
		await rm(fixtureNodeModulesDir, { recursive: true, force: true })

		try {
			await execFileAsync(
				process.execPath,
				[astroBin, 'build', '--force', '--outDir', fixtureDist],
				{
					cwd: fixtureDir,
					env: {
						...process.env,
						ASTRO_TELEMETRY_DISABLED: '1'
					},
					maxBuffer: 1024 * 1024,
					timeout: 60_000
				}
			)

			const html = await readFile(join(fixtureDist, 'index.html'), 'utf8')
			const inlineScript = 'window.__helmetFixture = true;'
			const inlineStyle = '.fixture-title { color: rebeccapurple; }'
			const jsonLd =
				'{"@type":"WebSite","name":"Fixture <\\/script>","@context":"https://schema.org"}'

			expect(html).toContain('<title>Astro Helmet Fixture</title>')
			expect(html).toContain(
				'<meta name="description" content="Astro 7 fixture page">'
			)
			expect(html).toContain(
				'<meta property="og:url" content="https://example.com/fixture">'
			)
			expect(html).toContain(
				'<meta property="og:image" content="https://cdn.example.com/fixture.jpg">'
			)
			expect(html).toContain(`<style>${inlineStyle}</style>`)
			expect(html).toContain(`<script>${inlineScript}</script>`)
			expect(html).toContain(
				`<script type="application/ld+json">${jsonLd}</script>`
			)
			expect(html).toContain('http-equiv="content-security-policy"')

			for (const renderedResource of [
				'https://cdn.example.com/site.css',
				'https://cdn.example.com/critical.css',
				'https://cdn.example.com/runtime.js',
				'https://cdn.example.com/app.js',
				'https://cdn.example.com/module.js'
			]) {
				expect(html).toContain(renderedResource)
			}

			const cspContent = html.match(
				/<meta http-equiv="content-security-policy" content="([^"]+)"/
			)?.[1]
			expect(cspContent).toContain('script-src https://cdn.example.com')
			expect(cspContent).toContain('style-src https://cdn.example.com')
			expect(cspContent).not.toContain('https://cdn.example.com/runtime.js')
			expect(cspContent).not.toContain('https://cdn.example.com/site.css')
			expect(cspContent).not.toContain('https://cdn.example.com/module.js')

			for (const hash of [
				sha256CspHash(inlineStyle),
				sha256CspHash(inlineScript),
				sha256CspHash(jsonLd)
			]) {
				expect(html).toContain(hash)
			}
		} finally {
			await rm(fixtureDist, { recursive: true, force: true })
			await rm(fixtureAstroDir, { recursive: true, force: true })
			await rm(fixtureNodeModulesDir, { recursive: true, force: true })
		}
	})
})
