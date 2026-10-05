# SmartDine Final Project Delivery

## 1 Introduction

### 1.1 Project overview and problem
SmartDine is a location-aware dining recommendation system developed for ICT308 Project 2. It addresses a practical discovery problem: a nearby restaurant is not necessarily suitable for a customer's cuisine preference, dietary requirement or budget. Customers need understandable comparisons, while restaurant staff need a controlled way to maintain offers and menus. Owners need evidence of engagement without being given a customer's precise location history. The project combines these needs in a browser-based application using fictional Sydney CBD venues.

This report evaluates the completed software against the ICT307 requirements and design and the recovered ICT308 Assessment 1 repository. It distinguishes implemented behavior, observed verification and remaining release obligations. The final deliverable is a working local application, not screenshots standing in for functionality. Customer, staff and owner journeys are connected to the same Express API and SQLite database. The report's conclusions are bounded by local tests, a short synthetic workload and tool-assisted browser verification; they do not imply production readiness.

### 1.2 Objectives and final scope
The delivery objectives were to complete the previously API-only staff interface, secure role and restaurant boundaries, preserve the explainable recommendation model, extend automated verification and provide reproducible installation. The final system supports registration, preferences, location submission, geofencing, recommendations, restaurant pages, favourites, external directions, offers, menu management, feedback, pickup ordering and owner analytics. Account export, notification preferences and deletion provide additional privacy controls. Public registration is customer-only; privileged demonstration accounts are provisioned locally.

The assessed scope is a responsive web implementation of FR1–FR10. Native mobile background tracking, MySQL, Redis and Firebase are not falsely presented as delivered. Optional standards-based browser push supplements persistent in-app offers, but device delivery remains unverified. Human acceptance testing and independent team review are separate release gates. These qualifications are important: comprehensive feature implementation can coexist with incomplete operational validation, and a responsible report should make that distinction visible.

## 2 System implementation

### 2.1 Architecture and technologies
The system is a modular monolith. The browser loads HTML, shared CSS and JavaScript modules from Express and exchanges same-origin JSON requests with route handlers. Authentication and authorization middleware execute before protected business operations. Scoring, promotion and analytics services separate domain calculations from request parsing. A single database module opens SQLite, applies additive migrations and seeds demonstration restaurants. This retains the existing repository structure instead of introducing a second application alongside it.

The verified runtime is Node.js 24.19.0. Express handles routing; bcryptjs hashes passwords; jsonwebtoken signs and validates sessions; express-validator checks requests; Helmet supplies browser security headers; express-rate-limit constrains request bursts. The web-push library implements the optional delivery protocol, and locally served Lucide icons avoid an external script dependency. Node's built-in test runner and fetch support HTTP integration tests. Locked dependencies make installation repeatable. SQLite's embedded deployment fits this demonstration, while its concurrency trade-offs remain relevant to future scaling (SQLite, n.d.).

### 2.2 Functional requirements
| Requirement | Final implementation and verification |
|---|---|
| FR1 Authentication | Registration/login/logout UI; customer-only provisioning; hash, token and lockout tests |
| FR2 Preferences | Saved cuisine, vegetarian/vegan, price and radius; persistence and validation tests |
| FR3 Location | User-triggered browser GPS plus named search areas with fixed coordinates; simulated flow verified |
| FR4 Geofencing | Exact Haversine distance against venue radius; boundary unit tests and inside-pilot browser evidence |
| FR5 Recommendations | Six-term ranking, dietary exclusions and server-generated explanation; unit/API/browser checks |
| FR6 Directions | Per-venue external Google walking-route link; not an embedded routing engine |
| FR7 Offers | Persistent in-app offer/read state/cooldown; optional browser push with unverified device delivery |
| FR8 Staff management | Assigned-venue menu CRUD, availability and scheduled promotions; API and browser evidence |
| FR9 Feedback | Customer rating/comment and effective latest-rating update; persistence and aggregation tests |
| FR10 Analytics | Owner-only assigned-venue metrics, hourly activity and feedback; database and browser verification |

