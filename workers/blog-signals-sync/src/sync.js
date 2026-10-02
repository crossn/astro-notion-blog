import { JWT } from 'google-auth-library'

const ANALYTICS_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,199}$/
const GA_ROW_LIMIT = 100
const SNAPSHOT_LIMIT = 20

export function normalizeBasePath(value) {
  if (typeof value !== 'string') throw new Error('Invalid site base path.')
  const parts = value.split('/').filter(Boolean)
  if (parts.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part))) {
    throw new Error('Invalid site base path.')
  }
  return parts.length ? `/${parts.join('/')}` : ''
}

export function getConfig(env) {
  const propertyId = String(env?.GA_PROPERTY_ID || '')
  const hostname = String(env?.SITE_HOSTNAME || '').toLowerCase()
  const basePath = normalizeBasePath(env?.SITE_BASE_PATH ?? '')
  const timeZone = String(env?.GA_TIME_ZONE || '')

  if (!/^[0-9]+$/.test(propertyId)) throw new Error('Invalid GA property ID.')
  if (!/^[a-z0-9.-]+$/.test(hostname) || hostname.startsWith('.')) {
    throw new Error('Invalid site hostname.')
  }
  // Intl rejects unknown time zones; the date calculation uses this same setting.
  new Intl.DateTimeFormat('en-US', { timeZone })

  return { propertyId, hostname, basePath, timeZone }
}

function shiftUTCDate(date, days) {
  const result = new Date(`${date}T12:00:00.000Z`)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString().slice(0, 10)
}

export function getDateRange(now, timeZone) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new Error('Invalid sync time.')
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  const localToday = `${values.year}-${values.month}-${values.day}`
  const periodEnd = shiftUTCDate(localToday, -1)
  return {
    periodStart: shiftUTCDate(periodEnd, -27),
    periodEnd,
  }
}

export function getArticleSlug(path, basePath) {
  if (typeof path !== 'string') return null
  const prefix = `${basePath}/blog/`
  if (!path.startsWith(prefix)) return null
  const remainder = path.slice(prefix.length)
  const slug = remainder.endsWith('/') ? remainder.slice(0, -1) : remainder
  return SLUG_PATTERN.test(slug) ? slug : null
}

export function buildGARequest(config, range) {
  return {
    dimensions: [{ name: 'hostName' }, { name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    dateRanges: [{ startDate: range.periodStart, endDate: range.periodEnd }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: 'hostName',
              stringFilter: { matchType: 'EXACT', value: config.hostname },
            },
          },
          {
            filter: {
              fieldName: 'pagePath',
              stringFilter: {
                matchType: 'BEGINS_WITH',
                value: `${config.basePath}/blog/`,
              },
            },
          },
        ],
      },
    },
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: String(GA_ROW_LIMIT),
  }
}

export async function getGAToken(secret) {
  let credentials
  try {
    credentials = JSON.parse(secret)
  } catch {
    throw new Error('Invalid GA service account secret.')
  }
  if (
    typeof credentials?.client_email !== 'string' ||
    typeof credentials?.private_key !== 'string' ||
    !credentials.client_email ||
    !credentials.private_key
  ) {
    throw new Error('Invalid GA service account secret.')
  }
  const client = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [ANALYTICS_SCOPE],
  })
  const { token } = await client.getAccessToken()
  if (!token) throw new Error('GA authentication failed.')
  return token
}

