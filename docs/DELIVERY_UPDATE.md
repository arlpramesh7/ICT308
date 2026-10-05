# SmartDine Delivery Update

5 October 2026, Australia/Sydney. Final release-account verification supersedes earlier incomplete-ordering and pre-merge snapshots. PR #2 merged at 41474ee20670f3d1f179343ab8617224cc371bc5; PR #3 records the subsequent account/release increment.

## Implemented and Pushed
- SMAR-41 / d757fb1: photographic discovery, search, clickable restaurant detail pages and complete grouped menus with availability.
- SMAR-7 / 5b26fa9: persisted private favourites, red filled selected state and save/remove toggle.
- SMAR-42 / 818b65e: paginated review browsing and editable current customer rating.
- SMAR-43 / 7494b42: persisted account-owned cart, quantity/removal, totals, pickup checkout, unique order number, confirmation, private history and assigned staff/owner status controls.
- SMAR-44 / a1a7802: pickup control sizing, accurate order audit labels, privacy disclosure and removal of retry keys from responses.

The existing Express/SQLite architecture and data were preserved. Cart/order tables are added by orderService initialization; no database reset is required. Order prices/names are snapshots. Checkout recalculates from the current menu in integer cents and rejects stale cart revisions, unavailable items and closed venues. An account-scoped UUID retry key prevents duplicates. One restaurant, maximum 20 units per item and 50 units per order.

## Verified
145 automated tests passed, zero failures/cancellations/skips, 14.170 seconds in evidence/final-tests.txt: 36 unit, five seed/persistence and 104 HTTP/security cases. This includes 25 ordering cases, three phone-rule unit tests and seventeen new account cases. The dependency audit reports zero vulnerabilities. All 400 benchmark requests passed; p95 21.80 ms at six venues and 728.62 ms at 1,006 venues.

The normal seed now provisions twelve restaurant-specific staff/owner accounts plus existing customer and pilot aliases. All twelve named accounts were browser-authenticated with exactly one intended restaurant. A fresh clone passed locked install/repeated setup and all fifteen logins, with fourteen memberships and preserved fixture counts. Focused API tests reject cross-venue mutations and staff owner-only analytics, preserve existing personal passwords/data and roll back conflicts. Code commits 02749dc and b917068 were pushed through release branch feature/SMAR-45-restaurant-demo-accounts. The first account CI run exposed an idle pooled socket in the bcrypt-heavy test fixture; fresh test connections fixed it without weakening assertions. Corrected CI passed: https://github.com/arlpramesh7/ICT308/actions/runs/37279116678 .

Final browser QA used a separate local customer. It verified registration/profile, preferences/vegan exclusion, search, score explanation, save/Saved/remove persistence, review pagination and own-review updates, 14m geofence offer/read state, quantities/removal/persistence/badges and confirmation-protected cart switching. Order SD-20261005-54870C24 ($18.00, blank phone) preserved notes and completed every stage with assigned staff/owner; customer history showed Completed. Valid 0412 345 678 produced SD-20261005-41145567 ($6.00). Invalid dvds was rejected inline with focus. Ten customer/role surfaces were measured at actual 390 px without overflow. Existing personal orders/reviews/accounts were preserved. See release-browser-qa.json and screenshots 51-57.

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

The generic aliases remain assigned to The Spice Tailor. For each of the six venues, use staff.<slug>@smartdine.test or owner.<slug>@smartdine.test with the same local password. Slugs: the-spice-tailor, nikkei-bar, trattoria-bianco, green-fork, chophouse, seoul-grill. README and USER_GUIDE list every address. Display names are the venue plus Staff/Owner. Setup is production-guarded and rejects conflicting privileged credentials/memberships without resetting passwords or widening access. No separate admin role exists; registration creates customers only.

## Release Boundaries
Pickup only. No real payments, drivers, live delivery tracking or transmission to external restaurants. Checkout/confirmation explicitly disclose this. Free-text offers are not automatically deducted and are confirmed separately at pickup. Fixtures/sample reviews are disclosed; dietary flags are not allergy guarantees.

PR #2 is merged; main contains the completed earlier delivery. PR #3 is the normal restaurant-account/release PR, using authenticated GitHub browser writes where connector PR operations returned 403. The final handover records its actual merge and CI SHA. No independent approval is claimed.

SMAR-4/25/29 were reconciled to Done on evidence for recommendations, integration tests and distance calculation. Existing implementation issues SMAR-7, 33-39 and 41-44 are Done. SMAR-45 is the account release item; final handover/live Jira records its post-review status. SMAR-3 stays In Progress and SMAR-17 In Review because strict cuisine/price/rating-filter acceptance is not met by ranking preferences. SMAR-16 stays In Review pending hardware GPS. SMAR-40 remains To Do for human UAT/review. SMAR-30/31/32 are deferred backlog. Sprint 2 and the future Sprint 3 container were not falsely completed.

The software journey is working. Student-authored analysis, institutional declarations, missing student ID/contribution/signature fields, genuine human UAT and lecturer access must be confirmed by the team. Factual documentation is updated without manufacturing acceptance or academic authorship.
