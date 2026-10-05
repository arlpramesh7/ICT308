# SmartDine Technical Questions and Answers

Use these answers to prepare, then demonstrate the relevant code yourself. They describe the final implementation, not a claim that any particular team member personally authored a component. Historical contribution claims must be checked against the original reports and Git history.

## Architecture and deployment

### 1 What problem does SmartDine solve
It helps customers compare nearby venues against cuisine, dietary and budget preferences, while staff maintain menus and owners see recorded engagement. It is not an ordering or payment platform.

### 2 What is the final architecture
A same-origin HTML/CSS/JavaScript browser client communicates with a modular Express API. Middleware enforces authentication and venue authorization, services calculate scores and analytics, and SQLite stores relational data.

### 3 Why use Node.js
It lets the backend and frontend share JavaScript and provides HTTP, cryptography and a test runner in a reproducible runtime. The verified version is Node.js 24.19.0; synchronous database work still blocks its event loop.

### 4 What does Express add
It organizes routes and middleware, serves static pages, parses bounded JSON bodies and centralizes error handling. Express itself does not automatically validate business rules or authorize resources.

### 5 How is the API REST oriented
Resources use URLs and HTTP methods: GET reads menus, POST creates items, PATCH updates them and DELETE removes them. Responses use JSON and meaningful HTTP statuses. This is a practical resource-oriented API, not a claim of perfect REST maturity.

### 6 Why did React Native change to a web client
The working Assessment 1 browser baseline provided a reliable path to a complete demonstration without native build dependencies. The trade-off is no native background tracking or native-device experience.

### 7 Why SQLite instead of MySQL and Redis
An embedded database avoids separate services and supports isolated tests. The small local workload does not justify a cache. SQLite has write-concurrency limits, so production growth would require measured evaluation and migration testing.

### 8 How can another person run it
Install Node.js 24, clone the repository, check out feature/SMAR-36-final-delivery until merged, run npm ci, npm run setup and npm start, then open localhost:4000. Setup preserves existing local configuration and accounts.

### 9 Is this a production deployment
No. Local installation and Ubuntu CI are verified. Internet hosting, TLS termination, encrypted backups, recovery procedures and production monitoring remain deployment work.

### 10 What does setup generate
It creates ignored local configuration with a random JWT secret and VAPID keys when absent, initializes schema and provisions three demonstration roles. Repeated setup does not reset passwords or existing activity.

## Data and security

### 11 How is the database normalized
Users, preferences, restaurants, menus, recommendations, notifications and feedback are separate entities. Restaurant membership represents the many-to-many privileged assignment. Some analytics values are calculated rather than duplicated as stored dashboard totals.

### 12 What do foreign keys achieve
They enforce relationships such as menu-to-restaurant and preference-to-user. Cascades support removal of related personal data; foreign keys complement, but do not replace, application authorization.

### 13 How are existing databases migrated
Startup inspects the schema and adds missing columns and supporting tables without resetting data. A current_feedback view resolves legacy duplicate votes by selecting the latest row. The recovered baseline already used node:sqlite; this final iteration does not claim a new driver migration.

### 14 Authentication versus authorization
Authentication establishes who the user is. Authorization checks whether that user may perform a particular operation on a particular restaurant. A valid staff session alone does not authorize editing another venue.

### 15 What was the registration vulnerability
The recovered route accepted a client-supplied privileged role. The final public route rejects staff/owner role requests and creates customers only. Regression tests attempt those prohibited registrations.

### 16 How does restaurant authorization work
Protected operations require a staff/owner role and a matching restaurant_member entry. The server verifies the actual target item's venue, not just a client-supplied venue selector.

### 17 Why JWT and how is it validated
JWT provides a signed session identifier with expiry. The middleware restricts the algorithm and checks issuer, audience, token version and the current active database account. It does not trust the role claimed by a page.

### 18 Where is the browser session stored
In an HttpOnly, SameSite Strict cookie with Secure in production. JavaScript cannot read that cookie directly. TLS is still necessary for real network deployment.

### 19 Does logout invalidate an already copied token
Logout increments the account's token_version, so subsequent requests with the old version fail. This revokes all sessions for that account, not just one tab. A push cleanup failure must not prevent revocation.

### 20 Why hash rather than encrypt passwords
Login needs to verify a password, not recover its original text. bcrypt stores a salted slow hash with cost twelve. The application caps registration passwords at 72 bytes to avoid bcrypt truncation ambiguity.

### 21 How does lockout work
Five failed attempts set a persistent fifteen-minute deadline. A correct password cannot bypass an active lock; attempts are reset appropriately after expiry or successful login. Rate limiting adds a separate request-level control.

### 22 What prevents SQL injection
Prepared statements bind values instead of concatenating user input into SQL. Tests exercise malicious-looking values as data. Validation helps enforce meaning, but parameterization is the relevant SQL boundary.

### 23 What input is validated
Email/password, role provisioning, coordinates, radius, supported diets, menu names/prices/flags, rating range, comment length and promotion dates. Invalid API input is rejected even if HTML validation is bypassed.

### 24 What do the main HTTP errors mean
400 indicates invalid input; 401 an absent or invalid session; 403 insufficient authorization; 404 missing resource; 409 a conflict such as duplicate email; 429 throttling or lockout. Unexpected failures avoid exposing stack traces.

### 25 What protects against script and cross-site attacks
Escaping untrusted text, a restrictive Helmet content security policy, HttpOnly cookies, SameSite Strict and same-origin mutation checks reduce risk. They are layered controls, not proof that the application is invulnerable.

## Recommendations and feedback