export async function fetchGAReport(config, range, token, fetchImpl = fetch) {
  const response = await fetchImpl(
    `https://analyticsdata.googleapis.com/v1beta/properties/${config.propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildGARequest(config, range)),
    }
  )
  if (!response.ok) throw new Error(`GA report request failed (${response.status}).`)
  return response.json()
}

function validReportRows(report) {
  if (
    !report ||
    !Number.isSafeInteger(report.rowCount) ||
    report.rowCount < 0 ||
    report.dimensionHeaders?.map((header) => header.name).join(',') !==
      'hostName,pagePath' ||
    report.metricHeaders?.map((header) => header.name).join(',') !==
      'screenPageViews'
  ) {
    throw new Error('Invalid GA report metadata.')
  }
  const rows = report.rows ?? (report.rowCount === 0 ? [] : null)
  if (!Array.isArray(rows) || rows.length > report.rowCount) {
    throw new Error('Invalid GA report rows.')
  }
  if (report.rowCount > 0 && rows.length === 0) {
    throw new Error('Missing GA report rows.')
  }
  return rows
}

export function normalizeGAReport(report, config) {
  const rows = validReportRows(report)
  const totals = new Map()

  for (const row of rows) {
    const hostname = row?.dimensionValues?.[0]?.value
    const path = row?.dimensionValues?.[1]?.value
    const rawViews = row?.metricValues?.[0]?.value
    if (typeof hostname !== 'string' || hostname.toLowerCase() !== config.hostname) {
      continue
    }
    const slug = getArticleSlug(path, config.basePath)
    if (!slug || !/^(0|[1-9][0-9]*)$/.test(String(rawViews))) continue
    const views = Number(rawViews)
    if (!Number.isSafeInteger(views) || views === 0) continue
    const total = (totals.get(slug) || 0) + views
    if (!Number.isSafeInteger(total)) throw new Error('GA views overflow.')
    totals.set(slug, total)
  }

  if (report.rowCount > 0 && totals.size === 0) {
    throw new Error('GA report had no usable article rows.')
  }
  return [...totals]
    .map(([slug, views]) => ({ slug, views }))
    .sort((a, b) => b.views - a.views || a.slug.localeCompare(b.slug, 'en'))
    .slice(0, SNAPSHOT_LIMIT)
}

export async function writeSnapshot(db, rows, metadata) {
  if (!db || typeof db.batch !== 'function') throw new Error('D1 is not configured.')
  if (!Array.isArray(rows) || (rows.length === 0 && !metadata.validEmpty)) {
    throw new Error('Refusing to write an unverified empty snapshot.')
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(metadata.periodStart) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(metadata.periodEnd) ||
    !Number.isFinite(Date.parse(metadata.generatedAt))
  ) {
    throw new Error('Invalid snapshot metadata.')
  }

  const upsert = db.prepare(`
    INSERT INTO blog_read_signals (slug, views, period_start, period_end, generated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      views = excluded.views,
      period_start = excluded.period_start,
      period_end = excluded.period_end,
      generated_at = excluded.generated_at
  `)
  const statements = rows.map(({ slug, views }) =>
    upsert.bind(
      slug,
      views,
      metadata.periodStart,
      metadata.periodEnd,
      metadata.generatedAt
    )
  )
  statements.push(
    db
      .prepare('DELETE FROM blog_read_signals WHERE generated_at <> ?')
      .bind(metadata.generatedAt)
  )
  const results = await db.batch(statements)
  if (results.some((result) => result?.success === false)) {
    throw new Error('D1 snapshot update failed.')
  }
}

export async function syncReadSignals(
  env,
  { now = new Date(), fetchImpl = fetch, tokenProvider = getGAToken } = {}
) {
  const config = getConfig(env)
  if (!env?.BLOG_SIGNALS_DB?.batch) throw new Error('D1 is not configured.')
  const range = getDateRange(now, config.timeZone)
  const token = await tokenProvider(env.GA_SERVICE_ACCOUNT_JSON)
  const report = await fetchGAReport(config, range, token, fetchImpl)
  const rows = normalizeGAReport(report, config)
  await writeSnapshot(env.BLOG_SIGNALS_DB, rows, {
    ...range,
    generatedAt: now.toISOString(),
    validEmpty: report.rowCount === 0,
  })
  return { received: report.rows?.length ?? 0, saved: rows.length }
}
