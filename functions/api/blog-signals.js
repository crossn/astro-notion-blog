const MAX_SIGNAL_CANDIDATES = 10
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,199}$/

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-store',
    },
  })
}

export async function onRequestGet({ env }) {
  const db = env?.LIKES_DB
  if (!db) {
    return json({ error: 'Likes database is not configured.' }, 503)
  }

  try {
    const result = await db
      .prepare(
        `SELECT slug, COUNT(*) AS value
         FROM article_likes
         GROUP BY slug
         ORDER BY value DESC, slug ASC
         LIMIT ?`
      )
      .bind(MAX_SIGNAL_CANDIDATES)
      .all()

    const signals = (Array.isArray(result?.results) ? result.results : [])
      .map((row) => ({
        kind: 'reaction',
        slug: typeof row?.slug === 'string' ? row.slug : '',
        value: Number(row?.value),
      }))
      .filter(
        (signal) =>
          SLUG_PATTERN.test(signal.slug) &&
          Number.isSafeInteger(signal.value) &&
          signal.value > 0
      )

    return json(
      {
        version: 1,
        generatedAt: new Date().toISOString(),
        signals,
      },
      200
    )
  } catch {
    return json({ error: 'Failed to read blog signals.' }, 500)
  }
}
