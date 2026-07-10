import Helmet from './src/Helmet.astro'

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
} from './src/main'

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
	ModulePreloadAs,
	ModulePreloadOptions,
	NoscriptItem,
	OpenGraphOptions,
	PreloadAs,
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
} from './src/main'
