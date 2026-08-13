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
| FR5 – Recommend restaurant by location + preference | ✅ Implemented | `POST /api/location/update` (scoring in `utils/geo.js`) |
| FR6 – Map directions | ✅ Implemented (returns lat/lng + address; map rendering is a frontend concern) | `POST /api/location/update` |
| FR7 – Push notifications for offers | ✅ Implemented as in-app notification records (Firebase Cloud Messaging integration deferred to Iteration 2) | `POST /api/location/update`, `GET /api/location/notifications` |
| FR8 – Staff update menu/availability | ✅ Implemented | `POST /api/restaurants/:id/menu`, `PATCH /api/restaurants/:id/menu/:itemId` |
| FR9 – Feedback and ratings | ⏳ Iteration 2 | — |
| FR10 – Owner analytics dashboard | ⏳ Iteration 2 | — |

Security controls implemented to match the ICT307 design (Section 7.2):
JWT auth (1hr expiry), bcrypt password hashing (cost factor 12), login
lockout after 5 failed attempts, role-based access control (customer /
staff / owner), and input validation on every write endpoint.

## Project structure

```
smartdine/
├── backend/
│   ├── src/
│   │   ├── app.js              # Express entrypoint
│   │   ├── db.js                # SQLite connection + pilot restaurant seed
│   │   ├── middleware/auth.js   # JWT verification, RBAC
│   │   ├── routes/              # auth, preferences, location, restaurants
│   │   └── utils/geo.js         # Haversine distance + recommendation scoring
│   ├── db/schema.sql            # Matches the ERD from Assessment 3
│   └── .env.example
└── frontend/
    └── index.html                # Minimal browser demo client (customer flow)
```

## Running locally

```bash
cd backend
npm install
cp .env.example .env
npm start                # or: node src/app.js
```

Then open `frontend/index.html` directly in a browser (or serve it with
`npx serve frontend`). The API runs on `http://localhost:4000`.

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
