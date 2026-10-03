import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGARequest,
  fetchGAReport,
  getArticleSlug,
  getConfig,
  getDateRange,
  normalizeBasePath,
  normalizeGAReport,
  syncReadSignals,
  writeSnapshot,
} from './sync.js'

const config = {
  propertyId: '123456',
  hostname: 'tsukurun-lab.com',
  basePath: '',
  timeZone: 'Asia/Tokyo',
}

function gaRow(hostname, path, views) {
  return {
    dimensionValues: [{ value: hostname }, { value: path }],
    metricValues: [{ value: String(views) }],
  }
}

function report(rows = [], rowCount = rows.length) {
  return {
    dimensionHeaders: [{ name: 'hostName' }, { name: 'pagePath' }],
    metricHeaders: [{ name: 'screenPageViews' }],
    rowCount,
    rows,
  }
}

function mockD1(fail = false) {
  const batches = []
  return {
    batches,
    prepare(sql) {
      return {
        bind(...params) {
          return { sql, params }
        },
      }
    },
    async batch(statements) {
      batches.push(statements)
      if (fail) throw new Error('D1 error')
      return statements.map(() => ({ success: true }))
    },
  }
}

const metadata = {
  periodStart: '2026-09-04',
  periodEnd: '2026-10-01',
  generatedAt: '2026-10-02T00:00:00.000Z',
}

test('property-local date range spans exactly 28 days across month and year boundaries', () => {
  assert.deepEqual(getDateRange(new Date('2026-03-01T00:00:00Z'), 'Asia/Tokyo'), {
    periodStart: '2026-02-01',
    periodEnd: '2026-02-28',
  })
  assert.deepEqual(getDateRange(new Date('2025-12-31T18:00:00Z'), 'Asia/Tokyo'), {
    periodStart: '2025-12-04',
    periodEnd: '2025-12-31',
  })
})

test('base path and hostname are normalized before query and path checks', () => {
  assert.equal(normalizeBasePath(''), '')
  assert.equal(normalizeBasePath('/'), '')
  assert.equal(normalizeBasePath('foo/'), '/foo')
  assert.equal(
    getConfig({
      GA_PROPERTY_ID: '123456',
      SITE_HOSTNAME: 'TSUKURUN-LAB.COM',
      SITE_BASE_PATH: '/foo/',
      GA_TIME_ZONE: 'Asia/Tokyo',
    }).basePath,
    '/foo'
  )
  assert.throws(() => normalizeBasePath('/foo/../bar'))
})

test('article path accepts only one validated slug segment', () => {
  const accepted = [
    ['/blog/example', '', 'example'],
    ['/blog/example/', '', 'example'],
    ['/foo/blog/example', '/foo', 'example'],
    ['/foo/blog/example/', '/foo', 'example'],
  ]
  for (const [path, basePath, slug] of accepted) {
    assert.equal(getArticleSlug(path, basePath), slug)
  }
  for (const path of [
    '/blog',
    '/blog/',
    '/blog/page/2',
    '/blog/tag/AI',
    '/blog/a/b',
    '/blog/Invalid',
    '/blog/%61',
    '/api/blog-signals',
  ]) {
    assert.equal(getArticleSlug(path, ''), null, path)
  }
})

test('GA request filters host and base path, sorts by page views, and uses explicit dates', () => {
  const request = buildGARequest({ ...config, basePath: '/foo' }, metadata)
  assert.deepEqual(request.dimensions, [{ name: 'hostName' }, { name: 'pagePath' }])
  assert.deepEqual(request.metrics, [{ name: 'screenPageViews' }])
  assert.deepEqual(request.dateRanges, [
    { startDate: metadata.periodStart, endDate: metadata.periodEnd },
  ])
  assert.deepEqual(request.dimensionFilter.andGroup.expressions, [
    {
      filter: {
        fieldName: 'hostName',
        stringFilter: { matchType: 'EXACT', value: 'tsukurun-lab.com' },
      },
    },
    {
      filter: {
        fieldName: 'pagePath',
        stringFilter: { matchType: 'BEGINS_WITH', value: '/foo/blog/' },
      },
    },
  ])
  assert.equal(request.limit, '100')
  assert.deepEqual(request.orderBys, [
    { metric: { metricName: 'screenPageViews' }, desc: true },
  ])
})

test('GA fetch sends a Bearer token to the Data API without exposing it in the result', async () => {
  let called
  const result = await fetchGAReport(config, metadata, 'mock-token', async (url, options) => {
    called = { url, options }
    return { ok: true, json: async () => report() }
  })
  assert.match(called.url, /\/v1beta\/properties\/123456:runReport$/)
  assert.equal(called.options.headers.Authorization, 'Bearer mock-token')
  assert.deepEqual(result, report())
})