All ten requirements have an implemented browser journey in the revised scope. This does not mean ten unrestricted production certifications. In particular, foreground location submission replaces native continuous tracking; external maps replace embedded navigation; in-app offers are the verified notification channel. These changes are evaluated explicitly in Section 3.

### 2.3 Recommendation algorithm
The scoring service retains six weights totaling 100: proximity 35, cuisine 20, dietary fit 15, price 10, customer rating 15 and promotion 5. It first excludes a venue incompatible with a specified dietary requirement. Vegan and vegetarian are distinct flags. Unsupported dietary values are rejected at the API; they are not silently accepted as safe. Compatible candidates inside the discovery radius then receive a weighted sum.

Proximity decays linearly from one at zero distance to zero at the requested radius. An exact cuisine match contributes its full weight; a mismatch uses 0.2 and an unspecified preference uses 0.6. Price compares the number of dollar symbols across four bands, with decreasing similarity as the gap increases. Dietary-compatible candidates receive the dietary term. A currently active promotion contributes five points only if its time window is valid. These are documented product rules, not learned probabilities.

Ratings are damped toward a prior mean of 3 using five equivalent prior observations. The adjusted mean is the observed mean times its count, plus 15, divided by count plus five; it is then mapped from the 1–5 scale to 0–1. This moderates very small samples without preventing other score components from changing the final order. With no ratings, the rating contribution is 7.5. The service returns each contribution and the separately rounded total, so the client cannot substitute a conflicting calculation.

### 2.4 Location, persistence and analytics
The location route validates coordinates, uses an indexed latitude range to reduce candidates, then applies exact Haversine distance. The prefilter is deliberately conservative; it is not a full geospatial index. Discovery radius and geofence radius are separate concepts. A restaurant can be recommendable without triggering an offer. Notifications are deduplicated for 30 minutes per customer/venue, while recommendation impressions are deduplicated for ten minutes. These inherited protections were retained and regression-tested.

The final data model additionally contains favourite, app_migration, cart_item, customer_order and order_item alongside user, preference, restaurant, menu_item, recommendation, notification, feedback, restaurant_member, push_subscription and audit_event. Foreign keys express ownership; indexes support location and activity queries. Additive migrations preserve existing records. The current_feedback view selects the latest row for each customer/restaurant, allowing legacy duplicates to remain stored without inflating current ratings. New submissions update the effective rating. Parameterized statements separate values from SQL structure, consistent with the prepared-statement interface documented by Node.js (n.d.).

Owner analytics count actual persisted impressions and viewed impressions, calculate engagement, aggregate current ratings and count in-app offers. Hourly activity uses UTC across all recorded dates. Opening a restaurant or saving it marks the latest recommendation viewed; it does not prove a physical visit or purchase. The verified browser example showed one impression, one view and one demonstration rating because those actions had actually occurred. No random dashboard numbers were introduced.

Pickup ordering extends the final customer workflow without real payments or external fulfilment. An account-owned SQLite cart enforces one restaurant and quantity limits. Checkout validates current availability, Sydney opening hours and the cart revision, calculates integer-cent totals, snapshots names/prices and clears the cart in one transaction. A per-customer UUID retry key prevents duplicates. Confirmation and private order history show a unique number; assigned staff/owners advance Placed, Confirmed, Preparing, Ready and Completed. Browser checks exercised desktop/mobile checkout and all status stages; account deletion/export includes the added records.

## 3 Design revisions

### 3.1 Comparison with the ICT307 design
The ICT307 design proposed React Native, MySQL, Redis, Firebase and a more distributed recommendation architecture. Assessment 1 had already simplified much of that design to a Node/Express browser prototype. The final iteration continues the working baseline rather than claiming that every earlier proposal was implemented. Architecture decisions were evaluated against demonstration reliability, maintainability, privacy and the evidence achievable within the project. Bass et al. (2021), retained from the earlier report, provides the broader architectural context for discussing quality-attribute trade-offs.

