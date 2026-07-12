# astro-helmet

`astro-helmet` is a utility for managing the document head of Astro projects. It provides an Astro component `Helmet` which accepts an object of head items and renders them in the document head.

## Features

- Render head items in the document head, specified in object(s).
- Merge head items from multiple sources.
- Control the order of head items.
- Include default charset and viewport meta tags.
- Order head items with default or specified priority.
- Meta and resource-hint link deduplication.
- JSON-LD structured data helper with automatic `@context`, serialization, and escaping.
- Optional SEO helper for canonical, robots, Open Graph, Twitter, alternates, and JSON-LD.
- Resource hint helpers for preconnect, preload, modulepreload, fonts, images, stylesheets, and external scripts.
- Dev-time validation for common head, SEO, preload, CSP, SRI, and unsafe-content mistakes.
- Optional Astro CSP hash/resource registration.
- Flexible API for adding head items and tag attributes.

## Installation

Install `astro-helmet` using npm:

```bash
npm i astro-helmet
```

`astro-helmet` supports Astro 4, 5, 6, and 7.

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
  style: [{ textContent: 'body { color: red; }' }],
  script: [{ textContent: 'console.log("Hello, world!")' }],
  noscript: [{ textContent: 'Please enable JavaScript' }]
}
---

<!doctype html>
<html lang="en">
  <Helmet {headItems} />
  <body> ... </body>
</html>
```

Any attribute can be added to a head item. Simply provide the attribute as a key-value pair in the object.

`'innerHTML', 'textContent', 'priority', 'tagName', 'key'` are reserved keys and cannot be used as attributes.

To add content to a tag, prefer `textContent`. For `<script>` and `<style>`, `textContent` preserves the code text while escaping closing-tag sequences such as `</script>`. Script text that contains the HTML parser sequence `<!--` followed by `<script>` is rejected because it can consume the rest of the document; use an external script instead. For tags like `<noscript>`, `textContent` is HTML-escaped.

Use `innerHTML` only when you intentionally need raw, trusted markup. Do not pass CMS or user-provided strings into `innerHTML` or inline event-handler attributes.

To control the order of head items, use the `priority` key.

```ts
const headItems: HeadItems = {
  // priority 1 will move the script to just below the <title>
  script: [{ src: '/scripts/importantScript.js', priority: 1 }]
}
```

See `applyPriority()` in the [Options](#options) section for more information on controlling the order of head items.

### Resource Helpers

Resource helpers return ordinary `link` or `script` items. They are optional, but they make common performance-sensitive tags harder to mistype.

`modulepreload()` accepts the standardized `as` destinations. Browser support beyond the default JavaScript module destination is still emerging, so verify non-script module types in your target browsers.

```ts
import {
  externalScript,
  modulepreload,
  preconnect,
  preloadFont,
  preloadImage,
  stylesheet,
  type HeadItems
} from 'astro-helmet'

const headItems: HeadItems = {
  title: 'My Site Title',
  link: [
    preconnect('https://cdn.example.com'),
    preloadFont('/fonts/Inter.woff2', { type: 'font/woff2' }),
    preloadImage('/images/hero.jpg', { fetchpriority: 'high' }),
    preloadImage({
      imagesrcset: '/images/hero-640.jpg 640w, /images/hero-1280.jpg 1280w',
      imagesizes: '100vw',
      fetchpriority: 'high'
    }),
    modulepreload('/scripts/entry.js'),
    stylesheet('/styles/site.css')
  ],
  script: [externalScript('/scripts/app.js', { defer: true })]
}
```

`preloadImage()` also supports responsive image preloads without a fallback `href`:

```ts
preloadImage({
  imagesrcset: '/images/hero-640.jpg 640w, /images/hero-1280.jpg 1280w',
  imagesizes: '100vw',
  fetchpriority: 'high'
})
```

Use this when you want browsers that support responsive preloads to choose from `imagesrcset` without causing an additional fallback preload in browsers that do not. Width-descriptor `imagesrcset` values such as `640w` should include `imagesizes`; density descriptors such as `1x, 2x` do not need it.

The preload's `imagesrcset` and `imagesizes` must match the rendered `<img>` attributes so the browser can reuse the preload. When an `<img>` uses `src` as the density fallback, include that URL as an explicit `1x` candidate in both source sets:

```ts
preloadImage({
  imagesrcset: '/images/hero.jpg 1x, /images/hero@2x.jpg 2x',
  fetchpriority: 'high'
})
```

```html
<img
  src="/images/hero.jpg"
  srcset="/images/hero.jpg 1x, /images/hero@2x.jpg 2x"
  alt=""
