# Testing report

## Latest Regression Run

The release-account regression run passed **145 tests**, with zero failures, cancellations or skips in **14.170 seconds**. Raw output: `evidence/final-tests.txt`. Breakdown: **36 unit, 5 seed/persistence, 104 HTTP/security**. The 17 account cases add repeatable seeding, personal-data preservation, atomic conflict rollback, production guards and twelve restaurant-specific role workflows. The earlier 82-test records remain historical. See [DELIVERY_UPDATE.md](DELIVERY_UPDATE.md) for browser checks. Human UAT remains unsigned.

All twelve named staff/owner accounts authenticated in the real browser and showed exactly their intended restaurant. Automated HTTP cases additionally create/edit/disable/delete only assigned items, reject other-venue menus/promotions/orders, reject customer privileged access and staff owner-only analytics, and progress fixture orders through the complete lifecycle. Setup guards reject conflicting privileged credentials or memberships rather than resetting passwords or widening access.

Final browser QA registered a separate local customer, verified dynamic profile, persisted preferences, vegan exclusions, search, favourites/Saved and removal persistence, score explanation, paginated reviews and update-without-count-inflation. Order SD-20261005-54870C24 ($18.00, blank phone) retained notes and progressed Placed/Confirmed/Preparing/Ready/Completed through assigned restaurant sessions; customer history confirmed Completed. SD-20261005-41145567 ($6.00) accepted 0412 345 678. Junk dvds showed inline error and focused the field. Cancel preserved the cart; confirmed switching replaced it. Ten customer/role surfaces were measured at actual 390 px without horizontal overflow; representative desktop checks and six loaded photographs passed. No reported console errors/warnings appeared. Existing personal accounts, reviews and orders were not reset. Evidence: [browser QA](evidence/release-browser-qa.json) and [restaurant-account checks](evidence/restaurant-account-browser.json).

The first account CI run 37277946940 failed because synchronous bcrypt fixtures exceeded an idle pooled socket timeout; the dependent status case then failed after its predecessor did not advance. The isolated test client now closes each connection instead of reusing an idle socket. Assertions and application security were not weakened. Corrected commit b917068 passed CI run 37279116678: https://github.com/arlpramesh7/ICT308/actions/runs/37279116678 . The final documentation commit and merged main require their own check recorded in the handover.

Ordering tests cover integer-cent totals, price spoofing, invalid quantities, unavailable/inactive items, one-restaurant carts, account isolation, stale cart/price rejection, closed restaurants, transactional checkout, unique order numbers, idempotent retry, snapshots surviving menu changes/deletion, scoped staff/owner access, sequential audited status updates, privacy export and account-deletion cascades.

Browser QA placed order SD-20261005-4BBCBC85 at $22.50, after exercising increment/decrement, removal and refresh persistence. Staff advanced it to Confirmed and Preparing; owner advanced it to Ready and Completed. Seeded customer placed SD-20261005-2AF92E03 at $19.00 on mobile. Its order persisted after a real server restart; attempting the other customer's order displayed Order not found. Cart, checkout and confirmation at 390 px had no horizontal overflow or reported console errors. All three setup credentials authenticated successfully. Staff menu save, availability enable/disable, promotion save and owner analytics refresh were rechecked. Previous create/registration evidence remains valid; deletion is exercised only in isolated automated fixtures.

Historical ordering CI passed for a1a780238d3a31dd1312c05a2b5b95fbb01d6fd8: https://github.com/arlpramesh7/ICT308/actions/runs/37264779907 . Later account-release evidence is recorded above.

## Final Customer UX Verification

Discovery, checkout and Account read the authenticated display name. The existing personal account was preserved; the separate seeded customer was used for browser testing without disclosing or resetting a private password. Invalid phone `dvds` displayed the exact inline error and focused the field. Blank phone produced order SD-20261005-1C9AC901 ($129.50); a valid `0400 123 456` produced SD-20261005-39B58DF4 ($38.00). Cart quantity two survived reload and remained two in discovery, restaurant, cart and checkout badges. Cancel preserved the Spice Tailor cart; explicit confirmation switched to Green Fork, and another confirmation switched back. API tests verify stale revisions, unavailable targets, account isolation and transaction safety. No promotion-text parsing or automatic discount is implemented.

The final $38.00 order progressed Placed, Confirmed, Preparing, Ready and Completed using genuine seeded staff/owner sessions. Staff was denied the owner page. Customer confirmation/history and Account were verified at 390 px, along with discovery, restaurant, cart and checkout; every measured page had scroll width 375 px against viewport width 390 px. Tested browser console logs contained no errors/warnings. Earlier review-submission evidence remains valid; existing user-authored review text was preserved in the final recheck.

CI succeeded for 5a9dda7d891ce7ed16b36123b9547cc71b0f99f5: https://github.com/arlpramesh7/ICT308/actions/runs/37266735649 . Final documentation and any merge need their own run verification.

## Historical baseline results
Evidence captured 5 October 2026, Australia/Sydney (machine-readable logs use UTC).
Runtime: Node.js 24.19.0 on Windows build 26200. Full suite: 82 passed, 0 failed, 0 cancelled, 0 skipped; 3.719 seconds in the saved run.

| Suite | Tests | Passed | Failed | Scope |
|---|---:|---:|---:|---|
| geo.test.js | 7 | 7 | 0 | Haversine and geofence boundaries |
| scoring.test.js | 18 | 18 | 0 | Weights, preferences, dietary and rating policy |
| final-scoring.test.js | 8 | 8 | 0 | Vegan and scheduled-promotion regressions |
| api.test.js | 44 | 44 | 0 | Real local HTTP integration, isolation and authorization |
| security.test.js | 5 | 5 | 0 | Throttling, origin, JSON parsing and headers |
| Total | 82 | 82 | 0 | 33 unit and 49 HTTP/security tests |

