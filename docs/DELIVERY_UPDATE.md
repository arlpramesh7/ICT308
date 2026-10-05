# SmartDine Delivery Update

5 October 2026, Australia/Sydney. The previous deadline restriction was cancelled. This technical state supersedes earlier incomplete-ordering snapshots.

## Implemented and Pushed
- SMAR-41 / d757fb1: photographic discovery, search, clickable restaurant detail pages and complete grouped menus with availability.
- SMAR-7 / 5b26fa9: persisted private favourites, red filled selected state and save/remove toggle.
- SMAR-42 / 818b65e: paginated review browsing and editable current customer rating.
- SMAR-43 / 7494b42: persisted account-owned cart, quantity/removal, totals, pickup checkout, unique order number, confirmation, private history and assigned staff/owner status controls.
- SMAR-44 / a1a7802: pickup control sizing, accurate order audit labels, privacy disclosure and removal of retry keys from responses.

The existing Express/SQLite architecture and data were preserved. Cart/order tables are added by orderService initialization; no database reset is required. Order prices/names are snapshots. Checkout recalculates from the current menu in integer cents and rejects stale cart revisions, unavailable items and closed venues. An account-scoped UUID retry key prevents duplicates. One restaurant, maximum 20 units per item and 50 units per order.

## Verified
128 automated tests passed, zero failures/cancellations/skips, 3.883 seconds in evidence/final-tests.txt. This includes 25 ordering integration/security cases and three phone-rule unit tests.

Browser QA exercised menu add, cart count, increment/decrement, removal and reload persistence, checkout, confirmation and history. SD-20261005-4BBCBC85 totalled $22.50 and progressed through all five stages using staff and owner accounts. Seeded customer order SD-20261005-2AF92E03 totalled $19.00, persisted after server restart and could not access the other customer's order. Customer/staff/owner seed logins all worked without bypasses or password resets. Staff menu save, availability enable/disable and promotion save; owner analytics refresh; preferences, vegan exclusions, search, favourites, reviews and geofence offers were rechecked.

390 px cart/checkout/confirmation had no horizontal overflow. Console checks returned no errors/warnings on the tested journeys. All six local cuisine photographs loaded in prior discovery checks. Genuine screenshots 28-40 are in docs/screenshots.

CI passed for a1a780238d3a31dd1312c05a2b5b95fbb01d6fd8:
https://github.com/arlpramesh7/ICT308/actions/runs/37264779907
Documentation commits require their own CI check; the final handoff records the latest run.

## Customer UX Increment
116039d adds authenticated display names and optional Australian phone validation; 52ed1f9 adds confirmed atomic restaurant switching; 5a9dda7 tightens formatting edge cases and labels. All were tested and pushed immediately. Inline invalid-phone focus, blank/valid checkout, Cancel/confirmed switching, persisted quantity badges and seven mobile customer views were browser verified. Orders SD-20261005-1C9AC901 ($129.50, blank phone) and SD-20261005-39B58DF4 ($38.00, Australian mobile) persisted. The latter completed all five stages through staff and owner portals. Existing personal data/accounts and review text were not reset. Personal-account login was not attempted without its private password; reproducible local customer credentials were used.

Latest functional CI passed for 5a9dda7: https://github.com/arlpramesh7/ICT308/actions/runs/37266735649 . Screenshots 42-48 record inline validation, cart confirmation and final mobile/role checks.

## Run and Accounts
Node.js 24. From the repository root run npm ci, npm run setup, npm start; open http://localhost:4000. Setup is idempotent, disabled in production and does not reset existing passwords.

| Role | Email | Local test password |
|---|---|---|
| Customer | customer@smartdine.test | SmartDine-Demo26! |
| Staff | staff@smartdine.test | SmartDine-Demo26! |
| Owner | owner@smartdine.test | SmartDine-Demo26! |

Staff and owner are assigned to The Spice Tailor. There is no separate admin role. Public registration creates only customers.

## Release Boundaries
Pickup only. No real payments, drivers, live delivery tracking or transmission to external restaurants. Checkout/confirmation explicitly disclose this. Free-text offers are not automatically deducted and are confirmed separately at pickup. Fixtures/sample reviews are disclosed; dietary flags are not allergy guarantees.

PR #2 remains open on feature/SMAR-36-final-delivery, with genuine independent review requested from arlpramesh7. No review approval or merge is claimed. Normal Git pushes work; PR connector writes return 403, while the authenticated browser permits metadata updates.

SMAR-7, SMAR-33 through SMAR-39, SMAR-41, SMAR-42 and SMAR-43 are Done. SMAR-44 is undergoing technical/document packaging review. SMAR-40 remains To Do for human UAT/independent review. React Native/MySQL/Firebase remain future backlog items; Sprint 2 was not closed or altered.

The software journey is working. Student-authored analysis, institutional declarations, missing student ID/contribution/signature fields, genuine human UAT and lecturer access must be confirmed by the team. Factual documentation is updated without manufacturing acceptance or academic authorship.