test('normalization rejects other hosts and routes, combines duplicate slugs, and ignores zero views', () => {
  const rows = [
    gaRow(config.hostname, '/blog/example', 5),
    gaRow(config.hostname, '/blog/example/', 3),
    gaRow('other.example', '/blog/foreign', 100),
    gaRow(config.hostname, '/blog/page/2', 90),
    gaRow(config.hostname, '/blog/tag/AI', 80),
    gaRow(config.hostname, '/blog/zero', 0),
    gaRow(config.hostname, '/blog/invalid', 'not-a-number'),
    gaRow(config.hostname, '/blog/alpha', 8),
  ]
  assert.deepEqual(normalizeGAReport(report(rows), config), [
    { slug: 'alpha', views: 8 },
    { slug: 'example', views: 8 },
  ])
})

test('normalization keeps only the top 20 article slugs', () => {
  const rows = Array.from({ length: 21 }, (_, index) =>
    gaRow(config.hostname, `/blog/article-${index}`, index + 1)
  )
  const result = normalizeGAReport(report(rows), config)
  assert.equal(result.length, 20)
  assert.deepEqual(result[0], { slug: 'article-20', views: 21 })
  assert.equal(result.some((row) => row.slug === 'article-0'), false)
})

test('only a validated empty GA report can clear the snapshot', () => {
  assert.deepEqual(normalizeGAReport(report([], 0), config), [])
  assert.throws(() => normalizeGAReport({ rowCount: 0 }, config))
  assert.throws(() => normalizeGAReport(report([], 1), config))
  assert.throws(() => normalizeGAReport(report([gaRow('other.example', '/blog/a', 3)]), config))
  assert.throws(() => normalizeGAReport({ ...report(), metricHeaders: [] }, config))
})

test('snapshot upserts and stale cleanup share one D1 batch', async () => {
  const db = mockD1()
  await writeSnapshot(db, [{ slug: 'example', views: 9 }], metadata)
  assert.equal(db.batches.length, 1)
  assert.equal(db.batches[0].length, 2)
  assert.match(db.batches[0][0].sql, /ON CONFLICT\(slug\) DO UPDATE/)
  assert.deepEqual(db.batches[0][0].params, [
    'example',
    9,
    metadata.periodStart,
    metadata.periodEnd,
    metadata.generatedAt,
  ])
  assert.match(db.batches[0][1].sql, /DELETE FROM blog_read_signals WHERE generated_at <> \?/)
  assert.deepEqual(db.batches[0][1].params, [metadata.generatedAt])
})

test('empty snapshot requires explicit confirmation; D1 failure propagates', async () => {
  const db = mockD1()
  await assert.rejects(writeSnapshot(db, [], metadata))
  assert.equal(db.batches.length, 0)
  await writeSnapshot(db, [], { ...metadata, validEmpty: true })
  assert.equal(db.batches[0].length, 1)
  await assert.rejects(
    writeSnapshot(mockD1(true), [{ slug: 'example', views: 9 }], metadata),
    /D1 error/
  )
})

test('invalid GA report or API error never reaches D1 batch', async () => {
  const db = mockD1()
  const env = {
    GA_PROPERTY_ID: config.propertyId,
    SITE_HOSTNAME: config.hostname,
    SITE_BASE_PATH: config.basePath,
    GA_TIME_ZONE: config.timeZone,
    GA_SERVICE_ACCOUNT_JSON: 'unused-by-mock',
    BLOG_SIGNALS_DB: db,
  }
  const options = {
    now: new Date(metadata.generatedAt),
    tokenProvider: async () => 'mock-token',
    fetchImpl: async () => ({ ok: true, json: async () => ({ rowCount: 0 }) }),
  }
  await assert.rejects(syncReadSignals(env, options), /metadata/)
  assert.equal(db.batches.length, 0)
  await assert.rejects(
    syncReadSignals(env, {
      ...options,
      fetchImpl: async () => ({ ok: false, status: 403 }),
    }),
    /403/
  )
  assert.equal(db.batches.length, 0)
})

test('validated zero-row GA report commits an empty snapshot', async () => {
  const db = mockD1()
  const env = {
    GA_PROPERTY_ID: config.propertyId,
    SITE_HOSTNAME: config.hostname,
    SITE_BASE_PATH: config.basePath,
    GA_TIME_ZONE: config.timeZone,
    GA_SERVICE_ACCOUNT_JSON: 'unused-by-mock',
    BLOG_SIGNALS_DB: db,
  }
  const result = await syncReadSignals(env, {
    now: new Date(metadata.generatedAt),
    tokenProvider: async () => 'mock-token',
    fetchImpl: async () => ({ ok: true, json: async () => report([], 0) }),
  })
  assert.deepEqual(result, { received: 0, saved: 0 })
  assert.equal(db.batches[0].length, 1)
})
