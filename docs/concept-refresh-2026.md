# tsukurun-Lab Concept Refresh 2026

This branch is reserved for the tsukurun-Lab site concept refresh.

## Source of truth

The design concept and implementation phases are maintained in Notion:

https://app.notion.com/p/3e6d5238b58c81a49bdff2a5a8a2fdf4?pvs=204

Section: `Concept Refresh 2026-09`

Do not duplicate or redefine the full concept in this repository. If the Notion concept changes, treat Notion as authoritative.

## Goal

Keep the current tsukurun-Lab identity while moving away from generic AI-generated page structures.

Preserve:
- white / ivory base
- soft watercolor accents
- generous whitespace
- the current "毎日に、自分らしさを少しずつ。" tone
- actual template artwork and existing FeaturedImage series
- Notion → Astro static blog workflow
- existing article URLs, slugs, tags, pagination, RSS, SEO baseline
- upstream credit to otoyo/astro-notion-blog
- the production Reversible Like implementation and its API, D1, anonymous-token, accessibility, and failure-fallback behavior

Improve:
- TOP page composition
- Blog index composition
- Article detail framing around the content
- shared visual language between TOP and Blog
- visual refinement of the existing Like reaction in Phase 4, without rebuilding its behavior

## Taste Skill guardrails

Use Taste Skill as a design aid, not as a replacement brand.

Preferred:
- design-taste-frontend v2
- redesign-existing-projects
- soft-skill only when useful

Avoid blindly applying aggressive Awwwards-style motion or layout variance.

Current target dials:
- DESIGN_VARIANCE: 6 / 10
- MOTION_INTENSITY: 3 / 10
- VISUAL_DENSITY: 4 / 10

## Production baseline

PR #16, **Blogに取り消せるいいね機能を追加**, has been merged into `main`.
The current production baseline is `main@ab31f4983ece775188c792833a071494be20f141`.

The production Like feature uses Cloudflare Pages Functions + D1 (`LIKES_DB`) with an anonymous token scoped to each article slug. It supports Like / Unlike, restores the state after refresh, and displays `♡` / `♥` with the count. If the API or D1 is unavailable, only the Like UI is hidden; the static article remains available.

Concept Refresh must not recreate or change the Like API contract, D1 storage, anonymous-token model, Like / Unlike behavior, `aria-pressed`, keyboard interaction, or failure fallback. Phase 4 may refresh only the visual presentation (for example watercolor bloom, color, shadow, transition, and surrounding spacing). Blog Signals should use the existing D1 data as the source of truth for “most reacted”; consider an aggregate read path in Phase 3 only if the listing needs it. Do not redesign reaction writes.

## Implementation phases

0. Design Audit — **Complete / approved**
1. Shared Design Foundation
2. TOP
3. Blog Index + Signals
4. Article + Reaction UI
5. Pre-flight

Do not skip the review gate between phases.

## Git rules

- Base: `main`
- Working branch: `feat/concept-refresh-2026`
- Keep unrelated refactors out
- Preserve easy rollback by keeping changes scoped and reviewable

## Phase 0 status

Phase 0 audit is complete and approved. See `docs/concept-refresh-phase0-audit.md`.

The historical Phase 0 audit was performed against `main@1039e1ef7f87e89156eed7607e3272a93149f78d`. The current production baseline is `main@ab31f4983ece775188c792833a071494be20f141`, which includes merged PR #16.

The next human review gate is the small design proposal for Phase 1 Shared Design Foundation. Do not begin implementation until that proposal is reviewed.