### 3.2 Significant changes
| Proposed or earlier approach | Final decision | Reason and trade-off |
|---|---|---|
| React Native customer client | Responsive browser client | One reproducible delivery path; no native background execution |
| MySQL and Redis | SQLite with indexes | Fewer services and deployment dependencies; limited write concurrency |
| Distributed recommender | JavaScript service inside Express | No service network or training corpus; less independent scaling |
| Firebase/native notifications | In-app offers plus optional Web Push | Reliable visible fallback; provider/browser dependency remains |
| FR8 endpoint-only workflow | Staff menu and promotion screens | Full user journey; additional validation and authorization responsibilities |
| Client-supplied privilege | Server-controlled roles and venue membership | Closes escalation; privileged provisioning is deliberately restricted |

### 3.3 Web client instead of React Native
A web client permits the lecturer to open one URL and demonstrate all roles on the same machine. Shared styles, labelled controls, keyboard focus indicators and responsive grids improve consistency across pages. The choice reduces platform-build and device-installation risk without changing the REST boundary. However, a responsive page is not equivalent to a native application. Real-device usability, background execution and battery consumption still require separate evaluation. Browser GPS also depends on a secure context and user permission (MDN Web Docs, n.d.-a).

### 3.4 SQLite instead of MySQL
SQLite removes database-server installation and makes an isolated test database inexpensive. The final code retains relational ownership, indexes and constraints rather than treating embedded storage as unstructured data. The recovered repository already used node:sqlite; its adoption is not claimed as a new final-iteration achievement. Synchronous queries can block the Node event loop, and multiple simultaneous writers remain a limitation. A later MySQL migration would require transaction, SQL, connection and concurrency testing, not merely replacing a driver.

### 3.5 Notification architecture
An offer is stored before optional browser delivery is attempted. Consequently, denying permission or failing to reach a provider does not remove the in-app record. Browser push uses a service worker, unique VAPID keys and account-bound subscriptions. The Push API relies on browser/provider mechanisms beyond the application itself (MDN Web Docs, n.d.-b). Provider acceptance is therefore recorded separately from confirmed display. The current asynchronous delivery path has no durable retry queue and cannot guarantee delivery after a process crash.

### 3.6 Security revisions
The most consequential change is the trust boundary. The original registration route accepted privileged roles, and privileged menu operations lacked restaurant membership checks. The final server rejects public staff/owner provisioning and checks both role and assignment for each protected restaurant. Sessions are validated against the current database user, not a trusted browser selection. Persistent lockout deadlines and token-version revocation correct lifecycle weaknesses. These changes are supported by negative tests, not just interface hiding.

### 3.7 Impact of the changes
The revised architecture improves reproducibility and demonstrability but narrows claims about native capability and scale. Completing FR8 also exposes input-validation and ownership problems that an API-only prototype could conceal during a presentation. The new account controls make privacy an implemented workflow, although database encryption and backup governance remain operational gaps. Scope reduction is defensible because the report states what was exchanged and evaluates the resulting system, rather than treating omitted technologies as automatically equivalent.

### 3.8 Lessons learned
A design diagram is a hypothesis about how to deliver quality, not a checklist of fashionable dependencies. The practical lesson was to verify a complete customer-to-staff-to-owner workflow before adding infrastructure. Another lesson was to preserve previous work while auditing its claims: the old README mentioned a CI file that did not exist. Documentation, issue status and software behavior must be reconciled against observable evidence at release time.

## 4 Testing and evaluation

### 4.1 Strategy and unit testing
Verification follows risk rather than an arbitrary target count. Pure geospatial and scoring calculations receive focused unit tests; protected workflows receive HTTP integration tests; stateful browser journeys and clean installation receive separate checks. The original 25 tests were retained, with an outdated unsupported-diet expectation revised to match fail-closed validation. Eight additional scoring tests cover vegan behavior and scheduled promotions. The resulting 33 unit tests exercise weights, cold-start behavior, distance boundaries and ranking policy.

### 4.2 Integration and security tests
Forty-four API tests start the real Express application on an ephemeral loopback port with an isolated in-memory database. They exercise registration, login, preferences, geofences, offer deduplication, menu ownership, promotions, feedback, analytics and privacy deletion. Five further HTTP security tests verify throttling, cross-origin rejection, JSON enforcement, malformed-body handling and headers. Isolation prevents assessment data from being erased by tests. Password hashing uses the real bcrypt implementation rather than substituting a fast fake.

