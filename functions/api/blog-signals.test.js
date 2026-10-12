import assert from 'node:assert/strict'
import { test } from 'node:test'
import { onRequestGet } from './blog-signals.js'

function mockDatabase({ reactions = [], reads = [], reactionError, readError } = {}) {
  const queries = []
  return {
    queries,
    prepare(sql) {
      const kind = sql.includes('FROM article_likes') ? 'reaction' : 'read'
      queries.push({ kind, sql })
      return {
        bind(limit) {
          queries.at(-1).limit = limit
          return {
            async all() {
              if (kind === 'reaction' && reactionError) throw reactionError
              if (kind === 'read' && readError) throw readError
              return { results: kind === 'reaction' ? reactions : reads }
            },
          }
        },
      }
    },
  }
}

async function request(db) {
  const response = await onRequestGet({ env: db ? { LIKES_DB: db } : {} })
  return { response, body: await response.json() }
}

test('returns read first and reaction second with version 1 and no views', async () => {
  const db = mockDatabase({
    reactions: [{ slug: 'liked-post', value: 3 }],
    reads: [{ slug: 'read-post', views: 13 }],
  })
  const { response, body } = await request(db)

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=60')
  assert.equal(body.version, 1)
  assert.ok(Number.isFinite(Date.parse(body.generatedAt)))
  assert.deepEqual(body.signals, [
    { kind: 'read', slug: 'read-post' },
    { kind: 'reaction', slug: 'liked-post', value: 3 },
  ])
  assert.equal(JSON.stringify(body).includes('views'), false)
  assert.deepEqual(db.queries.map(({ limit }) => limit), [10, 10])
  assert.match(db.queries[1].sql, /ORDER BY views DESC, slug ASC/)
})

test('keeps reactions when the read query fails', async () => {
  const db = mockDatabase({
    reactions: [{ slug: 'liked-post', value: 2 }],
    readError: new Error('read table unavailable'),
  })
  const { response, body } = await request(db)
  assert.equal(response.status, 200)
  assert.deepEqual(body.signals, [
    { kind: 'reaction', slug: 'liked-post', value: 2 },
  ])
})

test('keeps reads when the reaction query fails', async () => {
  const db = mockDatabase({
    reactionError: new Error('likes table unavailable'),
    reads: [{ slug: 'read-post', views: 10 }],
  })
  const { response, body } = await request(db)
  assert.equal(response.status, 200)
  assert.deepEqual(body.signals, [{ kind: 'read', slug: 'read-post' }])
})

test('returns a no-store 500 when both queries fail', async () => {
  const db = mockDatabase({
    reactionError: new Error('reaction unavailable'),
    readError: new Error('read unavailable'),
  })
  const { response, body } = await request(db)
  assert.equal(response.status, 500)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.deepEqual(body, { error: 'Failed to read blog signals.' })
})

test('returns a no-store 503 when the binding is missing', async () => {
  const { response, body } = await request(null)
  assert.equal(response.status, 503)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.deepEqual(body, { error: 'Likes database is not configured.' })
})

test('excludes invalid slugs and nonpositive reaction values', async () => {
  const db = mockDatabase({
    reactions: [
      { slug: 'valid-post', value: 0 },
      { slug: 'another-post', value: -1 },
      { slug: 'bad/slug', value: 3 },
      { slug: 'liked-post', value: 1 },
    ],
    reads: [
      { slug: '../bad', views: 20 },
      { slug: 'read-post', views: 4 },
    ],
  })
  const { body } = await request(db)
  assert.deepEqual(body.signals, [
    { kind: 'read', slug: 'read-post' },
    { kind: 'reaction', slug: 'liked-post', value: 1 },
  ])
})
