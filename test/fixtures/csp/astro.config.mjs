import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'astro/config'

export default defineConfig({
	site: 'https://site.example.test',
	security: { csp: true },
	vite: {
		resolve: {
			alias: {
				'astro-helmet': fileURLToPath(
					new URL('../../../index.ts', import.meta.url)
				)
			}
		}
	}
})
