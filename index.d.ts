import type { HeadItems, HelmetOptions } from './src/main.js'

declare const Helmet: (props: {
	headItems: HeadItems | HeadItems[]
	options?: HelmetOptions
}) => unknown

export default Helmet

export {
	createSeoHead,
	dnsPrefetch,
	externalScript,
	modulepreload,
	preconnect,
	preload,
	preloadFont,
	preloadImage,
	stylesheet,
	validateHeadItems
} from './src/main.js'

export type {
	AlternateLink,
	CrossOrigin,
	ExternalScriptOptions,
	FetchPriority,
	HeadItems,
	HeadValidationCode,
	HeadValidationIssue,
	HeadValidationOptions,
	HeadValidationSeverity,
	HelmetOptions,
	JsonLdItem,
	LinkItem,
	MetaItem,
	NoscriptItem,
	OpenGraphOptions,
	PreloadFontOptions,
	PreloadImageOptions,
	PreloadOptions,
	ReferrerPolicy,
	ResponsivePreloadImageOptions,
	ResourceHintOptions,
	RobotsOptions,
	ScriptItem,
	SeoHeadOptions,
	SeoImage,
	StyleItem,
	StylesheetOptions,
	Tag,
	TwitterOptions
} from './src/main.js'
