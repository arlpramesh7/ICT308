# SmartDine Ten Minute Demonstration

## Rehearsal Setup
Run npm ci, npm run setup and npm start before the session. Open http://localhost:4000, PR #2, Actions and Jira. Rehearse with the three local setup accounts listed in README. Keep npm test and the raw evidence ready. Use fictional data and named search areas; actual GPS and optional push are not needed for this path.

Check Sydney opening hours (11 am-10 pm), offer dates and notification preference before presenting. Cart supports one restaurant; begin with an empty cart. Do not delete real/team accounts, bypass lockout or pretend a suppressed offer is new.

| Time | Action | Explanation |
|---|---|---|
| 0:00-0:45 | Open SmartDine and README architecture | Explainable nearby dining, one Express process, SQLite and fictional fixtures. |
| 0:45-1:20 | Customer login; briefly show Register | Registration creates customers only; privileged roles come from controlled local setup. |
| 1:20-2:15 | Save Indian/Vegan/$$/2 km; Town Hall then Spring Street | Persistence, hard dietary exclusions, search area versus GPS, discovery radius versus 200 m geofence. |
| 2:15-2:45 | Expand recommendation explanation; show stored offer | Six backend contributions; 30-minute offer cooldown. |
| 2:45-3:45 | Open restaurant, save/un-save, browse reviews, show own rating form | Full menu, imagery, unavailable state, persistent favourites and one effective review. |
| 3:45-5:30 | Add available dish, open cart, quantity +/- and remove a second item; checkout/place order | Server-owned integer-cent totals, pickup only, explicit no-payment notice, unique confirmation and private history. |
| 5:30-7:00 | Staff login; edit/disable a menu item; show Promotion; open Orders and advance status | FR8 UI, venue assignment checks, persisted/audited order stages. Keep menu data usable for later demonstration. |
| 7:00-8:15 | Owner login; refresh analytics and show order status controls | Actual recorded impressions/views/ratings; engagement is not a physical visit. Owner can manage only assigned venues. |
| 8:15-9:00 | Run npm test; show latest green Actions run | 128-test saved result; read the actual live result. Isolated fixtures do not erase demonstration data. |
| 9:00-10:00 | Show PR #2, real commits and Jira status | No fabricated review/contributions. Human UAT/review remains separate. Real payments, delivery, native tracking and production hosting are outside scope. |

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
