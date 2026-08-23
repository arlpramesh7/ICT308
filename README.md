# SmartDine — Iteration 1 (ICT308 Assessment 1)

Location-based restaurant recommendation platform. This iteration implements
the high-priority functional requirements from the ICT307 Assessment 2
requirements analysis, on top of the architecture and database design from
ICT307 Assessment 3.

## Scope of this iteration

| Requirement | Status | Where |
|---|---|---|
| FR1 – Register / login | ✅ Implemented | `POST /api/auth/register`, `POST /api/auth/login` |
| FR2 – Set food/dietary preferences | ✅ Implemented | `PUT /api/preferences` |
| FR3 – GPS location detection | ✅ Implemented (client sends coordinates) | `POST /api/location/update` |
| FR4 – Geofencing trigger | ✅ Implemented | `POST /api/location/update` |
| FR5 – Recommend restaurant by location + preference | ✅ Implemented | `POST /api/location/update` (scoring in `services/scoringService.js`) |
| FR6 – Map directions | ✅ Implemented (returns lat/lng, address and a walking-directions URL; map rendering is a frontend concern) | `POST /api/location/update` |
| FR7 – Push notifications for offers | ✅ Implemented as in-app notification records (Firebase Cloud Messaging integration deferred to Iteration 2) | `POST /api/location/update`, `GET /api/location/notifications` |
| FR8 – Staff update menu/availability | ✅ Implemented | `POST /api/restaurants/:id/menu`, `PATCH /api/restaurants/:id/menu/:itemId` |
| FR9 – Feedback and ratings | ✅ Implemented | `POST /api/feedback/:restaurantId`, `GET /api/feedback/:restaurantId`, `GET /api/feedback` |
| FR10 – Owner analytics dashboard | ✅ Implemented | `GET /api/analytics/restaurants/:restaurantId` (staff/owner only) |

Security controls implemented to match the ICT307 design (Section 7.2):
JWT auth (1hr expiry), bcrypt password hashing (cost factor 12), login
lockout after 5 failed attempts, role-based access control (customer /
staff / owner), and input validation on every write endpoint.

## Iteration 1, second pass — what changed and why

The first pass delivered FR1–FR8. This pass closes FR9 and FR10, fixes two
defects found while reviewing the recommendation path, and adds an automated
test suite.

**Defect: dietary requirements were captured but never applied.** `FR2` stored
`dietary_req` on the preference record, but the scoring function weighted only
proximity, cuisine and price. A customer who set a vegetarian requirement was
still recommended venues that could not feed them. Dietary requirements are now
a *hard exclusion* rather than a weak signal — the venue is removed from the
result set, and the response reports what was excluded and why, so the decision
is auditable rather than silent.

**Defect: notification and impression records accumulated on every GPS ping.**
A customer inside the geofence received a fresh notification row per location
update, and every venue in range recorded a fresh recommendation impression.
The first is a poor user experience; the second made the FR10 engagement rate
meaningless, because impressions inflated without any new customer intent. A
30-minute notification cooldown and a 10-minute impression de-duplication
window now apply.

**Scoring model rewritten and moved out of `utils/geo.js`.** Geometry and
product policy were mixed in one file. Distance is a fact about the world;
how much proximity should matter relative to cuisine or rating is a decision
that changes independently and needs its own tests. The model is now a
six-term weighted linear score in `services/scoringService.js`:

| Term | Weight | Notes |
|---|---|---|
| Proximity | 35 | Linear decay to the edge of the discovery radius |
| Cuisine match | 20 | Neutral 0.6 when no preference is set |
| Dietary fit | 15 | Hard exclusion when incompatible |
| Price band match | 10 | Distance between `$`…`$$$$` bands |
| Customer rating | 15 | Bayesian-damped toward a 3.0 prior (FR9) |
| Active promotion | 5 | Small nudge for a live offer |

Weights total 100 and the total is asserted at module load, so an edit cannot
silently rescale the score. Each response includes a `score_breakdown` naming
every term's contribution, so the interface can explain *why* a venue was
recommended — which is what section 7.1 of the design report commits to when it
promises algorithmic transparency.

**Rating feedback loop closed.** The `feedback` table existed in the Iteration 1
schema but had no endpoints, so ratings could neither be submitted nor
influence ranking. FR9 now writes ratings and FR5 consumes their aggregate.