/>
```

If the `<img>` instead has `srcset="/images/hero@1.5x.jpg 1.5x, /images/hero@2x.jpg 2x"`, a DPR-1 browser selects the `1.5x` candidate rather than its separate `src`. Preloading `src` in that case will not match the image request.

### SEO Helper

Use `createSeoHead()` when you want a small typed layer for common SEO tags while still keeping the raw `HeadItems` escape hatch.

```ts
import { createSeoHead } from 'astro-helmet'

const headItems = createSeoHead({
  title: 'My Article',
  titleTemplate: '%s | My Site',
  description: 'A short page description.',
  site: Astro.site,
  path: Astro.url.pathname,
  openGraph: {
    type: 'article',
    siteName: 'My Site',
    image: {
      url: '/images/article.jpg',
      alt: 'Article image',
      width: 1200,
      height: 630
    }
  },
  twitter: {
    site: '@mysite',
    image: '/images/article-twitter.jpg'
  },
  jsonLd: {
    '@type': 'Article',
    headline: 'My Article'
  }
})
```

`createSeoHead()` returns normal `HeadItems`, so layout and page data can still be merged:

```astro
<Helmet headItems={[layoutHeadItems, pageHeadItems]} />
```

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

Use the `jsonLd` property to add [JSON-LD structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) to your pages. `@context` is set to `https://schema.org` automatically, `JSON.stringify()` is handled internally, and less-than characters in values are escaped as JSON Unicode sequences so embedded data cannot change the HTML parser state.

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
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://example.com/'
        },
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

`headItems.meta` are deduplicated by `name`, `property`, `http-equiv` and `charset`.
Meta items later in the array replace earlier items. `name` and `http-equiv` matching is case-insensitive. `media` is part of the deduplication key, so media-specific tags such as multiple `theme-color` metas are preserved. Meta tags without any of these keys (e.g. `itemprop`-only tags) are never deduplicated.

`headItems.link` deduplicates:

- `rel="canonical"` links, keeping the last one.
- `rel="preconnect"` and `rel="dns-prefetch"` links with the same `href`, keeping the last one.
- `rel="preload"` and `rel="modulepreload"` links with the same `href`, `as`, `type`, `crossorigin`, `media`, `imagesrcset`, and `imagesizes`, keeping the last one. Responsive image preloads without `href` are deduplicated by `as`, `type`, `crossorigin`, `media`, `imagesrcset`, and `imagesizes`.

Any `meta`, `link`, `style`, `script`, or `noscript` item may provide `key` to opt into explicit last-write-wins deduplication:

```ts
const headItems = [
  {
    title: 'Layout',
    script: [{ key: 'analytics', src: '/analytics-v1.js', defer: true }]
  },
  {
    title: 'Page',
    script: [{ key: 'analytics', src: '/analytics-v2.js', defer: true }]
  }
]
```

`title` and `base` items are also deduplicated, with the last item in the array taking precedence.

At least one merged `HeadItems` object must provide a non-empty `title`; otherwise `renderHead()` will throw.

### Props

The `Helmet` component takes two props:

```ts
interface Props {
  headItems: HeadItems | HeadItems[]
  options?: HelmetOptions
}
```

### Options

#### `validate`

By default, `<Helmet />` runs `validateHeadItems()` and logs warnings in Astro dev mode. Production builds stay quiet unless you explicitly pass `options.validate`.

```astro
<Helmet
  {headItems}
  options={{
    validate: {
      requireSri: true,
      baseUrl: Astro.site
    }
  }}
/>
```

Set `validate: false` to disable component warnings:

```astro
<Helmet {headItems} options={{ validate: false }} />
```

You can also call the validator yourself:

```ts
import { validateHeadItems } from 'astro-helmet'

const issues = validateHeadItems(headItems, {
  baseUrl: 'https://example.com',
  requireOpenGraphImage: true,
  requireSri: true
})
```

Validation returns structured issues with `code`, `severity`, `message`, `tagName`, and `path`. It checks for common mistakes such as missing or empty titles/descriptions, empty or relative canonicals, invalid preload and module-preload destinations, preloads without a usable source, responsive image preloads that use width descriptors without `imagesizes`, font preloads without `crossorigin`, incomplete or empty Open Graph basics, relative Open Graph/Twitter image URLs, raw `innerHTML`, unsafe script parser sequences, inline event attributes, JSON-LD serialization errors, and optional missing SRI on external scripts/styles.

