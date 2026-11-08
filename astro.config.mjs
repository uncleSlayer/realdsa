// @ts-check
import { defineConfig } from 'astro/config';

// `site` is used for canonical URLs. Set it to wherever you deploy.
// If you host under a sub-path (e.g. GitHub Pages at user.github.io/realdsa),
// also set `base: '/realdsa'`. Internal links go through `url()` in
// src/lib/url.ts, so they keep working either way.
export default defineConfig({
  site: 'https://dsa.siddhantota.in',
  // base: '/realdsa',
  trailingSlash: 'ignore',
});