### 26 What are the six recommendation weights
Proximity 35, cuisine 20, dietary fit 15, price 10, rating 15 and promotion 5. They total 100 and the test suite verifies that total. These are configured product assumptions, not learned weights.

### 27 How does proximity affect the score
The normalized term is max(0, min(1, 1 - distanceMetres / radiusMetres)). A venue at the customer's location receives all 35 points; the term declines to zero at the radius boundary.

### 28 Why not machine learning
The demonstration lacks a representative training and evaluation dataset. A transparent weighted model supports cold start and explanation. Machine learning is future work only if data and measurable benefits justify it.

### 29 How do cold-start ratings work
The observed rating mean is shrunk toward 3 using five equivalent prior ratings. With no feedback, the rating component contributes 7.5 out of 15, avoiding an automatic zero for a new venue.

### 30 Can one five-star rating dominate the system
Shrinkage reduces its rating contribution compared with many strong reviews. Other components still affect overall ranking, so the implementation does not promise a universal ranking order based only on rating count.

### 31 How is the explanation kept consistent
The backend returns both the total score and named weighted contributions. The page displays those values instead of implementing a second scoring formula. Individual components and total are rounded separately.

### 32 Is dietary suitability a preference or a constraint
A specified supported dietary requirement is a hard filter. Vegan and vegetarian are distinct flags. An active promotion cannot make an incompatible venue eligible. Flags do not establish allergy safety.

### 33 What happens when cuisine or budget is unspecified
The corresponding term receives a neutral value of 0.6. A cuisine mismatch gets 0.2; budget similarity declines with the gap between price bands. These choices are explicit and open to later user evaluation.

### 34 How does FR9 avoid repeated voting
The effective current rating is one per customer and restaurant. New submissions update that effective entry, and the current_feedback view prevents legacy duplicate rows from inflating the aggregate. Integration tests verify count and average after an update.

### 35 How does feedback reach recommendations and FR10
Both scoring and analytics read current effective feedback aggregates. Scoring applies its damped rating term; the owner screen shows the undamped current average and vote count. Their different purposes explain the different values.

## Location and analytics

### 36 Why Haversine
It estimates great-circle distance between latitude/longitude points using radians and Earth's radius. Unit tests cover known distances and geofence boundaries. It does not calculate a walkable street route.

### 37 Discovery radius versus geofence radius
The customer's discovery radius selects candidate venues. Each restaurant's geofence decides whether a location is close enough for an offer. A recommended venue may be outside its notification geofence.

### 38 How are location queries optimized
An indexed latitude range narrows the candidates before exact Haversine filtering. It is a conservative prefilter, not a complete spatial index; measured behavior should guide any future optimization.

### 39 Why provide simulated locations
They make inside/outside-geofence and empty-result cases reproducible without travelling. They are labelled simulated, use valid coordinates and are not represented as device GPS evidence.

### 40 How do notifications avoid spam
The backend keeps a thirty-minute per-user/per-venue offer cooldown and respects the user's notification preference. In-app records work without browser push permission. Recommendation impressions have a separate ten-minute deduplication interval.

### 41 What do the owner metrics actually measure
Persisted recommendation impressions, viewed impressions, engagement percentage, current ratings and in-app offers. Interested or opening a menu counts as engagement, not a confirmed visit, booking or sale. Hourly activity is aggregated in UTC.

### 42 What personal data is retained
Profile, preferences, feedback and restaurant-associated activity are stored. Raw submitted coordinates are not stored as a location history, but venue/time associations can still reveal approximate activity. Export and deletion controls do not remove this privacy consideration.

## Testing and project evidence

### 43 What is the difference between unit and integration testing
Unit tests call individual geometry/scoring calculations. HTTP integration tests start the actual Express application and exercise middleware, routes and database effects together. The saved suite contains 33 unit and 49 HTTP tests, all passing.

### 44 What regression evidence is strongest
Tests specifically repeat previously unsafe cases: privileged registration, unassigned venue writes, unsupported diets, repeated offers and duplicate effective ratings. A passing regression protects a stated behavior, not all possible behaviors.

### 45 Is browser verification the same as UAT
No. Automated or tool-assisted browser checks observe functionality. Human UAT requires actual participants to perform tasks and provide judgments and acceptance records. Those records are currently pending rather than invented.

### 46 What do the performance results prove
Two isolated local scenarios each ran 200 authenticated requests with ten concurrent clients. Saved p95 values were 17.50 ms for six venues and 123.99 ms for 1,006 venues, with no failures. In-memory localhost results do not establish internet latency or production capacity.

### 47 What does continuous integration do
GitHub Actions installs locked dependencies on Node.js 24, runs the tests, audits backend dependencies and runs the isolated performance smoke test. The first successful run is 37212127823. Green CI does not replace human review.

### 48 How do GitHub and Jira connect
Real SMAR issue keys appear in new commit messages on feature/SMAR-36-final-delivery. Existing issues 33-35 were reused and 36-40 record actual new work. Status changes reflect evidence; no dates, approvals or historical activity are fabricated.

### 49 How should I explain my contribution
Use the earlier report and actual commits to describe what you really did in FR5, FR9, FR10, unit testing, defects, database work and prototype testing. Then explain the final code's behavior. Do not infer personal authorship from an issue assignee or repeat an unconfirmed percentage; disclose assistance in the designated declaration.

### 50 What are the next priorities
Complete human UAT and independent review, verify teaching-team access, test real-device GPS/push, and establish secure production provisioning and backup restoration. Favourites, ordering, payments, native tracking and production uptime are not claimed as delivered requirements.
