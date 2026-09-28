import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

// Integrations run in Node during config/build startup, before Vite exposes
// import.meta.env to site modules. Load the same mode-specific .env values into
// process.env before importing integrations that read server-constants.
const mode =
  process.env.NODE_ENV ||
  (process.argv.includes('build') ? 'production' : 'development');
Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

const [
  { CUSTOM_DOMAIN, BASE_PATH },
  { default: FeaturedImageDownloader },
  { default: PublicNotionCopier },
] = await Promise.all([
  import('./src/server-constants.ts'),
  import('./src/integrations/featured-image-downloader.ts'),
  import('./src/integrations/public-notion-copier.ts'),
]);

const getSite = function () {
  if (!process.env.CF_PAGES) {
    return new URL(BASE_PATH, 'http://localhost:4321').toString();
  }
  if (process.env.CF_PAGES_BRANCH !== 'main') {
    return new URL(BASE_PATH, process.env.CF_PAGES_URL).toString();
  }
  if (CUSTOM_DOMAIN) {
    return new URL(BASE_PATH, `https://${CUSTOM_DOMAIN}`).toString();
  }
  return new URL(BASE_PATH, `https://${new URL(process.env.CF_PAGES_URL).host.split('.').slice(1).join('.')}`).toString();
};

// https://astro.build/config
export default defineConfig({
  site: getSite(),
  base: BASE_PATH,
  scopedStyleStrategy: 'where',
  build: {
    inlineStylesheets: 'never',
  },
  integrations: [FeaturedImageDownloader(), PublicNotionCopier()],
});
