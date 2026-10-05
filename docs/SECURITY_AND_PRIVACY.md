# Security and privacy

This is an educational, local demonstration, not a production-certified service.

| Threat | Control | Verification | Residual limitation |
|---|---|---|---|
| Self-provisioned owner/staff | Registration fixes customer role and rejects privileged input | Owner/staff escalation API tests | Privileged provisioning requires trusted local administration |
| Stolen or manipulated token | HS256 allowlist, issuer/audience, one-hour expiry, active database account/token version | Tamper, expiry, disabled account, logout tests | No MFA; JWT secret rotation requires session renewal |
| Cross-restaurant access | Role check plus restaurant_member join for every privileged resource | Assigned/unassigned menu and analytics tests | Membership administration has no self-service UI |
| Password guessing | bcrypt cost 12; 10-character minimum and 72-byte limit; persistent 15-minute lock after five failures | Hash and lock/expiry assertions | Lockout can be abused to inconvenience an account; no recovery email |
| SQL injection | Bound values in prepared SQL | SQL-like inputs and isolation tests | Not a comprehensive penetration test |
| Cross-site scripting | Escaped dynamic text, same-origin scripts, Helmet CSP | Header tests and UI inspection | No independent security audit |
| Cross-site writes | SameSite Strict cookie, JSON requirement, Origin checks | Origin/content-type regression tests | Local HTTP is not encrypted; public service requires HTTPS |
| Push endpoint abuse | HTTPS provider allowlist, validated subscription keys and account ownership | API validation | Actual provider delivery not independently verified |
| Offer spam | 30-minute per-user/venue cooldown; opt-out | Repeated location API tests | Async push has no durable retry queue |
| Location exposure | No raw-coordinate history; explicit GPS action and labelled simulation | Schema/route review | Notification messages reveal approximate proximity; direction URLs share origin/destination with Google when opened |
| Retention | Export and password-confirmed deletion include favourites, cart, orders and order items; history clearing affects only recommendations/offers | API tests and cascading foreign keys | Backups and filesystem access require operator controls |
| Order price manipulation | Current server prices, integer cents, revision checks and immutable order snapshots | Spoofed totals, stale prices, menu deletion tests | Free-text promotions are not automatically discounted |
| Duplicate checkout | Account-scoped unique UUID retry key and atomic checkout/cart clearing | Same-order retry test | No payment gateway or external fulfilment integration |
| Order privacy/status abuse | Customer-owned history; restaurant membership and sequential audited status transitions | Cross-customer 404, unassigned 403 and invalid-transition 409 tests | Assigned staff/owners see pickup name and optional contact/notes |

No payment information is collected. Preferences may reveal sensitive dietary information. Restaurant flags are descriptive, not allergy guarantees. Owners see aggregate engagement and anonymised recent comments; assigned staff and owners also see their restaurant's order pickup details; free-text feedback may still identify its author if the author includes personal information.

Secrets are generated locally into ignored backend/.env. Public local accounts are provisioned only by production-guarded setup: twelve named staff/owners each have one intended membership, with two pilot aliases and a separate customer retained. Repeat setup preserves personal passwords/data and rejects conflicting privileged roles, passwords or venue assignments atomically. These credentials must never be deployed on a public production service. SQLite/backups are not encrypted by the application; use operating-system access controls and encrypted disks and test retention/backup procedures before real data collection.

Recommendations disclose their score terms. Promotion influence is capped at five points and cannot override dietary exclusions. Hand-selected weights, geographic coverage and rating priors introduce bias; no measured fairness or satisfaction improvement is claimed.
