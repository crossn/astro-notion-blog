export function GET() {
  const isProduction =
    Boolean(process.env.CF_PAGES) && process.env.CF_PAGES_BRANCH === 'main'
  const site = import.meta.env.SITE.replace(/\/?$/, '/')
  const body = isProduction
    ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site)}\n`
    : 'User-agent: *\nDisallow: /\n'

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
