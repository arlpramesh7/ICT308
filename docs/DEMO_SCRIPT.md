# SmartDine Ten Minute Demonstration

## Rehearsal Setup
Run npm ci, npm run setup and npm start from main before the session. Open http://localhost:4000, merged PR #2, release PR #3, Actions and Jira. Use customer@smartdine.test, staff.the-spice-tailor@smartdine.test and owner.the-spice-tailor@smartdine.test, all password SmartDine-Demo26!. Other venues have exclusive accounts listed in README/USER_GUIDE; use staff and owner for the restaurant actually ordered from. Keep npm test and raw evidence ready. Use fictional data and named search areas; actual GPS and optional push are not needed for this path.

Check Sydney opening hours (11 am-10 pm), offer dates and notification preference before presenting. Cart supports one restaurant; begin with an empty cart. Do not delete real/team accounts, bypass lockout or pretend a suppressed offer is new.

| Time | Action | Explanation |
|---|---|---|
| 0:00-0:45 | Open SmartDine and README architecture | Explainable nearby dining, one Express process, SQLite and fictional fixtures. |
| 0:45-1:20 | Customer login; briefly show Register | Registration creates customers only; privileged roles come from controlled local setup. |
| 1:20-2:15 | Save Indian/Vegan/$$/2 km; Town Hall then Spring Street | Persistence, hard dietary exclusions, search area versus GPS, discovery radius versus 200 m geofence. |
| 2:15-2:45 | Expand recommendation explanation; show stored offer | Six backend contributions; 30-minute offer cooldown. |
| 2:45-3:45 | Open restaurant, save/un-save, browse reviews, show own rating form | Full menu, imagery, unavailable state, persistent favourites and one effective review. |
| 3:45-5:30 | Add available dish, open cart, quantity +/- and remove a second item; checkout/place order | Server-owned integer-cent totals, pickup only, explicit no-payment notice, unique confirmation and private history. |
| 5:30-7:00 | Assigned staff login; briefly show menu/availability and Promotion; advance the new order Confirmed then Preparing | FR8 UI and scoped orders. Restore availability after showing it. |
| 7:00-8:15 | Assigned owner login; finish Ready then Completed; refresh analytics; customer login/history | Database-derived metrics; customer sees Completed. Engagement is not a physical visit. |
| 8:15-9:00 | Show npm test result and latest green Actions run | 145 passed: 36 unit, 5 seed/persistence, 104 HTTP/security. Isolated fixtures do not erase demonstration data. |
| 9:00-10:00 | Show merged PR #2, release PR #3, real commits and Jira status | Human UAT/review stays open. SMAR-3/17 strict-filter acceptance and SMAR-16 hardware GPS are unresolved. Real payments, delivery, native tracking and production hosting are outside scope. |

## Five Minute Discussion
Answer the question first, identify its implementation and evidence, then state limitations. Review Q_AND_A.md, including ordering transactions, revision validation, retries and snapshot prices. No machine learning, encrypted SQLite, production uptime, guaranteed push delivery or verified visits is claimed.

## Recovery
- Closed venue: present the genuine closed-state validation and arrange the live ordering demonstration during published opening hours; do not bypass it.
- Changed price/unavailable item: return to cart and review before a fresh checkout.
- Login locked: wait fifteen minutes or use another permitted role; do not weaken security.
- GPS denied: choose a named search area.
- No new offer: explain cooldown and show a stored offer.
- Internet unavailable: local application still works; show timestamped saved CI evidence.
- Unexpected defect: record it honestly and show unaffected workflows.