Set `requireOpenGraphImage: true` if every shareable page in your project should provide `og:image`. By default, image-less website pages are allowed so dev validation does not warn on simple pages that still have useful `og:title`, `og:type`, and `og:url` tags.

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

When using `omitHeadTags`, keep `<Helmet />` near the top of your manual `<head>`. The generated charset should remain inside the first 1024 bytes of the document and `<base>` should appear before URL-bearing tags.

#### `applyPriority()`

The `applyPriority` option allows you to customize the priority of head items. It takes a function that accepts a `Tag` object and returns a `Tag` object with the priority applied.

The default ordering follows Harry Roberts' [Get Your Head Straight](https://speakerdeck.com/csswizardry/get-your-head-straight) head-order model: document metadata first, early connection hints, async work, blocking work, future-navigation hints, then SEO/social metadata. It is a safe default ordering, not an auto-optimizer. Use explicit priorities when you have measured that a page needs a different critical path.

By default, items are ordered as follows:

| priority | item                                          |
| -------- | --------------------------------------------- |
| \-4      | `<meta charset="">`                           |
| \-3      | `<meta name="viewport">`                      |
| \-2      | `<base href="">`                              |
| \-1      | `<meta http-equiv="">`                        |
| 0        | `<title>`                                     |
| 10       | `<link rel="preconnect" />`                   |
| 11       | `<link rel="dns-prefetch" />`                 |
| 20       | `<script src="" async></script>`              |
| 30       | `<style>` where innerHTML.includes('@import') |
| 40       | `<script>`                                    |
| 50       | `<link rel="stylesheet" />`                   |
| 60       | `<link rel="preload" />`                      |
| 60       | `<link rel="modulepreload" />`                |
| 70       | `<script src="" defer></script>`              |
| 80       | `<link rel="prefetch" />`                     |
| 80       | `<link rel="prerender" />`                    |
| 90       | remaining `<link>`                            |
| 100      | remaining `<meta>`                            |
| 105      | `<script type="application/ld+json">`         |
| 110      | anything else                                 |

Resource hints are powerful but easy to overuse:

- Use `preconnect` sparingly for important third-party origins needed early. Add `crossorigin` only when the eventual request needs a CORS connection.
- Use `preload` only for critical resources needed by the current navigation. Provide a correct `as`, and include matching `type` and `crossorigin` when needed.
- Use `modulepreload` for module graphs, not classic scripts.
- Prefer `<script src async>` over inline async-loader snippets when possible, so the browser's preload scanner can see the URL.
- Avoid CSS `@import`; direct stylesheet links are easier for browsers to discover in parallel.

#### `csp`

Set `options.csp` to `true` to register inline script/style hashes and external script/style sources with Astro's CSP runtime API.

```astro
<Helmet {headItems} options={{ csp: true }} />
```

Leave this disabled unless your Astro project has `security.csp` configured. Astro warns when `Astro.csp` is accessed without CSP enabled, so `astro-helmet` keeps CSP registration opt-in.

Astro CSP is available in Astro 6 and newer. In Astro 4 and 5 this option is a no-op. Astro CSP is also a build/preview feature rather than a dev-server feature, and Astro documents limitations with client-side routing.

`astro-helmet` registers:

- Inline `<style>`, inline `<script>`, and JSON-LD hashes.
- External `<script src>`.
- Stylesheet links.
- `rel="preload"` links with `as="script"` or `as="style"`.
- `rel="modulepreload"` links with script-like destinations as script resources and `as="style"` as a style resource. JSON and text module destinations are not registered because Astro's helper API does not expose their `connect-src` directives.

It does not infer broader CSP directives from icons, images, fonts, analytics endpoints, or connection hints.

For CDN scripts and styles, combine browser-level SRI attributes with validation:

```ts
const headItems = {
  title: 'Secure assets',
  link: [
    {
      rel: 'stylesheet',
      href: 'https://cdn.example.com/site.css',
      integrity: 'sha384-...',
      crossorigin: 'anonymous'
    }
  ],
  script: [
    {
      src: 'https://cdn.example.com/app.js',
      integrity: 'sha384-...',
      crossorigin: 'anonymous',
      defer: true
    }
  ]
}
```

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
