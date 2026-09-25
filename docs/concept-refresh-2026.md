# tsukurun-Lab Concept Refresh 2026

This branch is reserved for the tsukurun-Lab site concept refresh.

## Source of truth

The design concept and implementation phases are maintained in Notion:

https://app.notion.com/p/3e0d5238b58c815abdc9d91c08c0ddf6

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

Improve:
- TOP page composition
- Blog index composition
- Article detail framing around the content
- shared visual language between TOP and Blog
- reversible Like interaction in a later phase

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

## Implementation phases

0. Design audit only
1. Shared design foundation
2. TOP page
3. Blog index
4. Blog article
5. Reversible Like
6. Pre-flight / QA

Do not skip the review gate between phases.

## Git rules

- Base: `main`
- Working branch: `feat/concept-refresh-2026`
- Keep this work isolated from `feat/reversible-blog-likes` / PR #16
- Do not merge PR #16 into this branch
- Keep unrelated refactors out
- Preserve easy rollback by keeping changes scoped and reviewable

## Phase 0 rule

Phase 0 is audit-only.

Before implementing layout or styling changes, inspect the current code and report:
- current brand tokens
- layout / typography / spacing / radius / shadow patterns
- TOP / Blog index / article IA
- preserve / retire candidates
- PC / mobile issues
- URLs / SEO / navigation that must not change

Implementation begins only after human review of the audit.
