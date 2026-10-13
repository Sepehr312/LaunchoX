# Customer UI verification

Branch: `ui/customer`.

The existing application flow is retained. Customer presentation is light-only and uses the existing light CSS palette. Shared root layout, global CSS, UI primitives, types, actions, services, and models are unchanged. This intentionally overrides the SPEC dark-mode suggestion for customer pages, following the user's instructions.

## Verified

- `npm run lint`: passed without warnings.
- `npm run typecheck`: passed.
- `npm run test`: 26 files, 290 tests passed. MongoDB tests used independently created databases through the local official MongoDB binary.
- `npm run build -- --webpack`: passed. Default Turbopack build could not open its internal port in the execution environment; the initial network-restricted run also could not fetch Google Fonts.
- HTTP checks: guest login, registration, empty cart, protected-account redirect, sample-customer login, profile, address list, order list, and empty checkout passed.
- UI rendering tests: login/registration fields and error state; password privacy; payment/delivery status distinctions; cart quantity boundaries and submitted values; checkout address requirement and five-address capacity; empty-state actions; profile/security/address/order page composition; successful, failed, and pending payment result pages with links to the owned order.
- Existing browser acceptance scripts were updated for the new field labels, collapsed address forms, password visibility buttons, and cart quantity controls. Their Python syntax checks passed.

## Manual verification remaining

Native browser automation was unstable: window focus changed during actions, its connection closed, and screenshot content did not consistently match accessibility state. Some account/address content was inspected, but a complete interactive acceptance run and visual checks at 360 pixels were not completed. The updated browser acceptance scripts have not been executed. Do not treat automated rendering checks as a completed browser walkthrough.

## Deliberate limitations

- The remember option retains only the email for the browser session; authentication-session duration is unchanged.
- Delivery estimates are unavailable in the current backend, so the UI reports that the estimate has not yet been announced.
- Payments continue to use the existing fake provider. No real gateway or OTP was added.
