/** @type {import("prettier").Config} */
export default {
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	tabWidth: 2,
	semi: false,
	plugins: ['./node_modules/prettier-plugin-astro'],
	overrides: [
		{
			files: '*.astro',
			options: {
				parser: 'astro',
				astroAllowShorthand: true
			}
		}
	]
}
