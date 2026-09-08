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

HTML boolean attributes use presence/absence semantics: `async: true` renders `async`, and `defer: false` omits `defer`. The `hidden` and `crossorigin` attributes also accept booleans as a convenience: `false` omits the attribute, while string values such as `hidden: 'until-found'` are preserved. Other attributes preserve boolean values as text, so `content: false` and `'data-enabled': false` render `content="false"` and `data-enabled="false"`.

`'innerHTML', 'textContent', 'priority', 'tagName', 'key'` are reserved keys and cannot be used as attributes.

To add content to a tag, prefer `textContent`. For `<script>` and `<style>`, it escapes parser-relevant closing-tag sequences such as `</script>` while preserving their letter case. Script text that opens an HTML comment with `<!--` and reaches a `<script` opening sequence before closing that comment is rejected, including whitespace and carriage-return variants, because it can consume the rest of the document. A closed comment such as `<!-- comment -->` before a later `<script` string is allowed. For tags like `<noscript>`, `textContent` is HTML-escaped.

Inline text is normalized like HTML parsing: CRLF and CR become LF, and literal NUL characters become U+FFFD. CSP hashes use the same final text. Closing-tag escaping changes the source spelling, so constructs that inspect raw source, such as `String.raw` templates, may observe the added backslash. Use an external script when exact source bytes or raw-template behavior matter. Use `jsonLd` for structured data instead of assembling a script string.

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

A non-empty page image list replaces the complete layout image list, including its descriptions and dimensions. A page that omits images or supplies an empty list inherits the layout images. Raw `meta` overrides containing `og:image` (or its `og:image:url` alias) use the same replacement rule, including inside `createSeoHead()`. To render several images, supply them together in one source; each image's structured properties stay with that image.

The `noindex` and `nofollow` shortcuts override their corresponding directives in both string and object `robots` values. Unrelated directives are retained. For example, `robots: 'index, max-image-preview:large', noindex: true` produces `max-image-preview:large, noindex`. Without shortcuts, string directives are preserved exactly. Title templates replace every `%s` with the literal title, including any dollar signs.

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

Open Graph images are grouped: repeated image roots within a source are preserved, and repeated structured properties replace earlier properties of the same image. A later source containing an unkeyed image root replaces the earlier image list. A source containing only image structured properties extends or overrides the final inherited image. An explicitly keyed image root replaces its entire matching group while preserving unrelated images, including across sources. Explicit keys on structured properties are global within metadata: a repeated key moves the property to its new image group. Replacing an image root with non-image metadata removes the old group and its properties. If the current image is removed, later structured properties override the final surviving image; if no image survives, they remain orphan properties. Replacing an image list never revives metadata removed by an earlier key override.

`headItems.link` deduplicates:

- `rel="canonical"` links, keeping the last one.
- `rel="preconnect"` links with the same `href` and CORS mode, keeping the last one.
- `rel="dns-prefetch"` links with the same `href`, keeping the last one.
- `rel="preload"` and `rel="modulepreload"` links with the same `href`, `as`, `type`, CORS mode, `media`, `imagesrcset`, and `imagesizes`, keeping the last one. Responsive image preloads without `href` use the remaining attributes as their identity.

CORS identity follows the attribute's meaning: an absent attribute, anonymous CORS (`crossorigin=""` or `"anonymous"`), and `"use-credentials"` remain distinct. Module preloads use anonymous CORS when the attribute is absent and default a missing `as` to `script`; these defaults deduplicate with their explicit equivalents. Browser preload reuse still depends on the eventual request and browser behavior.

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

The component defaults to `Astro.url` as the document URL. For compatibility, `validate.baseUrl` alone still describes the document origin, so the `Astro.site` example above also works in development. Set both `documentUrl` and `baseUrl` to distinguish a page origin from its effective CDN base. An explicit validation `documentUrl` overrides the default for validation only; undefined fields preserve the component context. Otherwise validation uses the final merged Helmet base. The component's `options.baseUrl`, when supplied, overrides base resolution for both validation and CSP. With `requireSri: true`, scheme-relative URLs such as `//cdn.example.com/app.js` are checked even without a base; an unknown document origin is treated conservatively as external. A base inferred from head items changes resource resolution but never establishes the document origin.

