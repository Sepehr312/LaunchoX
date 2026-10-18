# Customer UI verification

Branch: `ui/customer`. Scope: corrective maintenance of customer UI, not a new SPEC implementation step. This report supersedes the earlier incomplete browser verification report.

## Changes

- Customer error boundaries directly export the existing shared `ErrorState`; its retry refreshes server components and resets the boundary. The duplicate `CustomerError` was removed.
- Customer CSS no longer copies the global palette or overrides the body background. It uses the shared light tokens and background in `globals.css`, following `DESIGN-SYSTEM.md` and `UI-DIRECTION.md`.
- Order lists and details share delivery messaging: unpaid payments have no estimate; paid active orders have the existing approximate week estimate; delivered and cancelled orders show their terminal state.
- The login checkbox explicitly says that only the email is retained until the tab closes. Authentication lifetime is unchanged.
- Obsolete README decisions about theme switching were removed. The final design is light-only; the historical SPEC dark-mode suggestion is superseded by the design documents.
- Admin pages, authentication actions, proxy, services, models, and shared global styles are unchanged.

## Verification

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: 34 files, 419 tests passed.
- `npm run build`: passed using the standard Turbopack build.
- Real Chrome browser regression: `tests/customer-fixes-browser.mjs`, with an isolated randomly named local MongoDB database and a production server on port 3024. The script removes its temporary database and stops its server after each run.
- Viewport: 360 × 800. Product listing, login, profile, addresses, order list, all five order detail states, cart, and checkout have document width equal to viewport width. Screenshots were also visually reviewed.
- With OS appearance set to dark, customer pages still use the same light scheme and body background as the storefront.
- Retry: a deliberately broken order fixture triggers the real error boundary. After repairing the fixture in MongoDB, clicking the shared retry button sends an RSC request and displays a newly changed recipient name without navigating away.
- Ownership: requesting another customer's order returns HTTP 404, satisfying the existing step 10 acceptance condition.
- The email checkbox stores only the email in sessionStorage. No password is persisted.

Screenshots and machine-readable results are in [customer-review](customer-review/results.json). Examples: [login](customer-review/login-360.png), [orders](customer-review/orders-360.png), [error](customer-review/retry-error-360.png), [recovered order](customer-review/retry-recovered-360.png).

Run the browser check with an external Playwright installation and an installed Chrome binary, without adding project dependencies:

```sh
LAUNCHO_PLAYWRIGHT_PATH=/path/to/node_modules/playwright \
LAUNCHO_CHROME_PATH=/path/to/chrome \
node tests/customer-fixes-browser.mjs
```

MongoDB must be running locally on port 27017. Browser fixtures never use the application database. This focused run does not claim to execute all historical Windows-specific browser scripts, or to cover admin UI, real payment, OTP, or every customer form mutation.

## Git

Repository-local author: `dinakhapple-arch <dinakh.apple@gmail.com>`, supplied by the user. This change uses a descriptive fix commit rather than another `step 12` label. Previously merged commits are not rewritten.
