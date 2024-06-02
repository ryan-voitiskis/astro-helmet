# astro-helmet

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
	link: [{ rel: 'stylesheet', href: '/styles/main.css' }],
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

- **Dynamic Head Management**: Easily manage and update your document's head tags.
- **Priority Handling**: Control the order of head elements with priority settings.
- **Extensible**: Add custom tags and attributes as needed.
- **Defaults**: Default charset and viewport meta tags are included by default.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request with your improvements.

## License

This project is licensed under the ISC License.
