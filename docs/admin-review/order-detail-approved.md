# Approved order detail delivery

This step 11 update implements the selected two-column order detail concept at `/admin/orders/[id]`, using the existing admin light palette and shell.

- The header shows the original order reference with clipboard copy, Tehran timestamp, separate order/payment badges and a return link retaining validated list filters and pagination.
- The progress indicator reflects actual fulfillment state. Cancelled orders show an explicit cancellation message and recorded timestamp instead of a misleading completion path.
- Products retain their order-time names, images, quantities and prices. The financial summary uses stored order totals without client-side money calculations.
- Products and the newest-first timeline occupy the main desktop column. Next-step actions, customer/shipping information and payment details occupy the contextual column. On mobile the next action precedes products, with every card fitting the viewport.
- History combines recorded status changes and the payment timestamp, with named actors where available. Payment identifiers use a native disclosure; clipboard controls copy original identifiers and contact values.
- Actions use the existing guarded server action and transition service. An unpaid pending order offers cancellation only; paid pending orders can begin processing, processing orders can ship, shipped orders can be delivered, and terminal orders have no further transitions.
- Cancellation requires a native modal confirmation with initial focus on the safe action and Escape support. The message explains stock restoration and, for paid orders, that cancellation does not automatically refund payment.

Validation passed: `npm run lint`, `npm run typecheck`, `npm run build` and all 471 tests via `npm run test -- --maxWorkers=4 --hookTimeout=60000` with `MONGOMS_RUNTIME_DOWNLOAD=false` (the established isolated database test setup).

`tests/admin-order-detail-browser.mjs` checks the production app against its own temporary database: guest guard, invalid ID, real status changes and history actor, tampered unpaid transition rejection, cancellation confirmation/Escape and one-time stock restoration, terminal states, missing customer/items/history, clipboard values, payment disclosure, filter-preserving return links, and no page overflow at 360/768/1024/1440 pixels. Desktop and mobile screenshots were visually compared with the selected concept: [desktop](order-detail-approved-1440.png), [mobile](order-detail-approved-360.png).

Acceptance for this step 11 enhancement passed, including rejection of prohibited order transitions. No subsequent SPEC stage, deployment, refund provider or shipment tracking subsystem is introduced. Other pre-existing work in the users/authentication files is preserved.
