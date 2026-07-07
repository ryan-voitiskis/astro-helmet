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
	NoscriptItem,
	OpenGraphOptions,
	PreloadFontOptions,
	PreloadImageOptions,
	PreloadOptions,
	ReferrerPolicy,
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