**Seed data expanded from one venue to six.** A recommendation engine ranking a
list of one cannot demonstrate ranking. The seed now includes five competing
Sydney CBD venues across different cuisines, price bands and dietary
suitability. The Spice Tailor remains the pilot partner with its original
coordinates and 200 m geofence.

**Schema migration rather than a rebuild.** `schema.sql` uses
`CREATE TABLE IF NOT EXISTS`, so new columns never reach a database file that
already exists. `src/db.js` now inspects the live table definition and adds
only what is missing, so an existing database is upgraded in place instead of
being deleted — which would also destroy the recommendation history that the
FR10 analytics reads from.

**Automated tests and CI.** 25 unit tests over the scoring model and the
geospatial helpers, using Node's built-in test runner so the project still has
no test dependency. `.github/workflows/ci.yml` runs them on every push and pull
request. Run locally with `npm test`.

## Project structure

```
smartdine/
├── .github/workflows/ci.yml      # Runs the test suite on every push and PR
├── backend/
│   ├── src/
│   │   ├── app.js                # Express entrypoint
│   │   ├── db.js                 # SQLite connection, migrations, seed data
│   │   ├── middleware/auth.js    # JWT verification, RBAC
│   │   ├── routes/               # auth, preferences, location, restaurants,
│   │   │                         #   feedback (FR9), analytics (FR10)
│   │   ├── services/             # Business logic, no Express or HTTP concerns
│   │   │   ├── scoringService.js #   FR5 weighted relevance model
│   │   │   └── analyticsService.js # FR10 aggregation
│   │   └── utils/geo.js          # Haversine distance and geofence test
│   ├── tests/                    # 25 unit tests (node:test, no dependencies)
│   ├── db/schema.sql             # Matches the ERD from Assessment 3
│   └── .env.example
└── frontend/
    └── index.html                # Minimal browser demo client (customer flow)
```

The `routes → services → db` split is deliberate. Route handlers deal only with
HTTP concerns — parsing, validation, status codes. Services hold the business
rules and are pure enough to unit test without starting a server, which is what
makes `tests/scoring.test.js` possible. `db.js` is the only module that opens a
database connection, so the MySQL migration planned for Iteration 2 touches one
layer rather than the whole codebase.

## Running locally

```bash
cd backend
npm install
cp .env.example .env     # Windows PowerShell: copy .env.example .env
npm start                # or: node src/app.js
```

Run the test suite:

```bash
cd backend
npm test                 # 25 tests, no server or database required
```

Serve the frontend over HTTP rather than opening the file directly — Chrome
blocks requests from a `file://` page to `localhost`, so the buttons silently
do nothing:

```bash
npx serve frontend       # then open the http://localhost:3000 address it prints
```

The API runs on `http://localhost:4000`. Health check: `GET /api/health`.

## Notes on production vs. prototype

- The design doc specifies **MySQL 8.0**; this prototype uses **SQLite**
  via Node's built-in `node:sqlite` module (Node 22.5+) for a zero-config
  local demo with no native compilation step. The schema in
  `db/schema.sql` mirrors the ERD 1:1, so migrating to MySQL for the final
  submission is a matter of swapping the driver and minor syntax changes
  (`AUTOINCREMENT` → `AUTO_INCREMENT`, etc.) — worth doing before Assessment 2.
- The design doc specifies **React Native** for the mobile client; this
  demo uses a plain HTML/JS page so the customer flow can be demonstrated
  without a mobile build pipeline. Recommend porting this to the actual
  React Native screens (from the Assessment 3 wireframes) before Assessment 2.
- Push notifications are stored as DB records rather than sent via Firebase
  Cloud Messaging — real FCM wiring is a reasonable Iteration 2 task.

## Suggested Jira sprint 1 backlog (for your board)

- SD-1 Set up GitHub repo + branch protection
- SD-2 Implement user auth (FR1)
- SD-3 Implement preferences (FR2)
- SD-4 Implement geofencing + recommendation engine (FR3, FR4, FR5)
- SD-5 Implement notification trigger (FR7)
- SD-6 Implement staff menu management (FR8)
- SD-7 Write Iteration 1 technical report
- SD-8 Record prototype demo video
