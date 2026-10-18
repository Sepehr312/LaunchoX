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
- `npm run test`: 34 files, 420 tests passed.
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

## Account audit fixes

The follow-up customer-only audit findings are fixed without changes to admin, authentication actions, proxy, models, services, dependencies, or global styles.

- `AccountForm` cancels implicit form resets and permits explicit resets only after successful additions and password changes. Both uncontrolled profile drafts and controlled address drafts survive server-side rejection. Successful password changes still clear all password fields.
- Address editor fields remount when the saved address DTO changes. Reopening and saving again preserves the latest saved address instead of restoring old data.
- The account layout loads the current profile for its greeting rather than the original session name.
- Customer-scoped text wrapping contains long unbroken addresses at 360px. The existing copy-order control now has a 44px touch target.
- The login email preference updates immediately when checked/unchecked or when its selected email changes; it uses normalized validated email values. Unchecking keeps the current visible input but removes storage immediately. Registration does not mutate this preference. Closing the tab clears it.

Additional real-browser coverage: `tests/customer-account-browser.mjs` runs eleven regression groups using mobile/touch emulation, isolated temporary customers, and the production build. It exercises duplicate-mobile rejection, successful profile updates, repeated address saves, successful address resets, a simulated concurrent address-capacity rejection, long addresses, copy sizing, failed and successful password changes, and email preference lifecycle. Long-content layouts pass at 360, 768, 1024, and 1440px. Results and screenshots: [account fixes](customer-review/account-fixes/results.json).

The account regression script accepts external tool paths as arguments, keeping application environment access in `src/lib/env.ts`:

```sh
node tests/customer-account-browser.mjs /path/to/node_modules/playwright /path/to/chrome
```

## Customer account navigation

The account navigation now occupies the right column on desktop (1024px and wider), can collapse to a 64px control, and returns to the expanded 240px column without changing the active page. On narrower screens, the page starts with a `منوی حساب` button instead of the full card above the content. It opens a native modal drawer on the right using the same server-rendered greeting, navigation, and logout action.

The drawer closes through its close button, Escape, backdrop click, a navigation link, or resizing to desktop. Background scrolling is restored on close/unmount, keyboard focus cycles within the drawer, and the trigger regains focus. No new persistence, service, dependency, authentication behavior, or admin change was introduced.

`tests/customer-navigation-browser.mjs` verifies desktop placement/collapse, active links, modal focus, all close paths, resizing, logout, design breakpoint widths, and real touch emulation at 360×800 plus access to actions at 360×480. Screenshots were visually reviewed. Evidence: [navigation results](customer-review/navigation/results.json), [desktop expanded](customer-review/navigation/desktop-expanded.png), [desktop collapsed](customer-review/navigation/desktop-collapsed.png), [mobile open](customer-review/navigation/mobile-touch-open.png), [mobile closed](customer-review/navigation/mobile-closed.png).

```sh
node tests/customer-navigation-browser.mjs /path/to/node_modules/playwright /path/to/chrome
```
