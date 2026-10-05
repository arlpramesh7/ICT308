# SmartDine GitHub and Jira Evidence

## Verified delivery snapshot
Checked on 5 October 2026 during the restaurant-account release. Done means the named implementation and verification exist, not independent human approval. PR #2 is already merged at 41474ee20670f3d1f179343ab8617224cc371bc5. PR #3 and the final handover record this release's final merge, SHA and CI result.

Repository: https://github.com/arlpramesh7/ICT308

Pull request 2: https://github.com/arlpramesh7/ICT308/pull/2

Jira board: https://sajal-niroula.atlassian.net/jira/software/projects/SMAR/boards/2

Release source: main. PR #2 used feature/SMAR-36-final-delivery; the new normal release branch is feature/SMAR-45-restaurant-demo-accounts, PR https://github.com/arlpramesh7/ICT308/pull/3. Original history from e1a3ca1 remains intact.

## Issue traceability
| Issue | Work | Evidence | Status at review |
|---|---|---|---|
| SMAR-33 | Existing staff portal task | Menu CRUD and promotions; browser and API checks | Done |
| SMAR-34 | Existing CI task | Executed Actions workflow | Done |
| SMAR-35 | Existing API testing task | 82 passing tests including 49 HTTP tests | Done |
| SMAR-36 | New security defect | Customer-only registration; venue-scoped authorization | Done |
| SMAR-37 | New customer and owner interfaces | Preferences, discovery, account privacy, analytics | Done |
| SMAR-38 | New deployment and performance task | Clean clone and 400-request benchmark | Done |
| SMAR-39 | New documentation task | Earlier report/guide and evidence delivery verified | Done |
| SMAR-7 | Existing favourite story | SQLite save/remove, filled red state, persistence and account isolation | Done |
| SMAR-41 | New discovery/detail task | Local photographs, full menu pages and responsive browser checks | Done |
| SMAR-42 | New review task | Bounded pagination and editable own rating | Done |
| SMAR-43 | New ordering task | Cart, pickup checkout, snapshots, retries, confirmation/history and scoped status updates; 25 ordering tests | Done |
| SMAR-44 | Expanded verification/evidence | Pickup/phone/profile/cart-switch and document packaging; prior merged delivery verified | Done |
| SMAR-4 | Restaurant recommendations | Six-weight unit/API/browser checks | Done |
| SMAR-25 | Integration testing | Final 145-case suite and complete browser pickup lifecycle | Done |
| SMAR-29 | Restaurant distance calculation | Seven geometry cases and actual 14m fixed-area/geofence response | Done |
| SMAR-45 | Reproducible restaurant accounts | Twelve named browser role logins, exclusive assignments, seed preservation/guards, fresh install; release PR #3 | In Review at document checkpoint |
| SMAR-3 | Search and filtering | Radius/dietary/search work; strict cuisine/price/minimum-rating filtering not delivered | In Progress |
| SMAR-16 | GPS update defect | Fresh foreground request and fallback exist; hardware update unverified | In Review |
| SMAR-17 | Incorrect search results | Ranking preferences are not strict filters; acceptance gap remains | In Review |
| SMAR-40 | New human acceptance and review task | UAT protocol prepared; no participant or approval invented | To Do |
| SMAR-30/31/32 | React Native/MySQL/Firebase | Intentionally deferred, not implemented | To Do |

Existing issues were reused where they matched real work. Descriptions and acceptance criteria were updated; implementation items moved through In Progress and In Review before Done. New issue IDs were assigned by Jira, not predetermined. Existing assignees were preserved. New work is not falsely attributed to another member.

## Sprint handling
The existing active Sprint 2 and backlog were inspected first. Sprint 40, named Sprint 3 - Final Delivery, groups final work. Jira limited names to thirty characters. This is a future sprint container: no historical dates, completion report or velocity were fabricated. The backlog hides completed future-sprint items; the issue records above retain their real Done statuses. Native mobile, MySQL and Firebase proposals remain deferred rather than being marked implemented.

![Final delivery backlog during document review](screenshots/21-jira-backlog.jpg)

