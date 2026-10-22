# Maintenance review: checklist items 12–17

Requested scope: Sepehr's review checklist items 12–17, authorized by the contributor on 2026-10-21. These numbers are independent of SPEC implementation stages. Items 1–11 and a final release decision remain separate work.

## Changes

- **12 — Legacy code:** approved header, hero, benefits and category components now live under `src/components/store/frostic/`. Production modules no longer import preview components, theme state or mock product fixtures. Product details accepts database products only; preview cart handlers, synthetic feedback and preview-only sections were removed. `SiteTheme`, the startup theme script, the unused older carousel, dark overrides and `light-dark()` alternatives were removed. Existing category and light-only header test imports have compatibility adapters; product fixtures remain test-only.
- **13 — Footer:** removed sample phone, email, address and unconfigured social links. Site name comes from `NEXT_PUBLIC_SITE_NAME`; optional official contacts use `CONTACT_PHONE`, `CONTACT_EMAIL`, `CONTACT_ADDRESS`. Empty values publish no contact link. The Persian copyright year is formatted on the server in Tehran time.
- **14 — Hero:** the 2,438,906-byte light PNG is replaced by a 204,660-byte WebP (91.6% smaller). The 2,475,636-byte dark asset and its image element are removed. Next Image selects responsive widths; only the initial hero image receives priority. One h1 remains; other slide titles use h2 with identical styling. Reduced-motion and pause behavior are preserved.
- **15 — Admin access queries:** `requireAdmin` uses React `cache()` only within the active server render request. The database role/activity check remains authoritative. There is no persistent cache, TTL, or shared user-role map. Server Actions outside the React render dispatcher still perform their own checks. The integration keeps main's fresh database checks in getCurrentUser and caches requireAdmin only within a server-render request; it does not add the older PR's redundant second access query. Existing role/activity/deletion and action guard tests remain unchanged.
- **16 — Documentation:** removed obsolete experimental-route references. The approved integration preserves the later main approval and completed image-upload security/lifecycle policy in README and AGENTS. The original PR predates that work. Optional contact configuration and current light-only behavior are documented.
- **17 — Repository hygiene:** PNG category assets and admin evidence images are losslessly compressed without changing their paths, dimensions or pixels. Category assets shrink from 11,928,547 to 10,594,831 bytes; PNG admin evidence shrinks from 3,835,804 to 3,773,550 bytes. Logs, generated QA output and reports stay out of commits. New local verification scripts/tests are excluded from this delivery at the contributor's request; existing shared test files are preserved.

## Review and responsibility

Original contributor: `kaelor-1969`, on `codex/storefront-maintenance`, commit `57c4f03` (PR #14). The approved integration is delivered by `Sepehr312` on `refactor/maintenance-12-17-integrated`, based directly on `48b8676`. Implementation and integration were assisted by Codex. Sepehr approved the preview appearance and behavior and explicitly authorized a `refactor:` integration commit and a replacement PR. No merge into main is authorized by this delivery.

## Integration resolutions

- AGENTS and README retain the later owner-approved image-upload policy, APNG rejection, trusted image origins, bounded requests, transactional references and operator-only cleanup rules. Obsolete upload-approval wording from the old PR is removed.
- The database-backed category component is moved to the production Frostic directory; historical image fallbacks are not restored.
- ProductDetails and its data/pricing contract stay exactly as implemented on main. Unified brands, pagination and comparison security also remain unchanged.
- React request-scoped admin caching is combined with main's current database role/activity checks. Admin actions retain their independent guards.
- The old FrosticHeader test import is supported by a thin light-only adapter; production imports the new component directly.
- All production code and assets are byte-for-byte identical to the approved preview. Only README and this report are updated for final delivery. Local preview instructions, verification helpers, screenshots, credentials and logs are excluded from this commit.

## Validation

The approved preview passed 724 tests across 57 files, lint, typecheck and production build. It also passed 46 browser checks at 360px and 1440px, covering storefront/admin pages, light mode under dark preference, cart/login/checkout, fake payment and image upload. Those browser and fake-payment results belong to the previous isolated preview session; this delivery does not rerun payment or operator cleanup.

The final delivery passed lint, typecheck, all 724 existing tests across 57 files and production build using isolated temporary databases. The test result matches the approved preview. The empty build database generates 18 entries instead of the preview's 42 because its 24 seeded product paths are absent; all application routes remain available. The preservation check confirms 22 sensitive paths match main, including existing tests and dependency manifests, and all 42 optimized PNGs have identical dimensions and decoded pixels.

## Release limits

Official contact values remain optional and must contain approved real details. Image upload is approved and its completed security/lifecycle work on main is preserved. Production release, any database migration and merging this replacement PR still require the appropriate separate owner decision. No migration or operator cleanup is executed by this delivery.
