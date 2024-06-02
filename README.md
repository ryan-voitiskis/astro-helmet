# astro-helmet

`astro-helmet` is currently not fully tested. It is not recommended for production use at this time. Please use with caution and report any issues you encounter.

`astro-helmet` is a utility for managing the document head of Astro projects. It allows you to define any head tags you need and render them to a string that can be included in your Astro layout. Head tags defined in layouts, pages and components can be easily merged and prioritised to ensure the correct order in the final document.

## Installation

Install `astro-helmet` using npm:

```bash
npm install astro-helmet
```

## Usage

To use `astro-helmet`, you need to import the `Helmet` component and use it in your Astro project. Here's an example:

```ts
import { renderHead, type HeadItems } from 'astro-helmet'

// Define your head items
const headItems: HeadItems = {
	title: 'Your Page Title',
	meta: [
		{ charset: 'UTF-8' },
		{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
		{ property: 'og:title', content: 'Your Page Title' }
	],
	link: [
		{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
		{ rel: 'stylesheet', href: '/styles/main.css' }
	],
	script: [{ src: '/scripts/main.js', defer: true }]
}

// Call the render function to create the HTML string for the the head items
const head = renderHead([headItems])
```

Then add the rendered `head` string to your Astro layout:

```astro
<!doctype html>
<html lang="en">
	<head>
		<Fragment set:html={head} />
	</head>
	<body>
  ...
```

## Features

### Priority Handling

`astro-helmet` will order head items based on their priority. By default, items are ordered as follows:

| priority | item                                          |
| -------- | --------------------------------------------- |
| \-3      | `<meta charset="">`                           |
| \-2      | `<meta name="viewport">`                      |
| \-1      | `<meta http-equiv="">`                        |
| 0        | `<title>`                                     |
| 10       | `<link rel="preconnect" />`                   |
| 20       | `<script src="" async></script>`              |
| 30       | `<style>` where innerHTML.includes('@import') |
| 40       | `<script>`                                    |
| 50       | `<link rel="stylesheet" />`                   |
| 60       | `<link rel="preload" />`                      |
| 70       | `<script src="" defer></script>`              |
| 80       | `<link rel="prefetch" />`                     |
| 90       | remaining `<link>`                            |
| 100      | remaining `<meta>`                            |
| 110      | anything else                                 |

Control the order of head elements by adding `priority: number` to a head item.

#### Usage

```ts
const headItems: HeadItems = {
	// priority 1 will move the script to just below the <title>
	script: [{ src: '/scripts/importantScript.js', defer: true, priority: 1 }]
}
```

### Defaults

Default charset and viewport meta tags are included by default.

```ts
const DEFAULT_CHARSET = { charset: 'UTF-8' }
const DEFAULT_VIEWPORT = {
	name: 'viewport',
	content: 'width=device-width, initial-scale=1'
}
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request with your improvements.

## License

This project is licensed under the ISC License.
