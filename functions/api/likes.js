const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,199}$/
const VOTER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  })
}

function getDatabase(env) {
  return env?.LIKES_DB || null
}

function parseSlug(value) {
  if (!value || !SLUG_PATTERN.test(value)) {
    return null
  }
  return value
}

function parseVoterId(value) {
  if (!value) {
    return null
  }
  return VOTER_ID_PATTERN.test(value) ? value : null
}

async function getLikeState(db, slug, voterId) {
  const countRow = await db
    .prepare('SELECT COUNT(*) AS likes FROM article_likes WHERE slug = ?')
    .bind(slug)
    .first()

  let liked = false
  if (voterId) {
    const row = await db
      .prepare(
        'SELECT 1 AS liked FROM article_likes WHERE slug = ? AND voter_id = ? LIMIT 1'
      )
      .bind(slug, voterId)
      .first()
    liked = Boolean(row?.liked)
  }

  return {
    likes: Number(countRow?.likes || 0),
    liked,
  }
}

function sameOrigin(request) {
  const origin = request.headers.get('Origin')
  if (!origin) {
    return true
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

export async function onRequestGet({ request, env }) {
  const db = getDatabase(env)
  if (!db) {
    return json({ error: 'Likes database is not configured.' }, 503)
  }

  const url = new URL(request.url)
  const slug = parseSlug(url.searchParams.get('slug'))
  if (!slug) {
    return json({ error: 'Invalid slug.' }, 400)
  }

  const rawVoterId = url.searchParams.get('voterId')
  const voterId = rawVoterId ? parseVoterId(rawVoterId) : null
  if (rawVoterId && !voterId) {
    return json({ error: 'Invalid voterId.' }, 400)
  }

  try {
    return json(await getLikeState(db, slug, voterId))
  } catch (error) {
    console.error('Failed to read likes', error)
    return json({ error: 'Failed to read likes.' }, 500)
  }
}

export async function onRequestPost({ request, env }) {
  const db = getDatabase(env)
  if (!db) {
    return json({ error: 'Likes database is not configured.' }, 503)
  }

  if (!sameOrigin(request)) {
    return json({ error: 'Cross-origin requests are not allowed.' }, 403)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const slug = parseSlug(body?.slug)
  const voterId = parseVoterId(body?.voterId)
  const liked = body?.liked

  if (!slug || !voterId || typeof liked !== 'boolean') {
    return json({ error: 'Invalid request.' }, 400)
  }

  try {
    if (liked) {
      await db
        .prepare(
          'INSERT OR IGNORE INTO article_likes (slug, voter_id) VALUES (?, ?)'
        )
        .bind(slug, voterId)
        .run()
    } else {
      await db
        .prepare('DELETE FROM article_likes WHERE slug = ? AND voter_id = ?')
        .bind(slug, voterId)
        .run()
    }

    return json(await getLikeState(db, slug, voterId))
  } catch (error) {
    console.error('Failed to update likes', error)
    return json({ error: 'Failed to update likes.' }, 500)
  }
}
