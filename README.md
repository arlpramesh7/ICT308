# SmartDine

**Latest delivery state:** photographic discovery, restaurant pages, persistent favourites, paginated reviews and complete pickup ordering are implemented. **145 automated tests pass.** See [testing report](docs/TESTING_REPORT.md) for verified journeys and remaining human release checks. [PR #2](https://github.com/arlpramesh7/ICT308/pull/2) records the completed final-delivery merge into main; [PR #3](https://github.com/arlpramesh7/ICT308/pull/3) records restaurant-account and release-consistency work.

[![SmartDine verification](https://github.com/arlpramesh7/ICT308/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/arlpramesh7/ICT308/actions/workflows/tests.yml)

Location-aware restaurant discovery with explainable recommendations, assigned-venue staff management and owner analytics. ICT308 Project 2 final web delivery, continuing the existing ICT307 design and Assessment 1 repository.

## Quick start

Requires **Node.js 24** and npm. From the repository root:

```powershell
npm ci
npm run setup
npm start
```

Open **http://localhost:4000**. The final verified implementation is available on `main`. Express serves both frontend and API; no separate frontend server is needed.

| Demo role | Email | Password |
|---|---|---|
| Customer | customer@smartdine.test | SmartDine-Demo26! |
| Staff | staff@smartdine.test | SmartDine-Demo26! |
| Owner | owner@smartdine.test | SmartDine-Demo26! |

The generic staff/owner aliases remain assigned to The Spice Tailor. Setup also creates these exclusive restaurant accounts, all using **SmartDine-Demo26!**:

| Restaurant | Staff email | Owner email |
|---|---|---|
| The Spice Tailor | staff.the-spice-tailor@smartdine.test | owner.the-spice-tailor@smartdine.test |
| Nikkei Bar | staff.nikkei-bar@smartdine.test | owner.nikkei-bar@smartdine.test |
| Trattoria Bianco | staff.trattoria-bianco@smartdine.test | owner.trattoria-bianco@smartdine.test |
| Green Fork | staff.green-fork@smartdine.test | owner.green-fork@smartdine.test |
| Chophouse | staff.chophouse@smartdine.test | owner.chophouse@smartdine.test |
| Seoul Grill | staff.seoul-grill@smartdine.test | owner.seoul-grill@smartdine.test |

Display names are the restaurant name plus Staff or Owner. These are public **local demonstration credentials**, not production accounts. Repeat setup preserves account IDs, passwords and content; it rejects conflicting privileged credentials/roles/memberships rather than resetting passwords or widening access. Provisioning is disabled in production or with DEMO_DATA=false. Setup generates private secrets in ignored `backend/.env`. The seeded customer displays Prajwal Shrestha and is distinct from personal accounts. Names come from the authenticated profile, not hard-coded pages.

## Features
- Customer-only registration, login, persistent timed lockout and revocable one-hour sessions.
- Saved preferences, explicit GPS action and selectable search areas.
- Haversine geofencing and dietary-safe candidate filtering with six score contributions.
- Per-venue walking directions, in-app offers and optional Web Push.
- Photographic restaurant pages, full menus, persisted favourites and paginated reviews.
- SQLite-backed cart, quantities/removal, server-priced pickup checkout, confirmation and private order history.
- Assigned staff/owner order status controls: Placed, Confirmed, Preparing, Ready and Completed.
- One effective rating per customer/restaurant.
- Assigned-restaurant menu creation, editing, availability, deletion and scheduled promotions.
- Owner metrics from actual recorded events, with UTC hourly activity.
- Data export, offer preferences, history clearing and password-confirmed deletion.

FR1–FR10 have browser workflows in the revised web scope. Real-device GPS and optional browser-push delivery remain to be verified. Views are engagement, not proven restaurant visits. Fixtures are fictional.

## Architecture
```text
Browser HTML/CSS/JavaScript
        |
Same-origin JSON and HttpOnly session cookie
        |
Express routes -> authentication, role and venue checks
        |
Scoring / promotion / notification / analytics services
        |
SQLite: relational tables, constraints, indexes and migrations
```

Node.js 24, Express 5, node:sqlite, bcryptjs, jsonwebtoken, express-validator, Helmet, express-rate-limit, web-push and Lucide. No React Native, MySQL, Redis, Python recommender or Firebase deployment is claimed.

## Verification
```powershell
npm test
npm run test:performance
npm audit --prefix backend
```
Latest saved local run: **145 passed, 0 failed, 0 skipped**: 36 unit, five seed/persistence and 104 HTTP/security tests. `docs/evidence/final-tests.txt` contains the saved release run; historical baseline results are summarized in the testing report. Tests use isolated databases. The benchmark passed all 400 measured requests, with p95 21.80 ms at six venues and 728.62 ms at 1,006 venues. These are short local measurements, not production capacity. Clean-clone installation, repeat setup, all fifteen account logins and restaurant isolation passed. See [testing report](docs/TESTING_REPORT.md) and [raw evidence](docs/evidence).

GitHub Actions runs locked installation, tests, dependency audit and performance smoke verification on pushes/PRs. Read the actual run status; the badge alone is not an independent review.

## Roles and security
Public registration cannot select staff or owner. Privileged APIs require both a current database role and restaurant membership. Passwords use bcrypt cost 12; cookies are HttpOnly/SameSite Strict and Secure in production. JSON/origin checks, bounded input, rate limits, prepared SQL and CSP provide additional controls. Never commit .env, databases, JWT secrets, VAPID private keys or real user records.

## Structure
```text
backend/
  scripts/          setup and isolated benchmark
  src/
    app.js          Express and same-origin static server
    config.js       validated environment
    db.js           database, additive migration and fixtures
    routes/         HTTP endpoints
    middleware/     sessions, roles, restaurant ownership and validation
    services/       scoring, promotion, push and analytics
    utils/geo.js    Haversine helpers
  db/schema.sql
  tests/
frontend/
  *.html            home, login, registration, customer, staff, owner, account
  css/styles.css
  js/               shared API helper and role-specific workflows
  assets/
  sw.js             optional push service worker
docs/               report source, guides and real evidence
.github/workflows/tests.yml
```

## Documentation
- [User Guide](docs/USER_GUIDE.md)
- [Deployment and configuration](docs/DEPLOYMENT_GUIDE.md)
- [API reference](docs/API.md)
- [Design revisions](docs/DESIGN_REVISIONS.md)
- [Security and privacy](docs/SECURITY_AND_PRIVACY.md)
- [Testing report](docs/TESTING_REPORT.md)
- [Human UAT protocol](docs/UAT_PLAN.md)

## GitHub and Jira
Repository: https://github.com/arlpramesh7/ICT308
Jira: https://sajal-niroula.atlassian.net/jira/software/projects/SMAR/boards/2

Preserve history, use real SMAR keys in logical commits, verify changes before completion, and leave human acceptance/review open until actually performed. Historical contributors are Prajwal Shrestha, Sajal Niroula, Mandeep Acharya and Pramesh Aryal. Final contribution percentages must be confirmed by the team, not inferred from earlier reports.

## Ordering scope
Pickup only, one restaurant per cart, maximum 20 per item and 50 units per order. Menu prices include applicable taxes; free-text promotions are not automatically applied and are confirmed separately at pickup. The server rechecks current availability, opening hours, cart revision and prices. Optional phone accepts blank or standard Australian mobile/landline formatting, with inline and server validation. Switching restaurants requires Cancel / Clear cart & add item confirmation; revision-checked transactional replacement preserves the old cart on failure. The badge counts total item quantity. Idempotency keys prevent duplicate orders on retry. Ordered names/prices are snapshots and survive menu changes. No money is collected and no order is sent to an external business. The checkout and confirmation state this explicitly.

## Limitations
This is a loopback educational deployment, not a production-hosted service. Cuisine and budget rank candidates rather than strictly excluding mismatches; there is no minimum-rating filter (SMAR-3/17 remain open). SQLite files are not encrypted by the application. No production uptime or capacity guarantee, native background GPS, verified physical visits, real payments, external restaurant fulfilment, delivery tracking, password-recovery service or universal accessibility certification is claimed. Optional push depends on browser permission, provider availability and unverified device delivery. Human UAT and independent review remain separate release obligations.
