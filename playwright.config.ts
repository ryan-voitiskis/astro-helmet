import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './test/browser',
	testMatch: '**/*.pw.ts',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: 'line',
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'], deviceScaleFactor: 1 }
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'], deviceScaleFactor: 1 }
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'], deviceScaleFactor: 1 }
		}
	]
})
