# astro-helmet

`astro-helmet` is a utility for managing the document head of Astro projects. It provides an Astro component `Helmet` which accepts an object of head items and renders them in the document head.

## Features

- Render head items in the document head, specified in object(s).
- Merge head items from multiple sources.
- Control the order of head items.
- Include default charset and viewport meta tags.
- Order head items with default or specified priority.
- Meta tag deduplication.
- JSON-LD structured data helper with automatic `@context`, serialization, and escaping.
- Flexible API for adding head items and tag attributes.

## Installation

Install `astro-helmet` using npm:

```bash
npm i astro-helmet
```

## Usage

In your Layout component, import `astro-helmet` and pass an object of `headItems` to the `Helmet` component.

```astro
---
import Helmet from 'astro-helmet'

const headItems = {
  title: 'My Site Title',
  base: [{ href: 'https://example.com' }],
  meta: [
    { name: 'description', content: 'My site description' },
    { property: 'og:type', content: 'website' }
  ],
  link: [{ rel: 'stylesheet', href: 'styles.css' }],
  style: [{ innerHTML: 'body { color: red; }' }],
  script: [{ innerHTML: 'console.log("Hello, world!")' }],
  noscript: [{ innerHTML: 'Please enable JavaScript' }]
}
---

<!doctype html>
<html lang="en">
  <Helmet {headItems} />
  <body> ... </body>
</html>
```

Any attribute can be added to a head item. Simply provide the attribute as a key-value pair in the object.

`'innerHTML', 'priority', 'tagName'` are reserved keys and cannot be used as attributes.

To add content to a tag, use the `innerHTML` key. This will render the content inside the tag.

To control the order of head items, use the `priority` key.

```ts
const headItems: HeadItems = {
  // priority 1 will move the script to just below the <title>
  script: [{ src: '/scripts/importantScript.js', priority: 1 }]
}
```

See `applyPriority()` in the [Options](#options) section for more information on controlling the order of head items.

You can also pass an array of `headItems` to the `Helmet` component:

```astro
---
import Helmet from 'astro-helmet'
import type { HeadItems } from 'astro-helmet'

interface Props {
  headItems: HeadItems
}

const layoutHeadItems: HeadItems = {
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'sitemap', href: '/sitemap-index.xml' }
  ],
  meta: [{ property: 'og:type', content: 'website' }]
}

const { headItems: pageHeadItems } = Astro.props
---

<!doctype html>
<html lang="en">
  <Helmet headItems={[layoutHeadItems, pageHeadItems]} />
  <body> ... </body>
</html>
```

Then in your page components (or elsewhere), you can define additional head items:

```astro
---
import type { HeadItems } from 'astro-helmet'

const headItems: HeadItems = {
  title: 'My Site Title',
  meta: [{ name: 'description', content: 'My site description' }],
  link: [{ rel: 'canonical', href: 'https://example.com' }]
}
---

<Layout {headItems}>
  <main>content</main>
</Layout>
```

### JSON-LD / Structured Data

Use the `jsonLd` property to add [JSON-LD structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) to your pages. `@context` is set to `https://schema.org` automatically, `JSON.stringify()` is handled internally, and `</script>` sequences in values are escaped.

```ts
const headItems: HeadItems = {
  title: 'My Article',
  jsonLd: {
    '@type': 'Article',
    headline: 'My Article',
    author: { '@type': 'Person', name: 'Ryan' },
    datePublished: '2025-12-01'
  }
}
```

Multiple JSON-LD blocks are supported — pass an array:

```ts
const headItems: HeadItems = {
  title: 'My Article',
  jsonLd: [
    { '@type': 'Article', headline: 'My Article' },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://example.com/' },
        { '@type': 'ListItem', position: 2, name: 'My Article' }
      ]
    }
  ]
}
```

JSON-LD composes naturally with layout + page merging. Each source contributes blocks that render as separate `<script type="application/ld+json">` tags:

```ts
// Layout
const layoutHead: HeadItems = {
  jsonLd: { '@type': 'WebSite', name: 'My Blog', url: 'https://example.com' }
}

// Page
const pageHead: HeadItems = {
  title: 'My Article',
  jsonLd: { '@type': 'Article', headline: 'My Article' }
}

// <Helmet headItems={[layoutHead, pageHead]} />
```

JSON-LD script tags are rendered with priority `105`, placing them after regular meta tags and before noscript elements.

### Deduplication

When provided with an array of `headItems`, `astro-helmet` will merge the items together.

`headItems.meta` are deduplicated by `name`, `property` and `http-equiv`.
Meta items later in the array replace earlier items.

`title` and `base` items are also deduplicated, with the last item in the array taking precedence.

### Props

The `Helmet` component takes two props:

```ts
interface Props {
  headItems: HeadItems | HeadItems[]
  options?: {
    omitHeadTags?: boolean
    applyPriority?: (tag: Tag) => Required<Tag>
  }
}
```

### Options

#### `omitHeadTags`

By default, `astro-helmet` will render the <head> opening and closing tags around the head items. If you want it to render only the head items, set `omitHeadTags` to `true`.

```astro
---
import Helmet from 'astro-helmet'

const headItems = { title: 'My Site Title' }
const options = { omitHeadTags: true }
---

<!doctype html>
<html lang="en">
  <head>
    <Helmet {headItems} {options} />
  </head>
  <body> ... </body>
</html>
```

#### `applyPriority()`

The `applyPriority` option allows you to customize the priority of head items. It takes a function that accepts a `Tag` object and returns a `Tag` object with the priority applied.

By default, items are ordered as follows:

| priority | item                                          |
| -------- | --------------------------------------------- |
| \-4      | `<meta charset="">`                           |
| \-3      | `<meta name="viewport">`                      |
| \-2      | `<base href="">`                              |
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
| 105      | `<script type="application/ld+json">`         |
| 110      | anything else                                 |

This is the default implementation of `applyPriority()`:

```ts
function applyPriority(tag: Tag): Required<Tag> {
  if (typeof tag.priority === 'number') return tag as Required<Tag>
  let priority: number
  switch (tag.tagName) {
    case 'title':
      priority = 0
      break

    case 'base':
      priority = -2
      break

    case 'meta':
      if (tag.charset) priority = -4
      else if (tag.name === 'viewport') priority = -3
      else if (tag['http-equiv']) priority = -1
      else priority = 100
      break

    case 'link':
      if (tag.rel === 'preconnect') priority = 10
      else if (tag.rel === 'preload') priority = 60
      else if (tag.rel === 'prefetch') priority = 80
      else if (tag.rel === 'stylesheet') priority = 50
      else priority = 90
      break

    case 'style':
      priority = tag.innerHTML.includes('@import') ? 30 : 51
      break

    case 'script':
      if (tag.type === 'application/ld+json') priority = 105
      else if (tag.async) priority = 20
      else if (tag.defer) priority = 70
      else priority = 40
      break

    default:
      priority = 110
  }
  return { ...tag, priority }
}
```

Provide a custom `applyPriority()` function to reorder head items as needed.

## Defaults

Default charset and viewport meta tags are included by default.

```ts
const DEFAULT_CHARSET = { charset: 'UTF-8' }
const DEFAULT_VIEWPORT = {
  name: 'viewport',
  content: 'width=device-width, initial-scale=1'
}
```

These can be overridden by providing your own `meta` items.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request with your improvements.

## License

This project is licensed under the ISC License.
