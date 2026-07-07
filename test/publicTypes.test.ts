import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const execFileAsync = promisify(execFile)
const tscBin = fileURLToPath(
	new URL('../node_modules/typescript/bin/tsc', import.meta.url)
)

function parseNamedRuntimeExports(source: string): string[] {
	const match = source.match(/export\s*\{([\s\S]*?)\}\s*from\s*'\.\/src\/main'/)
	if (!match) return []
	return match[1]
		.split(',')
		.map((name) => name.trim())
		.filter(Boolean)
}

function parseNamedTypeExports(source: string): string[] {
	const match = source.match(
		/export\s+type\s*\{([\s\S]*?)\}\s*from\s*'\.\/src\/main'/
	)
	if (!match) return []
	return match[1]
		.split(',')
		.map((name) => name.trim())
		.filter(Boolean)
}

function hasNamedExport(source: string, exportName: string): boolean {
	const exportBlocks = source.matchAll(/export(?:\s+type)?\s*\{([\s\S]*?)\}/g)
	for (const match of exportBlocks) {
		const names = match[1]
			.split(',')
			.map((name) => name.trim())
			.filter(Boolean)
		if (names.includes(exportName)) return true
	}
	return false
}

describe('public declarations', () => {
	it('Declares every named runtime and type export from the package entrypoint', async () => {
		const [entrypoint, declarations] = await Promise.all([
			readFile(new URL('../index.ts', import.meta.url), 'utf8'),
			readFile(new URL('../index.d.ts', import.meta.url), 'utf8')
		])

		for (const exportName of parseNamedRuntimeExports(entrypoint)) {
			expect(hasNamedExport(declarations, exportName), exportName).toBe(true)
		}

		for (const exportName of parseNamedTypeExports(entrypoint)) {
			expect(hasNamedExport(declarations, exportName), exportName).toBe(true)
		}
	})

	it('Keeps the package root fixture path valid for type parity checks', () => {
		expect(rootDir).toContain('astro-helmet')
	})

	it('Type-checks a small public API consumer against index.d.ts', async () => {
		const tmp = await mkdtemp(join(tmpdir(), 'astro-helmet-types-'))
		try {
			const consumerPath = join(tmp, 'consumer.ts')
			const tsconfigPath = join(tmp, 'tsconfig.json')
			await writeFile(
				consumerPath,
				`
					import {
						createSeoHead,
						preconnect,
						preloadFont,
						preloadImage,
						validateHeadItems,
						type HeadItems,
						type HeadValidationIssue,
						type HelmetOptions
					} from 'astro-helmet'

					const headItems: HeadItems = createSeoHead({
						title: 'Typed consumer',
						description: 'Typed consumer description',
						site: 'https://example.com',
						path: '/typed',
						openGraph: {
							image: {
								url: '/og.jpg',
								alt: 'OG image'
							}
						}
					})
					headItems.link = [
						preconnect('https://cdn.example.com'),
						preloadFont('/Inter.woff2', { type: 'font/woff2' }),
						preloadImage({
							imagesrcset: '/hero-640.jpg 640w, /hero-1280.jpg 1280w',
							imagesizes: '100vw',
							fetchpriority: 'high'
						})
					]
					// @ts-expect-error href-less responsive image preloads need imagesrcset
					preloadImage({ imagesizes: '100vw' })
					const options: HelmetOptions = {
						validate: {
							baseUrl: 'https://example.com',
							requireSri: true
						}
					}
					const validationOptions = typeof options.validate === 'object' ? options.validate : undefined
					const issues: HeadValidationIssue[] = validateHeadItems(headItems, validationOptions)
					void issues
				`
			)
			await writeFile(
				tsconfigPath,
				JSON.stringify({
					compilerOptions: {
						baseUrl: rootDir,
						ignoreDeprecations: '6.0',
						module: 'NodeNext',
						moduleResolution: 'NodeNext',
						noEmit: true,
						paths: {
							'astro-helmet': ['./index.d.ts']
						},
						strict: true,
						target: 'ES2022'
					},
					files: [consumerPath]
				})
			)

			await execFileAsync(process.execPath, [tscBin, '-p', tsconfigPath], {
				cwd: rootDir,
				timeout: 30_000,
				maxBuffer: 1024 * 1024
			})
		} finally {
			await rm(tmp, { recursive: true, force: true })
		}
	})
})
