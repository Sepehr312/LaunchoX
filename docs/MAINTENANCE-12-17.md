# Maintenance review: checklist items 12–17

Requested scope: Sepehr's review checklist items 12–17, authorized by the contributor on 2026-10-21. These numbers are independent of SPEC implementation stages. Items 1–11 and a final release decision remain separate work.

## Changes

- **12 — Legacy code:** approved header, hero, benefits and category components now live under `src/components/store/frostic/`. Production modules no longer import preview components, theme state or mock product fixtures. Product details accepts database products only; preview cart handlers, synthetic feedback and preview-only sections were removed. `SiteTheme`, the startup theme script, the unused older carousel, dark overrides and `light-dark()` alternatives were removed. The existing category test import has a compatibility re-export; product fixtures remain test-only.
- **13 — Footer:** removed sample phone, email, address and unconfigured social links. Site name comes from `NEXT_PUBLIC_SITE_NAME`; optional official contacts use `CONTACT_PHONE`, `CONTACT_EMAIL`, `CONTACT_ADDRESS`. Empty values publish no contact link. The Persian copyright year is formatted on the server in Tehran time.
- **14 — Hero:** the 2,438,906-byte light PNG is replaced by a 204,660-byte WebP (91.6% smaller). The 2,475,636-byte dark asset and its image element are removed. Next Image selects responsive widths; only the initial hero image receives priority. One h1 remains; other slide titles use h2 with identical styling. Reduced-motion and pause behavior are preserved.
- **15 — Admin access queries:** `requireAdmin` uses React `cache()` only within the active server render request. The database role/activity check remains authoritative. There is no persistent cache, TTL, or shared user-role map. Server Actions outside the React render dispatcher still perform their own checks. A local real RSC-render test measures three guard calls as three access-service calls before the change and one afterward, and verifies fresh checks on subsequent requests after demotion, deactivation, deletion and promotion.
- **16 — Documentation:** removed obsolete experimental-route references. README and AGENTS now both identify image upload as an existing implementation awaiting the P0 owner decision and hardening; this PR neither approves that exception nor implements its P0 fixes. Optional contact configuration and current light-only behavior are documented.
- **17 — Repository hygiene:** PNG category assets and admin evidence images are losslessly compressed without changing their paths, dimensions or pixels. Category assets shrink from 11,928,547 to 10,594,831 bytes; PNG admin evidence shrinks from 3,835,804 to 3,773,550 bytes. Logs, generated QA output and reports stay out of commits. New local verification scripts/tests are excluded from this delivery at the contributor's request; existing shared test files are preserved.

## Review and responsibility

Human contributor/account: `kaelor-1969`; implementation assistance: Codex. Sepehr reviews the PR and decides integration into `main`. This work is delivered on `codex/storefront-maintenance`, based on `f64cc20`; no direct main upload or merge is part of this delivery. PR #12 is already merged in that base. An existing remote branch `codex/fix-stale-jwt-role` addresses separate auth work and is left untouched.

Follow-up commits use descriptive maintenance prefixes instead of restarting `step 11`. Sepehr can confirm or adjust the convention during review. Shared layout, CSS, environment and authentication changes are explicitly listed in the PR because they affect multiple contributors.

## Verification (2026-10-22)

- Lint, TypeScript and production build passed. All 479 existing tests still pass; seven local follow-up tests bring the local total to 486 passing tests across 44 files. New test files are not included in this PR.
- Browser checks passed for seven storefront routes at widths 360, 768 and 1440 (21 checks), and four admin routes at widths 360 and 1440 (8 checks). Dark browser preference and an old dark localStorage value still render the light UI. Checks include one h1, no horizontal page overflow, correct benefit-bar layout, gallery controls, official-contact omission and live footer destinations. Desktop/mobile screenshots were inspected and remain local.
- Guest cart creation, customer login/cart merge and checkout passed on the production build; fake payment is correctly blocked there. The complete successful fake-payment flow and order history passed separately in development, using an isolated temporary database.
- The real React server-render harness passed its 3-to-1 access-query comparison and all cross-request role/activity/deletion checks. Every changed PNG (42 files) was decoded and compared with its Git base; pixels and dimensions are identical.
- A local cold-browser mobile measurement at 360px, disabled browser cache, 150ms network latency, 200,000 bytes/s download and 4x CPU slowdown recorded LCP 2,324ms and 650,741 transferred resource bytes. This is a single local measurement, not a deployed field-performance result or a before/after LCP comparison.

## Release limits

Passing checks for this PR does not close the P0 security, pagination, data and feature-approval items elsewhere in the checklist. Official contact details and optional feature decisions still require the project owner's input. Current upload routes remain a release blocker until the separate P0 decision and security work are complete.
