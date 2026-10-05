# Deployment guide

## Verified environment
Windows 11 build 26200; Node.js 24.19.0; npm 11.17.0. Dependencies are locked in backend/package-lock.json. SQLite is provided by Node's built-in node:sqlite module. No Python, MySQL, Redis or native compiler is required to run SmartDine.

## Install and start
From a terminal:
```powershell
git clone https://github.com/arlpramesh7/ICT308.git
cd ICT308
git checkout feature/SMAR-36-final-delivery
npm ci
npm run setup
npm start
```
Open http://localhost:4000. Use the final-delivery branch until it has actually been merged into main. Do not separately serve the frontend or open HTML with file://.

Setup creates backend/.env only if absent, generates independent JWT/VAPID secrets, initialises schema/migrations and adds the three demo accounts only if absent. Running setup twice does not reset existing passwords, menus, reviews or history. The default database is backend/db/smartdine.sqlite. All restaurants and offers are demonstration fixtures.

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

Clean-install evidence: docs/evidence/clean-install.json. A separate clone passed locked installation, first and repeat setup, actual server startup on port 4011, HTML/health HTTP 200 and all three role logins. The test server was stopped afterwards. Local screenshot evidence uses port 4000.

## Backup and release
Stop the process before copying the SQLite database and related WAL/SHM files. Store backups privately, outside the repository. Test a restore on a copy, never overwrite a live assessment database without a backup. Keep .env private and retain its signing keys while sessions/subscriptions need to remain valid.

## Production limits
No internet deployment, SSL certificate, monitored uptime, disaster-recovery exercise or production capacity certification is claimed. Public use requires HTTPS termination, audited proxy configuration, removal of public demo credentials and fixtures, secure account provisioning, backup/retention controls, monitoring, tested push delivery and an independent security review. Reverse-proxy rate limiting must be configured for trusted proxy addresses, not disabled.
