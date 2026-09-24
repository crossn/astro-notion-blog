# Reversible blog likes

This fork keeps article pages statically generated and adds only a small dynamic API through Cloudflare Pages Functions.

The implementation was designed with these references in mind:

- otoyo: https://alpacat.com/posts/how-to-implement-like-button-to-astro-notion-blog
- swimu: https://www.swimu.net/posts/20260507-astro-notion-blog-update-like-button

The tsukurun-Lab version differs in one important point: a reader can remove a like by pressing the button again.

## Why D1 instead of a Notion number property

The original astro-notion-blog example stores a single Like number in Notion and increments it through an API. That is simple, but reversible likes need a way to know whether the same browser has already liked the article.

This implementation stores one anonymous row per article and browser token in D1:

- no name, email address, IP address, user agent, or account ID is stored
- the browser token is generated separately for each article
- the same token cannot create duplicate likes for the same article
- pressing the button again deletes that row, so the count goes back down
- article pages stay statically generated

This is intentionally a lightweight reaction mechanism, not reader identification or analytics.

## 1. Create a D1 database

Example:

```sh
npx wrangler d1 create tsukurun-blog-likes
```

## 2. Apply the schema

Run the SQL in `migrations/0001_article_likes.sql` against the remote database:

```sh
npx wrangler d1 execute tsukurun-blog-likes --remote --file=migrations/0001_article_likes.sql
```

You can also run the SQL from the D1 console in the Cloudflare dashboard.

## 3. Bind D1 to the Pages project

In Cloudflare:

1. Workers & Pages
2. Select the tsukurun-Lab Pages project
3. Settings
4. Bindings
5. Add a D1 database binding
6. Variable name: `LIKES_DB`
7. Select the D1 database created above
8. Configure the binding for Production and Preview as needed
9. Redeploy

The Pages Function reads the database from `context.env.LIKES_DB`.

## 4. Local verification

The normal `npm run dev` command serves Astro only, so the Pages Function is not available there.

After building, use Pages local development when you need to verify the API:

```sh
npm run build
npx wrangler pages dev dist --d1 LIKES_DB=<DATABASE_ID>
```

Apply the schema to the local D1 database before testing it locally.

## API

### GET /api/likes?slug=<slug>&voterId=<optional-uuid>

Returns:

```json
{
  "likes": 3,
  "liked": true
}
```

The voter ID is optional for count-only reads.

### POST /api/likes

Body:

```json
{
  "slug": "example-post",
  "voterId": "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
  "liked": true
}
```

`liked: true` is idempotent because the D1 table has a composite primary key.
`liked: false` removes that browser token's like.

## Privacy and limitations

The token is stored in localStorage under a key scoped to the article slug. A different random token is used for each article so D1 cannot use this feature to connect one reader's reactions across multiple posts.

If a reader clears localStorage, the browser loses the token for the previous like and therefore cannot remove that older row later.

This is not intended as strong abuse prevention. A determined client can generate many new tokens. If that becomes a real problem, consider Cloudflare Turnstile or rate limiting as a separate layer rather than adding invasive reader tracking here.
