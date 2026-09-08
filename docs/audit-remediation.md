# September 2026 audit remediation

The audit reviewed commit `5fbca6c85f454378819aac87eecc812e5f4ab722`. The changes below address its twelve findings without changing the package's Astro 4–7 peer range or adding runtime dependencies.

## Finding coverage

| Finding                                                      | Resolution                                                                                                                                                         | Regression evidence                                                                                                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01. CR bypasses the script parser guard                      | Normalize HTML text and recognize every relevant whitespace delimiter, including CR.                                                                               | `serializationSafety.test.ts`: unsafe sequences reject; safe scripts preserve parsed document structure.                                                      |
| 02. CSP hashes diverge from rendered code                    | Prepare the final tags once after `applyPriority`; render and hash the same normalized content.                                                                    | `cspPreparation.test.ts` compares parse5 element text; `csp.pw.ts` checks actual script execution and CSS under the generated policy delivered as a header.   |
| 03. CSP ignores the effective base                           | Resolve resources against the effective base and document URL. Add `options.baseUrl` for a manual base, and separate validation's `documentUrl`.                   | Unit URL/SRI matrix; browser requests and CSS with both Helmet and manual CDN bases.                                                                          |
| 04. Open Graph image groups become stale or misaligned       | An unkeyed image list replaces the prior list; keyed roots upsert their groups. Preserve groups within a source, including raw/helper overrides and the URL alias. | Parsed metadata assertions for inheritance, shorter lists, raw overrides, explicit keys, and property-only overrides.                                         |
| 05. String robots values ignore shortcuts                    | Apply `noindex`/`nofollow` to strings and objects; retain every directive not explicitly overridden.                                                               | String conflicts, `all`/`none`, opt-in/out, and preservation tests.                                                                                           |
| 06. CORS modes collide in resource-hint keys                 | Distinguish absent, anonymous, and credentialed requests; normalize equivalent values and module defaults. Use tuple keys to avoid delimiter collisions.           | `resourceIdentity.test.ts`; cross-origin image request-mode and reuse checks in all three browsers.                                                           |
| 07. Development dependencies have advisories; CI omits audit | Refresh compatible development dependencies and require `npm audit --audit-level=moderate` in CI.                                                                  | Full audit reports zero vulnerabilities; package and consumer checks exercise the refreshed lockfile.                                                         |
| 08. Scheme-relative resources evade SRI diagnostics          | Parse network-path references without requiring a base and treat unknown origins conservatively.                                                                   | Script/stylesheet diagnostics with and without a base, plus malformed URL cases. Browser SRI test rejects modified script bytes.                              |
| 09. Dollar signs corrupt title templates                     | Use a replacement callback for literal insertion.                                                                                                                  | All JavaScript replacement-token forms, multiple placeholders, and a packed consumer title.                                                                   |
| 10. Boolean metadata loses its value                         | Preserve boolean metadata values and presence/absence for HTML booleans plus hidden/CORS conveniences.                                                             | Parsed `content`, `data-*`, ARIA, `async`, and `defer` attributes; packed consumer output.                                                                    |
| 11. Closing-tag escaping changes data case                   | Preserve matched letter case and restrict escaping to parser-relevant closing tags.                                                                                | JavaScript runtime-value round trips and browser execution; documented raw-template limitations.                                                              |
| 12. Astro can emit a late CSP meta                           | Document the policy-delivery boundary and verify enforcement with an early response header.                                                                        | Authorized scripts/styles work; unauthorized head and body scripts are blocked. This is an upstream integration limitation, not a policy-order fix in Helmet. |

Expanded testing also exposed two related issues: Astro 5 has an experimental CSP API that can throw even though Helmet documents a no-op, and `Required<Tag>` made a priority callback require unrelated optional properties. Helmet feature-detects the CSP API, supports the Astro 5 experimental flag, and handles only Astro 5's explicit `CspNotEnabled` error as a no-op. The callback return type requires only `priority`.

The subsequent reviews are addressed in [Review follow-up](review-followup.md), including URL precedence, explicit metadata keys, and compatibility decisions. A second independent review produced 35 more regression tests covering standalone SRI origins, image-list replacement history, surviving image properties, and shared input objects. The packed-consumer harness also exercises the three reported regressions through public exports and rendered output.

## Reproducing verification

```sh
npm ci
npx prettier --check .
npm run verify
npx playwright install --with-deps chromium firefox webkit
npm run test:browser
```

`verify` includes lint, Astro diagnostics, strict TypeScript checks for the tests, coverage thresholds, package linting, an artifact dry run, and the advisory gate. The browser tests build real Astro fixtures. Their local server sends the generated policy as an HTTP header before parsing; merely checking for a hash in a late meta would miss the original CSP bugs.

The reusable consumer harness installs a tarball into a temporary application, builds it, checks rendered regressions and CSP hashes, and compiles public imports under both NodeNext and Bundler resolution. It also checks Astro 5 with experimental CSP enabled and disabled, and verifies scheme-relative CSP sources with and without a configured production site. CI runs the same harness across:

| Astro major | Node    | TypeScript |
| ----------- | ------- | ---------- |
| 4           | 18.17.1 | 5.9.3      |
| 5           | 18.20.8 | 5.9.3      |
| 6           | 22.12.0 | 6.0.3      |
| 7           | 22.12.0 | 6.0.3      |
| 7           | 24      | 6.0.3      |

For example, with the corresponding Node version selected:

```sh
ASTRO_VERSION=7 TYPESCRIPT_VERSION=6.0.3 node scripts/verify-consumer.mjs
```

Local validation passed 287 unit/integration tests (including 1,728 parser-state combinations) and 24 browser tests. Coverage was 97.79% statements, 96.69% branches, 100% functions, and 98.82% lines. Packed consumers passed with Astro 4.16.19, 5.18.2, 6.4.8, and 7.3.1, including Node 24.14.0. Some current transitive Astro packages emit engine warnings on the older matrix runtimes; the tested builds and type checks pass. This does not establish support for every optional Astro subsystem on those older runtimes.

## Integration limits

Astro 7.3.1 static output can still place its CSP meta after head resources. Helmet registers content and resources through Astro's public API; it does not control the response headers or move Astro's policy. Consumers requiring CSP protection from the beginning of the document must arrange correct delivery and verify their deployment. See [CSP meta delivery](https://w3c.github.io/webappsec-csp/#meta-element) and [Astro configuration](https://docs.astro.build/en/reference/configuration-reference/#securitycsp).

In the tested Chromium version, only the first image preload for a URL is fetched when both CORS modes are present; the second mode is fetched at consumption. Firefox and WebKit preload and reuse both. The regression test preserves both DOM hints and verifies exactly one request per mode through consumption, with HTTP caching disabled.

The package continues to accept trusted raw markup and JavaScript. Automatic CSP registration authorizes supplied content; it does not make untrusted inline code safe. The dependency audit covers this development lockfile, not a deployed application's independently installed Astro peer and other dependencies.
