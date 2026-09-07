import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { log } from 'node:console'
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const astro = process.env.ASTRO_VERSION
const typescript = process.env.TYPESCRIPT_VERSION
assert(
	['4', '5', '6', '7'].includes(astro),
	'Set ASTRO_VERSION to 4, 5, 6, or 7'
)
assert(typescript, 'Set TYPESCRIPT_VERSION')
const scratch = await mkdtemp(join(tmpdir(), `helmet-astro-${astro}-`))
const app = join(scratch, 'consumer')
function run(command, args, cwd = app) {
	return execFileSync(command, args, {
		cwd,
		env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
		encoding: 'utf8',
		maxBuffer: 4 * 1024 * 1024,
		timeout: 180_000
	})
}

try {
	const packed = JSON.parse(
		run('npm', ['pack', '--json', '--pack-destination', scratch], root)
	)[0]
	await mkdir(app)
	await writeFile(
		join(app, 'package.json'),
		JSON.stringify({
			name: 'helmet-consumer-check',
			version: '0.0.0',
			type: 'module',
			private: true
		})
	)
	run('npm', [
		'install',
		'--no-audit',
		'--no-fund',
		`astro@${astro}`,
		`typescript@${typescript}`,
		join(scratch, packed.filename)
	])
	await cp(join(root, 'test/fixtures/consumer'), app, { recursive: true })
	await writeFile(
		join(app, 'astro.config.mjs'),
		`import { defineConfig } from 'astro/config'; export default defineConfig(${Number(astro) >= 6 ? '{ security: { csp: true } }' : '{}'});`
	)
	const astroPackage = JSON.parse(
		await readFile(join(app, 'node_modules/astro/package.json'), 'utf8')
	)
	const build = run(process.execPath, [
		join('node_modules/astro', astroPackage.bin.astro),
		'build'
	])
	assert(
		!/context\.csp|CspNotEnabled|Cannot find module|ERESOLVE/.test(build),
		build
	)
	for (const [module, resolution] of [
		['NodeNext', 'NodeNext'],
		['ESNext', 'Bundler']
	]) {
		run(process.execPath, [
			'node_modules/typescript/bin/tsc',
			'--noEmit',
			'--module',
			module,
			'--moduleResolution',
			resolution,
			'--target',
			'ES2022',
			'--strict',
			'type-import.ts'
		])
	}
	const html = await readFile(join(app, 'dist/index.html'), 'utf8')
	for (const expected of [
		'<title>Cost $&amp; USD | Site</title>',
		'<link rel="canonical" href="https://example.com/fixture">',
		'<meta name="description" content="Packed consumer">',
		'<meta name="robots" content="max-image-preview:large, noindex, nofollow">',
		'<meta name="flag" content="false">',
		'<meta property="og:image" content="https://example.com/page.png">',
		'imagesrcset="/hero.jpg 1x, /hero@2x.jpg 2x"',
		'fetchpriority="high"',
		'rel="modulepreload"',
		'\\u003c!--\\u003cscript>',
		'window.__consumer = "<\\/SCRIPT>";\n',
		'id="after"'
	])
		assert(html.includes(expected), `Astro ${astro} missing ${expected}`)
	assert(!html.includes('stale-layout'), 'Stale image group survived')
	assert(!html.includes('<!--<script>'), 'Unsafe JSON-LD reached HTML')
	assert.equal(
		(html.match(/href="\/both\.png"/g) || []).length,
		2,
		'Distinct CORS preloads were lost'
	)
	if (Number(astro) >= 6) {
		assert(
			html.includes('http-equiv="content-security-policy"'),
			'CSP policy missing'
		)
		const hash = createHash('sha256')
			.update('window.__consumer = "<\\/SCRIPT>";\n')
			.digest('base64')
		assert(
			html.includes(`sha256-${hash}`),
			'CSP hash does not match normalized final script'
		)
	}
	log(
		`PASS: packed consumer, Astro ${astroPackage.version}, Node ${process.version}, TypeScript ${typescript}; build, rendered regressions, CSP hashes, NodeNext and Bundler types`
	)
} finally {
	await rm(scratch, { recursive: true, force: true })
}