#### `baseUrl`

When a `<base>` is rendered outside Helmet, supply its effective URL with `options.baseUrl`. This lets CSP registration and validation resolve relative resources against the same base as the browser. The option does not render a base element and takes precedence over a later Helmet base for URL resolution. Supply the URL of the actual first `<base href>` in document order; Helmet cannot discover base elements rendered outside the component.

```astro
<head>
  <base href="https://cdn.example.com/assets/" />
  <Helmet
    {headItems}
    options={{
      omitHeadTags: true,
      csp: true,
      baseUrl: 'https://cdn.example.com/assets/'
    }}
  />
</head>
```

Keep the effective base before URL-bearing elements. Use a single effective base across the document. Relative bases resolve against the document URL. Validation reports malformed or unsupported bases separately from valid resources. Resolution follows the [HTML base fallback rules](https://html.spec.whatwg.org/multipage/semantics.html#the-base-element); malformed bases still differ between browsers, so correct the base rather than relying on fallback behavior.

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

The callback runs once per final deduplicated tag, before sorting and serialization. If it also changes content or resource URLs, rendering and CSP registration both use the returned tag. Keep ordering changes consistent with HTML requirements such as placing the base before relative resources. Validation checks the supplied head items, using the final base for URL resolution; it does not revalidate other callback-transformed attributes or content.

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

Leave this disabled unless your Astro project has CSP configured (`security.csp`, or `experimental.csp` in Astro 5). Astro warns when `Astro.csp` is accessed without CSP enabled, so `astro-helmet` keeps CSP registration opt-in.

Helmet uses Astro's CSP API when available, including Astro 5 versions exposing `Astro.csp` with `experimental: { csp: true }` (verified with Astro 5.18.2) and Astro 6 or newer with `security: { csp: true }`. It is a no-op when `Astro.csp` is unavailable, including Astro 4 and early Astro 5 experimental implementations such as 5.13.4, and when Astro 5's experimental flag is disabled. Other registration errors propagate rather than silently dropping CSP entries. Astro CSP is also a build/preview feature rather than a dev-server feature, and Astro documents limitations with client-side routing.

**Registration is only one part of CSP enforcement.** Astro controls policy delivery. Its static output can place the CSP meta element after head scripts and styles; this was reproduced with Astro 7.3.1. A meta policy only governs content parsed after it and does not protect preceding head resources. For protection from the start of parsing, deliver the generated policy as a `Content-Security-Policy` response header through your server, adapter, or hosting configuration, or arrange an equivalent policy before the protected elements. Verify the deployed response and both allowed and blocked resources. See the [CSP meta-delivery rules](https://w3c.github.io/webappsec-csp/#meta-element) and [Astro CSP configuration](https://docs.astro.build/en/reference/configuration-reference/#securitycsp). Helmet does not move Astro's generated policy or set response headers.

`astro-helmet` registers:

- Inline `<style>`, inline `<script>`, and JSON-LD hashes.
- External `<script src>`.
- Stylesheet links.
- `rel="preload"` links with `as="script"` or `as="style"`.
- `rel="modulepreload"` links with script-like destinations as script resources and `as="style"` as a style resource. JSON and text module destinations are not registered because Astro's helper API does not expose their `connect-src` directives.

It does not infer broader CSP directives from icons, images, fonts, analytics endpoints, or connection hints.

Hashes describe the normalized, serialized content after `applyPriority`. Resource sources resolve against the effective base (`options.baseUrl`, then the final Helmet base, then the document URL); cross-origin bases register the actual HTTP(S) origin rather than `'self'`. Scheme-relative resources inherit the base scheme. Configure Astro's `site` with the public origin when prerendering so `Astro.url` and scheme-relative CSP sources use the production scheme; without it, Astro can use an HTTP localhost origin. Helmet does not force HTTPS for HTTP documents. A malformed base does not suppress registration of valid absolute or data resources. Malformed resources do not broaden the policy. Raw `innerHTML`, inline JavaScript, and resource URLs must still be trusted; automatic registration authorizes the supplied content and is not a sanitizer.

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
