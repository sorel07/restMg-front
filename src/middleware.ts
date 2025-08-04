import { defineMiddleware } from "astro:middleware";

declare global {
  namespace App {
    interface Locals {
      subdomain?: string;
    }
  }
}

export const onRequest = defineMiddleware((context, next) => {
  const pathname = context.url.pathname;

  // Buscamos el patrón /r/slug/...
  const match = pathname.match(/^\/r\/([a-zA-Z0-9-]+)/);

  if (match) {
    // match[1] contiene la parte que coincide con ([a-zA-Z0-9-]+), es decir, el slug.
    const subdomainSlug = match[1];
    context.locals.subdomain = subdomainSlug;
  }

  return next();
});
