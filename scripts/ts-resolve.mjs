// Module resolution for scripts that import the site's TypeScript modules,
// whose relative imports are extensionless ("./finance") because Next's
// bundler resolves them. Node 24 strips the types itself; this only adds
// ".ts" when a relative import without an extension is not found. Used by
// `npm run test:calc` and by scripts/check-facts.mjs (so also the Instagram
// publisher); the site build never loads it.
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(`
      export async function resolve(specifier, context, next) {
        try {
          return await next(specifier, context);
        } catch (err) {
          if (err?.code === "ERR_MODULE_NOT_FOUND" && /^\\.\\.?\\//.test(specifier) && !/\\.[cm]?[jt]sx?$/.test(specifier)) {
            return next(specifier + ".ts", context);
          }
          throw err;
        }
      }
    `),
  import.meta.url,
);