The latest saved run passed 128 tests with zero failures, cancellations or skips in 3.883 seconds. Readable final output and historical baseline JUnit evidence are retained in docs/evidence. Test files account for seven geometry, eighteen baseline scoring, eight final scoring, forty-five API, five security, five catalogue, seven favourite, five review and twenty-five ordering and three phone-validation tests. These counts describe assertions actually executed; they are not a code-coverage percentage or a guarantee that every vulnerability has been excluded.

### 4.3 Regression and browser verification
Negative cases specifically prevent recurrence of role escalation, cross-venue mutation, unsupported diet acceptance, duplicate rating inflation and repeated-notification spam. The timed-lockout test moves the stored deadline into the past to verify expiry, rather than claiming a fifteen-minute endurance run. Browser verification exercised customer/staff/owner logins, persisted preferences, score explanations, vegan exclusions, offer display, feedback, staff add/edit/disable, promotion save, owner metrics and denied access. Screenshots show the running system and labelled demonstration data. A 390-pixel customer layout was checked for horizontal overflow.

### 4.4 User acceptance testing
No human participant has yet supplied a completed acceptance record. Appendix C therefore contains an executable UAT protocol with eighteen tasks and blank participant observations, not fabricated passes. A participant must judge whether recommendations, explanations, role switching and error messages are understandable. Independent review must also establish that the team can explain the code and limitations. Tool-assisted browser checks confirm selected behavior but cannot substitute for this human judgment. Brooke (1996), retained from the earlier report, is relevant to a future structured usability study; no SUS score is claimed.

### 4.5 Performance testing
The benchmark used an Intel i7-12650H Windows machine with sixteen logical CPUs and 31.7 GiB RAM. Each scenario warmed up with ten requests, then measured 200 authenticated location requests with ten concurrent clients. With six venues, p50 was 12.82 ms and p95 was 17.50 ms. With 1,006 synthetic venues, p50 was 108.49 ms and p95 was 123.99 ms. All 400 measured requests succeeded; the respective maxima were 20.09 and 147.56 ms.

These results satisfy the three-second response target under the measured conditions only. The database was in memory, traffic remained local, and the rate limit was raised solely for the benchmark. The experiment does not measure cold disk access, internet latency, long-running histories, production concurrency or mobile resources. Synthetic volume establishes useful comparative behavior, not a maximum supported restaurant count. The runner saves its environment, timestamps, percentiles and errors as JSON for repeatability.

### 4.6 Defects and corrective actions
| Defect | Consequence | Corrective action and evidence |
|---|---|---|
| Public privileged registration | Customer could become owner | Fixed customer role; owner/staff rejection tests |
| Missing restaurant assignment checks | Cross-venue modification | Membership middleware and negative resource tests |
| Lockout lifecycle weakness | Account could remain locked incorrectly | Persistent timed deadline; lock/expiry tests |
| Vegan/vegetarian conflation | Unsuitable venue recommendation | Distinct flags, hard filtering and browser exclusions |
| Duplicate effective ratings | Distorted reputation metrics | Latest-feedback view and update assertions |
| Incomplete FR8 interface | Normal workflow required API calls | Staff CRUD/promotion UI and real browser evidence |

### 4.7 Critical evaluation
The strongest evidence is the combination of reproducible setup, server-enforced negative tests and visible workflows using the same database. The weakest areas are human usability validation, independently reviewed security, real-device GPS and optional push delivery. No production uptime measurement exists. Passing tests increase confidence in specified behavior but do not justify claiming encrypted storage, universal accessibility or a validated business benefit. These remaining obligations are explicit release gates, not hidden behind the test total.

## 5 Deployment

### 5.1 Environment and installation
The verified deployment is a single local Express process on Windows 11 using Node.js 24.19.0 and npm 11.17.0. Installation is npm ci from the repository root; its post-install step installs the backend lockfile. npm run setup creates local configuration and demonstration accounts; npm start serves both the client and API at http://localhost:4000. No independent frontend server, native compilation, Firebase account or database service is needed. Appendix A provides the complete commands and troubleshooting path.

