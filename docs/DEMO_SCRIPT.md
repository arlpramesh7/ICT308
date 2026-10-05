# SmartDine ten minute demonstration

## Rehearsal setup
Run npm ci, npm run setup and npm start before the session. Keep a second terminal at the repository root for npm test. Open SmartDine, GitHub Actions and Jira in separate tabs. Use only fictional/demo data. Verify the pilot offer dates and customer notification preference. Use an existing in-app offer if cooldown suppresses a new one; never pretend suppression is a fault or a fresh delivery.

Keep the latest raw test log and screenshots locally as a fallback, but show live behavior first. Do not depend on GPS permission or optional push for the ten-minute path. Rehearse role changes using the three published local demo accounts. Prepare an unused item name and registration email. Do not delete a real/team account in the demonstration.

| Time | Exact action | Suggested explanation |
|---|---|---|
| 0:00–0:45 | Open Home | SmartDine helps a diner find suitable nearby restaurants rather than ranking distance alone. These are fictional Sydney CBD examples. |
| 0:45–1:20 | Show architecture in README | One Express process serves the responsive client and JSON API. SQLite stores users, venues, preferences and engagement. Services separate scoring from HTTP handling. |
| 1:20–2:05 | Log in as customer; show Register briefly only if time permits | Registration always creates a customer. The server decides roles; there is no owner selector. Sessions expire and can be revoked. |
| 2:05–3:00 | Save Indian, Vegetarian, $$, 2 km; choose Town Hall then pilot | Preferences persist. Both positions are labelled simulations. Discovery radius differs from the 200 m pilot geofence. |
| 3:00–3:30 | Change to Vegan and save | Incompatible venues are excluded, not merely penalised. Venue flags are not allergy guarantees. |
| 3:30–4:30 | Expand Why this recommendation? | These six numbers come from the backend. The weights are 35, 20, 15, 10, 15 and 5. Ratings use a prior to moderate small samples. |
| 4:30–5:00 | Open View menu, then close | Available items come from SQLite. Opening a venue records engagement against the latest recommendation. |
| 5:00–5:45 | Show Your offers and Directions | In-app offers work without push permission. Repeats are suppressed for 30 minutes. Directions uses this selected venue and sends demo coordinates to Google. |
| 5:45–6:30 | Save rating 4 with a labelled demo comment | The latest rating replaces the customer's effective previous vote. It feeds scoring and analytics without inflating counts. |
| 6:30–7:30 | Log out; staff login; add item, edit price and disable | FR8 now has a complete UI. Every change also checks restaurant assignment on the server. Invalid prices are rejected. |
| 7:30–8:20 | Owner login; show analytics; mention customer /owner.html denial screenshot if switching is slow | These counts come from our actions. Views are not verified physical visits. Owners can read only assigned venues. |
| 8:20–9:15 | Run npm test; show real Actions run | The suite isolates its data and checks successful and denied behavior. Read the live pass/fail result, not a memorised number. The saved baseline is 82/82. |
| 9:15–10:00 | Show Jira final-delivery issues and commit links | Real issues link to real changes. Native mobile and larger infrastructure were deferred for a reproducible web scope. Human UAT/review status is reported honestly. |

## Five minute Q and A
Answer the precise question first, then identify the relevant file and evidence. Do not claim machine learning, encrypted SQLite, production deployment, guaranteed push delivery or verified customer visits. For an unverified result, state the limitation and the test needed.

Useful files: backend/src/services/scoringService.js; backend/src/routes/feedback.js; backend/src/services/analyticsService.js; backend/src/middleware/auth.js; backend/tests/api.test.js; backend/scripts/performance.js.

## Recovery options
- Login locked: wait for the deadline; switch to another permitted demo role, do not weaken lockout.
- GPS denied: use a labelled simulated location.
- No new offer: show stored offer and explain cooldown; check promotion dates and preference.
- Internet unavailable: core local workflow still runs; show saved CI evidence with its recorded run URL.
- Unexpected defect: record it truthfully, show unaffected features and explain the diagnostic path.
