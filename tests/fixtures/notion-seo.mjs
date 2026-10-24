// Offline build fixture. Preload only in tests; never reads or writes real Notion.
import assert from 'node:assert/strict'
import http from 'node:http'
import https from 'node:https'
import { syncBuiltinESMExports } from 'node:module'
import { Client } from '@notionhq/client'

// Fail closed if any build code bypasses the SDK stub below.
const rejectNetwork = () => {
  throw new Error('Network access is disabled in the offline SEO fixture')
}
for (const transport of [http, https]) {
  transport.request = rejectNetwork
  transport.get = rejectNetwork
}
syncBuiltinESMExports()
globalThis.fetch = rejectNetwork

const slugs = [
  'notion-codex-skill-sync', 'chatgpt-codex-development-workflow',
  'tsukurun-lab-site-refresh-2026', 'notion-skill-vs-mcp',
  'ai-research-radar-notion', 'reversible-blog-likes',
  'writing-skill-for-my-voice', 'blog-featured-image-workflow',
  'growing-astro-notion-blog', 'blog-toc-and-notion-blocks-update',
  'astro-notion-blog-renewal-with-codex', 'supported-blocks',
]
const page = (slug, published = true, date = '2020-01-01') => ({
  id: slug,
  properties: {
    Page: { title: [{ plain_text: `Fixture: ${slug}` }] },
    Slug: { rich_text: [{ plain_text: slug }] },
    Date: { date: { start: date } },
    Published: { checkbox: published },
    Tags: { multi_select: [{ name: 'SEO', color: 'default' }] },
    Excerpt: { rich_text: [{ plain_text: `Description: ${slug}` }] },
    FeaturedImage: { files: [] },
    Rank: { number: 0 },
  },
})
const pages = [...slugs.map((slug) => page(slug)), page('draft-fixture', false),
  page('future-fixture', true, '2999-01-01')]
Client.prototype.request = async ({ path, body }) => {
  if (path.startsWith('databases/') && path.endsWith('/query')) {
    // Require the existing publication contract; a removed filter fails the build.
    const filters = body.filter.and
    assert(filters.some((f) => f.property === 'Published' && f.checkbox.equals === true))
    const date = filters.find((f) => f.property === 'Date').date.on_or_before
    assert(Number.isFinite(Date.parse(date)))
    return { results: pages.filter((p) => p.properties.Published.checkbox &&
      new Date(p.properties.Date.date.start) <= new Date(date)), has_more: false }
  }
  if (path.startsWith('blocks/') && path.endsWith('/children')) {
    return { results: [], has_more: false }
  }
  if (path.startsWith('blocks/')) {
    return { id: path.slice(7), type: 'child_page', child_page: { title: 'Fixture' } }
  }
  throw new Error(`Unexpected fixture request: ${path}`)
}
process.env.NOTION_API_SECRET = 'offline-fixture'
process.env.DATABASE_ID = 'offline-fixture'
