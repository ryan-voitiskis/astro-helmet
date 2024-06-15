/** @type {import("prettier").Config} */
export default {
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	tabWidth: 2,
	semi: false,
	plugins: ['prettier-plugin-astro'],
	overrides: [
		{
			files: '*.astro',
			options: {
				parser: 'astro',
				astroAllowShorthand: true
			}
		},
		{
			files: 'README.md',
			options: {
				// tabs are 8 spaces on GitHub, this give us a sensible indent on README
				useTabs: false,
				tabWidth: 2
			}
		}
	]
}