### 5.2 Configuration and initialization
Setup generates a long random JWT secret and VAPID key pair into ignored backend/.env. It does not overwrite an existing configuration or password. Startup applies missing schema columns and seeds fictional venues without resetting activity. HOST defaults to loopback; PORT and APP_ORIGIN must agree. The database, its journal files and environment secrets are excluded from Git. A different DB_PATH can isolate demonstrations and tests. Demonstration credentials are public fixtures and must not be deployed as real privileged accounts.

### 5.3 Deployment verification and limitations
A separate clone without dependencies, configuration or database passed npm ci, two setup runs, actual startup on port 4011, health/HTML HTTP 200 and login for all three roles. Repeating setup preserved exactly three demo accounts, six restaurants and two memberships. That test server was stopped after verification. GitHub Actions also passed its Ubuntu installation, tests, dependency audit and performance smoke test. The recorded initial run is linked in Appendix D.

The current delivery is not an internet-hosted production service. NODE_ENV=production enables relevant security behavior but does not install TLS. Public deployment would additionally require HTTPS, controlled privileged provisioning, removal of demo fixtures, monitoring, backup restoration tests and carefully configured proxy trust. The design's 99% uptime target remains unmeasured. Express's production security guidance supports treating TLS, secure cookies, dependency maintenance and input handling as deployment concerns, not merely code features (Express, n.d.).

## 6 Security and ethical considerations

### 6.1 Authentication and authorization
Passwords are hashed with bcrypt cost twelve. Registration limits input to at least ten characters and at most 72 bytes, avoiding bcrypt truncation ambiguity. OWASP recommends stronger memory-hard choices for new systems while documenting bcrypt's legacy work-factor and input constraints (OWASP Foundation, n.d.). Retaining bcrypt is a compatibility decision, not a claim that it is the only suitable algorithm. Missing, tampered, expired and revoked JWTs are rejected; logout increments the account's token version.

The browser uses an HttpOnly, SameSite Strict session cookie; production mode adds Secure. A one-hour token contains identity/version information and is checked for issuer, audience and allowed signing algorithm. The middleware then loads the active user and current role from SQLite. Role checks are supplemented by restaurant membership for menus, promotions and analytics. Frontend redirects only improve usability: the API remains responsible for the actual authorization decision.

### 6.2 Database and input controls
Prepared SQL binds untrusted values. Server validators constrain names, coordinates, menu prices, dietary values, rating ranges and promotion dates. Mutation requests require JSON, oversized bodies are rejected and unexpected errors avoid exposing stack traces. Helmet restricts script sources and framing; same-origin checks and Strict cookies reduce cross-site request risk. Request throttling and a five-failure, fifteen-minute account lock address basic guessing. None of these controls proves immunity to denial of service, account enumeration or sophisticated attack.

### 6.3 Location and user data
Raw GPS coordinates are processed for a search but are not stored in a location-history table. Recommendation timestamps, restaurant associations and approximate distances in offer messages can nevertheless reveal activity around an area. The privacy notice acknowledges that inference. Directions disclose the selected origin and destination to Google when opened. Account export excludes hashes and private keys; history clearing removes recommendation/offer records; password-confirmed account deletion removes related personal data while anonymising audit attribution.

SQLite storage and backups are not encrypted by the application. Loopback HTTP is also not equivalent to encrypted transport. These are explicit limitations of the educational deployment. Real use would require appropriate operating-system controls, TLS, retention policies and tested backup handling. The report does not claim compliance with a particular privacy statute merely because export and deletion buttons exist.

### 6.4 Fairness, promotions and dietary information
The model is explainable but not unbiased by definition. Hand-selected weights favor proximity, venue coverage is geographically narrow, and rating shrinkage influences newcomers differently from well-reviewed venues. Promotions add at most five points and remain visible to customers. They cannot override a dietary exclusion, yet they can change ordering among otherwise eligible venues. Evaluating ranking fairness would require representative users, restaurant coverage and outcome data that the current prototype lacks.

