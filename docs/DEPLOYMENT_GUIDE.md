# Deployment guide

## Verified environment
Windows 11 build 26200; Node.js 24.19.0; npm 11.17.0. Dependencies are locked in backend/package-lock.json. SQLite is provided by Node's built-in node:sqlite module. No Python, MySQL, Redis or native compiler is required to run SmartDine.

## Install and start
From a terminal:
```powershell
git clone https://github.com/arlpramesh7/ICT308.git
cd ICT308
git checkout main
npm ci
npm run setup
npm start
```
Open http://localhost:4000. The final release uses main. Do not separately serve the frontend or open HTML with file://.

Setup creates backend/.env only if absent, generates independent JWT/VAPID secrets, initialises schema/migrations and provisions fifteen active local accounts: one customer, twelve venue-specific staff/owners and two compatible pilot aliases. See README and USER_GUIDE for every email; password SmartDine-Demo26! is local-only. Display names use the actual restaurant plus Staff/Owner. Repeat setup preserves IDs/passwords/data, repairs missing intended membership and rejects conflicting privileged credentials, roles or other memberships atomically. Production and DEMO_DATA=false prohibit account seeding. The default database is backend/db/smartdine.sqlite. All restaurants and offers are fictional fixtures.

## Configuration
- HOST=127.0.0.1 binds only to this machine.
- PORT=4000 and APP_ORIGIN=http://localhost:4000 must agree.
- JWT_SECRET must contain at least 32 characters and must not be the example.
- DB_PATH may select a different local SQLite file; :memory: is used only by tests.
- VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT support optional browser push.
- NODE_ENV=production enables Secure cookies/HSTS and disables demo setup. It does not create HTTPS or turn the app into a production deployment.

For a port conflict choose an unused port, e.g. 4001, and update both PORT and APP_ORIGIN in backend/.env before restarting. Stop with Ctrl+C. Do not run two application processes against the demonstration database.

## Verification
```powershell
npm test
npm run test:performance
npm audit --prefix backend
```
The performance command uses its own in-memory database and raised test rate limit; it does not add 1000 venues to the demonstration database. Results are written to docs/evidence/performance.json.

Current clean-install evidence: docs/evidence/clean-install-final.json. A separate release clone passed npm ci, first and repeat setup, actual startup on port 4012, HTML/health HTTP 200 and all fifteen logins. Each privileged account has one correct assignment and other-venue access returns 403. Repeat setup retained 21 users (15 active accounts plus six inactive sample-review authors), six restaurants, fourteen memberships and 36 reviews. The verification server was stopped; the normal local application uses port 4000.

## Backup and release
Stop the process before copying the SQLite database and related WAL/SHM files. Store backups privately, outside the repository. Test a restore on a copy, never overwrite a live assessment database without a backup. Keep .env private and retain its signing keys while sessions/subscriptions need to remain valid.

## Production limits
No internet deployment, SSL certificate, monitored uptime, disaster-recovery exercise or production capacity certification is claimed. Public use requires HTTPS termination, audited proxy configuration, removal of public demo credentials and fixtures, secure account provisioning, backup/retention controls, monitoring, tested push delivery and an independent security review. Reverse-proxy rate limiting must be configured for trusted proxy addresses, not disabled.