## New commits at this snapshot
- 8a7de13139980ddafb86e693fb149c4b0a1b410e: SMAR-36 Secure roles sessions and restaurant-scoped API access
- ccec2e09bf72990a0790c7c59769d6ba6f2bc591: SMAR-33 SMAR-37 Complete responsive customer staff and owner workflows
- f0b6b294dffd02021b638df6c8986a7f6edaef3f: SMAR-35 Add API security and recommendation regression tests
- 57577550efdae6d462e1f9eab45be1d09c660cb9: SMAR-34 SMAR-38 Run CI verification and isolated latency benchmarks
- e80b7541db9f3be0313785fc87653afdafaf41e1: SMAR-37 Preserve account actions when optional push cleanup fails

These first five commits and the following increments were pushed using the genuine authenticated GitHub identity, sthaprajwal246. No historical commit dates or authors were rewritten. The documentation commit is recorded in the final handoff after this snapshot.

## Subsequent real commits
- 2416d3c1a4874f4c847c21e68e0ca88330bc839c: SMAR-39 Document final delivery user workflows and verified evidence
- d757fb1ff276b1289b46c6d43dae8d48fec1d864: SMAR-41 Add photographic discovery and dedicated restaurant menu pages
- 5b26fa9829e7b697c864411c96e0f31fa3082fea: SMAR-7 Persist customer favourites with visible toggle state
- 818b65e4a4861f4701c5471267343110004a92ba: SMAR-42 Add complete review browsing and editable customer ratings
- 7494b42649a22be5005ecfe8ccc6f93ff5aca361: SMAR-43 Complete persisted pickup ordering and role-scoped order status
- a1a780238d3a31dd1312c05a2b5b95fbb01d6fd8: SMAR-44 Correct pickup controls audit labels and order privacy disclosures
- 116039d43fedc944ce9a4637316a9764eb722861: SMAR-44 Improve authenticated display names and optional pickup phone validation
- 52ed1f9abb7bae96e43453a7af96826c8139e666: SMAR-43 Add confirmation-protected atomic restaurant cart switching
- 5a9dda7d891ce7ed16b36123b9547cc71b0f99f5: SMAR-44 Tighten phone edge cases and clarify cart confirmation labels

The earlier final-delivery documentation commit was 61b9dfa; PR #2 merged at 41474ee. No extra PR was created for its resumed ordering work. This later account increment legitimately uses new PR #3 because #2 was already merged. Final exact documentation commit and main SHA are recorded in the handover and live Git.

Account-release commits:
- 02749dcd354dcfda1fc1ff77e24aad8b4aa83236: SMAR-45 Provision restaurant demo accounts and verify scoped access
- b917068bef40c22731fa982cb7e53b9bc641ff30: SMAR-45 Stabilize isolated account test connections on CI

## CI and review
Initial successful verification: https://github.com/arlpramesh7/ICT308/actions/runs/37212127823

Successful verification for e80b754: https://github.com/arlpramesh7/ICT308/actions/runs/37257270627

The workflow installs locked dependencies, runs tests, checks production dependencies and executes the isolated performance runner. The initial Ubuntu run passed all steps. Local clean-install and benchmark results are retained separately; CI timing is not substituted for the reported Windows measurements.

Historical ordering/privacy CI passed: https://github.com/arlpramesh7/ICT308/actions/runs/37264779907 . PR #2 is merged, not awaiting merge. The initial account CI run 37277946940 failed due to a test pooled-socket reset during synchronous bcrypt fixtures; b917068 corrected fixture connection handling without weakening assertions and passed https://github.com/arlpramesh7/ICT308/actions/runs/37279116678 . The final handover records the later documentation/main CI. No independent approval is claimed; human SMAR-40 remains open.

The integration's PR endpoint returned 403 Resource not accessible by integration even though normal Git push was authorized. PR 2 was therefore created through the user's authenticated GitHub browser session as a draft while documents were reviewed. This was an actual PR creation, not an invented review. No independent approval is claimed. Human review and lecturer access must be confirmed separately; connection access does not establish lecturer access.