Saved outputs: evidence/tests.txt and evidence/tests.xml. Tests create isolated in-memory databases and start ephemeral HTTP servers. The account lock expiry test sets a past database deadline; it verifies expiry behavior without pretending to wait 15 minutes. These assertions are not a penetration test or coverage percentage.

## Performance
200 measured authenticated requests per scenario, 10 concurrent clients, 10 warm-ups, isolated in-memory SQLite. Windows 11, Intel i7-12650H, 16 logical CPUs, 31.7 GiB RAM. Client duration includes HTTP and JSON body consumption.

| Venues | Success | Fail | p50 ms | p95 ms | p99 ms | Maximum ms |
|---|---:|---:|---:|---:|---:|---:|
| 6 | 200 | 0 | 16.08 | 21.80 | 25.15 | 26.19 |
| 1006 | 200 | 0 | 637.19 | 728.62 | 754.90 | 1079.44 |

Both p95 results were below the design's three-second response target under these test conditions. In-memory storage, local network, synthetic venues, short duration and a raised benchmark-only limiter restrict generalisation. Not measured: cold disk I/O, many concurrent users, growing feedback histories, production network, mobile battery use or 99% uptime. See evidence/performance.json; repeat runs can differ.

## Defects and corrective actions
| ID | Defect and impact | Severity | Correction | Verification and status |
|---|---|---|---|---|
| D01 | Public role field allowed privileged registration | Critical | Customer-only provisioning | Owner/staff escalation tests pass; fixed |
| D02 | Staff access not restricted to assigned restaurant | High | restaurant_member checks on resource routes | Cross-venue menu/analytics tests pass; fixed |
| D03 | Failed-login lockout did not expire persistently | High | Database failure counter and timed deadline | Five failures, active lock and expired lock tests pass; fixed |
| D04 | Vegan treated as vegetarian; unsupported diets accepted | High | Distinct vegan flag and fail-closed validation | Vegan/unsupported tests and browser exclusions pass; fixed |
| D05 | Repeated feedback inflated rating totals | Medium | Latest-user/venue view and update semantics | Repeat-rating analytics assertions pass; fixed |
| D06 | FR8 had no complete staff UI or promotion endpoint | High | Protected menu/promotion interface and routes | CRUD/validation tests and real browser actions pass; fixed |
| D07 | README claimed absent CI and incompatible startup | Medium | Actual Actions workflow and single-origin setup | CI run and clean-install evidence pass; fixed in final docs |
| D08 | Register navigation text had insufficient contrast | Low | Explicit white button text | Browser visual inspection; fixed |
| D09 | Account fixture pooled socket expired while bcrypt blocked the test event loop on CI | Medium | Fresh connections in isolated account test requests | Full 145-case local run and corrected CI run passed |

Historical notification spam and impression inflation were already corrected in the recovered baseline and are retained as regression cases, not claimed as new discoveries.

## Browser verification
Observed: customer/staff/owner login; persisted preferences; inside-geofence recommendations; six score components; vegetarian/vegan exclusions; dedicated full menu and paginated reviews; saved browser-QA rating; staff create/edit/disable; dated promotion save; actual owner metrics; access-denied screen; customer narrow-screen layout. The retained [browser QA](evidence/release-browser-qa.json) and [restaurant-account checks](evidence/restaurant-account-browser.json) record the expanded verification. This is tool-assisted functional/visual verification, not human UAT.

## Clean installation and CI
A separate clone passed npm ci, first/repeated setup, health/HTML startup and three role logins. See evidence/clean-install.json.

The current account implementation 02749dc passed a fresh isolated clone, npm ci, first and repeated setup, all fifteen seeded logins, exact restaurant assignment/other-venue 403, authenticated profile, empty initial cart and ordering-page HTTP checks. Repeated setup retained 21 users (15 active and six inactive review authors), six restaurants, fourteen memberships and 36 reviews. See evidence/clean-install-final.json. The temporary verification server was stopped. The subsequent b917068 change only adjusts the isolated test client's connection handling, not deployment behavior. Dependency audit found zero vulnerabilities; evidence/dependency-audit.json records the actual audit.
GitHub Actions run 37212127823 passed installation, automated tests, dependency audit and performance smoke test on Ubuntu. URL: https://github.com/arlpramesh7/ICT308/actions/runs/37212127823
The recorded run covers commit 57577550efdae6d462e1f9eab45be1d09c660cb9. Later commits need their own status check.

## Outstanding verification
Human UAT, independent review, hardware GPS and optional provider-to-device push remain unverified. SMAR-3/17 remain open: cuisine/price are ranking preferences and no minimum-rating filter exists; SMAR-16 requires device evidence. Earlier Google Maps verification opened the fixed pilot coordinates in walking mode with a 22 m route, not the fictional venue name. Final export returned success but the IAB download event was unconfirmed; save the JSON in the presentation browser. Clear-history confirmation was dismissed and blank-password deletion blocked in the live browser; actual deletion/history clearing and export isolation pass in isolated API fixtures. No participant, approval, production uptime or destructive operation on existing user data is claimed.

Final QA rerun after optional push-cleanup and client export compatibility corrections: 82 passed, zero failed/skipped, 3.691 seconds. The original saved baseline timing above is retained. Customer-only browser registration, Parramatta no-results, persistent notification opt-out and logout were also observed. Optional device cleanup no longer blocks already completed privacy operations or session revocation.
