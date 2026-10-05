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
| Retention | Export, history deletion and password-confirmed account deletion | API tests | Backups and filesystem access require operator controls |

No payment information is collected. Preferences may reveal sensitive dietary information. Restaurant flags are descriptive, not allergy guarantees. Owners see aggregate engagement and anonymised recent comments; free-text feedback may still identify its author if the author includes personal information.

Secrets are generated locally into ignored backend/.env. Demo credentials are public and must never be used on a public production service. SQLite and its backups are not encrypted by this application. Use operating-system access controls and an encrypted disk; implement tested backup/retention procedures before collecting real customer data.

Recommendations disclose their score terms. Promotion influence is capped at five points and cannot override dietary exclusions. Hand-selected weights, geographic coverage and rating priors introduce bias; no measured fairness or satisfaction improvement is claimed.