Vegetarian and vegan flags describe declared availability, not medical or allergy advice. A venue may offer a suitable dish while still having cross-contact risks. The interface therefore advises confirmation with the restaurant. Free-text comments are escaped but still need a moderation policy before public operation. Owners receive aggregate metrics and comments without customer identity fields; users may nonetheless identify themselves within a comment. No real customer behavior or partner endorsement is inferred from fictional demonstration data.

### 6.5 Future improvements
Priorities after this release are human UAT, independent security review, verified device GPS/push, retention/backup procedures and secure production provisioning. Only measured scale constraints should trigger a database or cache migration. Email verification, password recovery, durable push retry and accessibility testing would address concrete operational gaps. Machine learning should follow a justified dataset and evaluation protocol, not precede them.

## 7 Project management

### 7.1 Repository and traceability
The existing repository is https://github.com/arlpramesh7/ICT308 and the Jira board is https://sajal-niroula.atlassian.net/jira/software/projects/SMAR/boards/2. Recovery started from e1a3ca1 and preserved the previous commit history. New work was grouped on feature/SMAR-36-final-delivery, using genuine SMAR issue keys in commit messages. The authenticated GitHub identity is sthaprajwal246; no earlier commits, dates or other members' authorship were rewritten.

The first implementation commits separate secured backend behavior, complete browser workflows, regression tests and CI/performance verification. This improves reviewability compared with presenting the entire delivery as one unexplained change. The initial GitHub Actions run passed all verification steps for 5757755. GitHub's documented Node workflow pattern informed the install/test structure (GitHub, n.d.). CI is an executed check, not proof that every acceptance criterion or human review is complete.

### 7.2 Jira planning and progress
The existing backlog and active Sprint 2 were inspected before changes. Existing SMAR-33, SMAR-34 and SMAR-35 were reused for staff UI, CI and API coverage. Existing SMAR-7 tracks favourites; SMAR-41–44 track discovery, reviews, ordering and expanded verification. New SMAR-36–40 cover security, remaining interfaces, deployment/performance, documentation and human acceptance/review. Acceptance criteria specify observable outcomes. Sprint 40 is named Sprint 3 - Final Delivery because Jira rejected the longer requested name under its thirty-character limit. Historical Sprint 2 records were not silently rewritten to manufacture progress.

Work transitions record current activity through In Progress and In Review before completion where verification supports it. Human acceptance remains separate in SMAR-40. Earlier proposals for React Native, MySQL and Firebase remain visible as deferred backlog rather than falsely completed features. Appendix D records the final observed statuses, commits, branch and external-service restrictions so that documentation can be checked against live tools.

### 7.3 Collaboration and lessons
The inherited repository identifies four contributors, and earlier reports describe their historical responsibilities. Those records do not establish equal final-iteration contributions. No new percentage allocation, independent approval or participant result is invented. The team must confirm current responsibilities and student details before signing the cover sheet. Substantial tool assistance is disclosed in Appendix E rather than misrepresented as unaided human authorship.

The main management limitation is timing: final-delivery issue updates and new commits cannot retrospectively demonstrate excellent collaboration throughout the semester. Authentic evidence is more useful than simulated activity. Linking each actual change to an issue, retaining unresolved release gates and distinguishing implementation review from human approval makes the final state auditable. Permission failures affecting pull-request operations are reported honestly rather than substituted with fabricated review screenshots.

## 8 Conclusion
SmartDine now provides a connected local dining-discovery system with customer, staff and owner interfaces, including the previously missing FR8 user workflow. It preserves an explainable recommendation model while strengthening authorization, feedback integrity, session handling and reproducible deployment. The latest saved automated run passed 128 tests, clean installation succeeded and the bounded performance experiment completed without failures. These results support the revised web architecture within the demonstrated scope.

The remaining obligations are specific: genuine human acceptance, independent review, verified teaching-team access and any required device-level checks. Native background location, production encryption/hosting, uptime and optional push delivery are not claimed. The final report and User Guide support a transparent demonstration in which the team can show working behavior, explain design trade-offs and acknowledge the limits of its evidence.
