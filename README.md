# SmartDine

[![SmartDine verification](https://github.com/arlpramesh7/ICT308/actions/workflows/tests.yml/badge.svg?branch=feature%2FSMAR-36-final-delivery)](https://github.com/arlpramesh7/ICT308/actions/workflows/tests.yml)

Location-aware restaurant discovery with explainable recommendations, assigned-venue staff management and owner analytics. ICT308 Project 2 final web delivery, continuing the existing ICT307 design and Assessment 1 repository.

## Quick start

Requires **Node.js 24** and npm. From the repository root:

```powershell
npm ci
npm run setup
npm start
```

Open **http://localhost:4000**. Until merged, use branch `feature/SMAR-36-final-delivery`. Express serves both frontend and API; no separate frontend server is needed.

| Demo role | Email | Password |
|---|---|---|
| Customer | customer@smartdine.test | SmartDine-Demo26! |
| Staff | staff@smartdine.test | SmartDine-Demo26! |
| Owner | owner@smartdine.test | SmartDine-Demo26! |

These are public **local demonstration credentials**, not production accounts. Staff and owner are assigned to The Spice Tailor. Setup preserves existing data and generates private secrets in ignored `backend/.env`.

## Features
- Customer-only registration, login, persistent timed lockout and revocable one-hour sessions.
- Saved preferences, explicit GPS action and clearly labelled simulated locations.
- Haversine geofencing and dietary-safe candidate filtering with six score contributions.
- Per-venue walking directions, in-app offers and optional Web Push.
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
Saved local run: **82 passed, 0 failed**. Includes 33 unit tests and 49 API/security tests. Tests use isolated databases. The benchmark measures 200 requests each at six and 1,006 venues, with ten concurrent clients; it never modifies the demo database. See [testing report](docs/TESTING_REPORT.md) and [raw evidence](docs/evidence).

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
- [Ten-minute demonstration](docs/DEMO_SCRIPT.md)
- [Lecturer questions](docs/Q_AND_A.md)
- [Evidence checklist](docs/EVIDENCE_CHECKLIST.md)
- [Final-delivery traceability](docs/JIRA_FINAL_TASKS.md)
- [Tool-use declaration](docs/AI_TOOL_USE_DECLARATION.md)

## GitHub and Jira
Repository: https://github.com/arlpramesh7/ICT308
Jira: https://sajal-niroula.atlassian.net/jira/software/projects/SMAR/boards/2

Preserve history, use real SMAR keys in logical commits, verify changes before completion, and leave human acceptance/review open until actually performed. Historical contributors are Prajwal Shrestha, Sajal Niroula, Mandeep Acharya and Pramesh Aryal. Final contribution percentages must be confirmed by the team, not inferred from earlier reports.

## Limitations
This is a loopback educational deployment, not a production-hosted service. SQLite files are not encrypted by the application. No production uptime or capacity guarantee, native background GPS, verified physical visits, ordering/payment, password-recovery service or universal accessibility certification is claimed. Optional push depends on browser permission, provider availability and unverified device delivery. Human UAT and independent review remain separate release obligations.
