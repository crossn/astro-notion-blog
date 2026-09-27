# Phase 0 Design Audit

Status: **Complete / approved**

Baseline:
- Repository: `crossn/astro-notion-blog`
- Base: `main@1039e1ef7f87e89156eed7607e3272a93149f78d`
- Historical audit baseline: this Phase 0 review was conducted against `main@1039e1ef7f87e89156eed7607e3272a93149f78d`.
- Current production baseline: `main@ab31f4983ece775188c792833a071494be20f141` (PR #16, Reversible Like, merged).
- Working branch: `feat/concept-refresh-2026`
- Mode: **Redesign - Preserve**
- Target dials: **DESIGN_VARIANCE 6 / MOTION_INTENSITY 3 / VISUAL_DENSITY 4**

Source of truth:
https://app.notion.com/p/3e6d5238b58c81a49bdff2a5a8a2fdf4?pvs=204

No production UI implementation was included in Phase 0.

## 1. Current design system

### Typography
- System font stack only. No custom webfont dependency.
- Home hero: large display scale with `clamp()`, tight heading line-height.
- Blog body: `line-height: 1.85`.
- Home descriptive copy: around `line-height: 2`.
- Recent paragraph and Notion Heading 2 spacing adjustments should be preserved.

### Color
There are currently several overlapping accent systems:
- Global navigation/link accent: orange (`#ff7e33`, hover `#f26000`)
- Home decorative/section accent: purple (`#7c6cf2`)
- Home watercolor accents: yellow / purple / mint
- Blog interaction and TOC accent: purple (`#7c6cf2`)
- Notion tags keep their source colors

This is visually compatible, but the role of each accent is not explicit yet.

**Phase 1 direction**
- Orange: primary interaction / navigation accent
- Purple: editorial / structural accent
- Yellow, pink, mint, lavender: decorative watercolor accents
- Notion tag colors: preserve as content metadata

### Shape
- Home uses large radii around 1.4rem-2rem.
- Blog cards use ~18-22px radii.
- Tags use small 3px radii.
- CTA/contact links use pills.

The current site has a useful outer-soft / inner-small-radius hierarchy. Preserve it. Do not turn every control into a pill.

### Shadows
- Home and Blog both use soft purple/warm shadows.
- Blog cards currently have a visible card + offset pseudo-background treatment.

Direction: keep the soft colored shadow language but reduce the feeling that every section is a floating dashboard card.

## 2. Current information architecture

### Global
- Primary navigation: Home / Blog
- Shared Layout contains header, page slot, footer.
- Astro static generation + Notion remains the publishing model.
- `BASE_PATH` is supported by the routing helpers and must remain supported.

### Home
Current order:
1. Hero
2. About
3. Templates
4. Link/contact section
5. Footer

The Home page currently does not surface actual recent Blog content.

### Blog index
Current order:
- Repeated full post cards
  - Date
  - Tags
  - Title
  - FeaturedImage
  - Excerpt
  - Read more
- Pagination
- Sidebar
  - Recommended
  - Tags

The same post-card composition is repeated in:
- `/blog`
- `/blog/page/:page`
- `/blog/tag/:tag`
- `/blog/tag/:tag/page/:page`

This duplication is the biggest implementation risk for the Blog index redesign. Phase 3 should create a reusable editorial listing structure before styling all routes independently.

### Blog article
Desktop:
- left rail: same-category / recommended / recent / tags
- center: article
- right rail: sticky TOC

Responsive:
- below ~980px the left rail moves below the article
- below ~700px the TOC is hidden

The TOC already has active-section tracking, compact behavior around 1320px, keyboard focus states, and scrolling logic. Preserve the behavior; only reconsider its visual weight later.

## 3. Strong patterns to preserve

1. **Brand copy**
   - 「毎日に、自分らしさを少しずつ。」
   - calm, personal, non-salesy writing

2. **Real visual material**
   - actual template artwork
   - existing Blog FeaturedImage series
   - watercolor palette

3. **Whitespace**
   - Home already feels light rather than crowded
   - Blog body line-height and paragraph rhythm are now in a good state

4. **Static-first architecture**
   - Notion -> Astro static build
   - dynamic behavior should remain isolated

5. **Article reading behavior**
   - current Notion block renderer
   - current paragraph spacing
   - current Heading 2 spacing
   - TOC active tracking

6. **Upstream attribution**
   - retain otoyo/astro-notion-blog credit

## 4. Patterns to restructure

### Home
- Retire the generic "copy left / image right" feeling of the current Hero.
- Retire equal-priority 3-column product cards as the only product rhythm.
- Add an actual "From the Lab" Blog section.
- Connect products and writing so the site feels like one Lab rather than shop + separate Blog.

### Blog index
- Retire repeating identical large post cards.
- Use one lead story, then lighter editorial rows.
- Reduce sidebar card weight.
- Hide the Recommended section when there are no ranked posts instead of showing an empty-state message.
- Make tag discovery lighter on desktop and mobile.

### Article
- Keep the reading surface calm.
- Reduce card/dashboard framing around the article and rails.
- Reconsider FeaturedImage placement at the article top, but compare with the current OGP-only/detail behavior before deciding.
- Redesign the reading-end area as one coherent sequence: Tags -> Reaction -> Related/Prev/Next -> Back to list.

## 5. Technical / semantic findings to resolve during refresh

These are existing baseline findings, not reasons to expand Phase 0 into implementation.

### P0 - preserve / verify before layout work
- Preserve all current public routes and slugs.
- Preserve `BASE_PATH` support.
- Preserve pagination and tag routes.
- Preserve Notion block output and heading anchors.
- Do not add Tailwind, React, Motion, or GSAP just for this refresh.
- With MOTION_INTENSITY 3, prefer CSS transitions and small progressive enhancements.

### P1 - shared foundation candidates
- Design tokens are currently scattered across `Layout.astro`, `index.astro`, Blog CSS, and component-local styles.
- Interaction accents are not clearly role-separated: orange, purple, and black are all used as action colors.
- Global reduced-motion handling is not present.
- Header active state only compares exact paths, so nested Blog pages do not naturally read as "Blog active".
- Footer spacing is very large and can be refined as part of the shared foundation.

### P3 - Blog index candidates
- Listing markup is duplicated across index, pagination, tag, and tag-pagination routes.
- `Read more` is English while the surrounding UI is Japanese.
- `PostFeaturedImage` currently uses the generic alt text `post-featured-image`; accessibility semantics should be reviewed.
- Pagination visual treatment is legacy compared with the newer Home/Blog visual language.
- Verify the duplicate `getPostsByPage` import currently present in `src/pages/blog/page/[page].astro` before implementation work.

### P4 - article semantics
Current heading output is visually intentional but semantically offset:
- Post title component renders `h3`
- Notion Heading 1 -> `h3`
- Notion Heading 2 -> `h4`
- Notion Heading 3 -> `h5`
- Notion Heading 4 -> `h6`

The site header also renders the site name as `h1`.

During Phase 4, review document outline semantics without changing the visual hierarchy or anchor behavior by accident.

## 6. Mobile audit

### Preserve
- Single-column product fallback
- Blog article rail moving below content
- TOC disappearing on narrow screens
- current body typography rhythm

### Refresh goals
- Home Hero should not depend on fragile absolute positioning.
- Asymmetric Works layout should collapse deliberately, not become a random stack.
- Blog tags should become a light horizontal row/rail rather than a large sidebar card.
- Featured story should remain compact enough that the first screen still communicates "this is the Blog".
- Any reaction motion must respect `prefers-reduced-motion`.

## 7. Approved direction for the next phases

### Phase 1 - Shared Design Foundation
Allowed:
- consolidate color/spacing/radius/shadow tokens
- unify interaction/focus language
- reduced-motion baseline
- refine header/footer
- prepare reusable layout primitives
- prepare shared reaction color, motion, and reduced-motion tokens if useful

Not allowed yet:
- major Home IA change
- Blog listing redesign
- article body redesign
- Like backend or behavior reimplementation; preserve the production API, D1, token, state, accessibility, and failure-fallback behavior
- new frontend framework

### Phase 2 - TOP
Target:
**studio entrance -> short Lab note -> asymmetric Works shelf -> From the Lab -> quiet exits**

### Phase 3 - Blog Index + Signals
Target:
**editorial contents page**, not repeated card feed.

Signals: Latest uses existing post data; “よく読まれている” considers GA4 Data API first; “反応が多い” uses the existing D1 Like data as the source of truth. Add an aggregate read path only if the listing needs one. Keep static generation and let a Signals failure leave the normal article list available.

### Phase 4 - Article + Reaction UI
Target:
**quiet reading surface with lighter editorial rails**.
Refresh the existing Like presentation only (such as watercolor bloom, color, shadow, transition, and surrounding spacing). Preserve the current API contract, D1, anonymous token, Like / Unlike, state restore, `aria-pressed`, keyboard operation, and failure fallback.

### Phase 5 - Pre-flight
Verify brand fidelity, URLs/slugs, SEO, BASE_PATH, tags, pagination, RSS, mobile, keyboard, reduced motion, Like regression, Lighthouse, lint, build, and physical-device behavior.

## 8. Human review gate

The five Phase 0 decisions below are **approved**:

1. Keep target dials at **6 / 3 / 4**.
2. Keep **orange as primary interaction** and purple/pastels as editorial/decorative accents.
3. Approve Home direction: **small studio / workbench**, not storefront.
4. Approve Blog direction: **editorial index**, not card feed.
5. Keep article body typography and Notion renderer substantially unchanged.

The next gate is human review of the small Phase 1 Shared Design Foundation proposal. Implementation should wait for that review.
