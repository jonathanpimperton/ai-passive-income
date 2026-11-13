/**
 * js-yaml ships without TypeScript declarations and @types/js-yaml is not a
 * dependency. The JSON/YAML tool narrows the module to the JsYamlModule
 * interface in ./yaml.ts, so an untyped module declaration is enough here.
 */
declare module 'js-yaml';
