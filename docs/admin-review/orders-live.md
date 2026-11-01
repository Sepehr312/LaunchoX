# Admin orders live-filter delivery

This step 11 update applies the approved orders concept to `/admin/orders` using the existing admin shell, light palette, headings, cards, badges and table components. It does not advance to another SPEC stage.

- Four real, store-wide status counts and status tabs remain visible while the list is filtered.
- Search matches literal order references or current customer names, accepts Persian digits and applies after a 300ms pause. Status, payment and rolling 7/30/90-day filters apply immediately. There are no apply/reset buttons.
- Filters compose, reset pagination, persist in the URL and keep the search focused without a document reload. Native select labels and a polite loading announcement support assistive technology.
- Mobile statistics use two columns. The table scrolls inside its own container; the page fits at 360, 768, 1024 and 1440 pixels.
- Query inputs are validated before database access. The existing admin guard, order transition rules and customer ownership constraints remain enforced.

Validation: `npm run lint`, `npm run typecheck`, `npm run build`, and all 470 tests passed. The test run used `npm run test -- --maxWorkers=4 --hookTimeout=60000` with `MONGOMS_RUNTIME_DOWNLOAD=false`; the default run passed all test assertions but encountered a database teardown timeout after an invalid MongoDB download. No application database was used by the unit tests.

`tests/admin-orders-live-browser.mjs` uses its own temporary database and production server. It verifies guest access, live search and combined filters, Persian references, focus retention, no document reload, pagination and history, reload persistence, invalid queries, empty results and four viewport widths. Set `LAUNCHO_PLAYWRIGHT_PATH` to a QA Playwright installation when it is not available locally. Screenshots: [desktop](orders-live-1440.png) and [mobile](orders-live-360.png).

Acceptance for this update: real order filtering, valid/invalid input handling, responsive layout and existing order transition/ownership tests passed. The original step 11 product/category workflows are outside this UI update; their existing automated tests passed in the full suite.
