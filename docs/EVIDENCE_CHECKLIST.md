# SmartDine Evidence Checklist

Screenshot files were removed from the repository during documentation cleanup. The application image assets remain unchanged. The retained records below describe actual verification; they are not human UAT or independent approval.

| Evidence | Recorded scope |
|---|---|
| [Final test output](evidence/final-tests.txt) | Release run: 145 passed, zero failures/cancellations/skips; 36 unit, 5 seed/persistence and 104 HTTP/security |
| [Browser QA](evidence/release-browser-qa.json) | Customer journey, complete $18.00 pickup lifecycle, blank/valid/invalid phones, cart switching, favourites/reviews, privacy safeguards, loaded application imagery and ten measured 390px surfaces |
| [Restaurant-account browser checks](evidence/restaurant-account-browser.json) | Twelve named staff/owner logins with intended restaurant assignments |
| [Performance results](evidence/performance.json) | Actual workload/environment, 400 successful requests and benchmark limitations |
| [Current clean-install record](evidence/clean-install-final.json) | Isolated installation and repeated setup, all fifteen logins, restaurant assignment and other-venue denial |
| [Dependency audit](evidence/dependency-audit.json) | Recorded backend audit with zero vulnerabilities |
| [Historical test output](evidence/tests.txt) and [XML](evidence/tests.xml) | Actual 82-test baseline, not the latest suite count |
| [Historical clean-install record](evidence/clean-install.json) | Earlier isolated clone verification |
| [Merged release PR](https://github.com/arlpramesh7/ICT308/pull/3) | Normal merge and real release commits; no independent approval implied |
| [Merged-main CI](https://github.com/arlpramesh7/ICT308/actions/runs/37283548029) | Successful verification for release commit 462b9b239b09a5105abcf9558cdd8969b9447f57 |
| [Jira traceability](JIRA_FINAL_TASKS.md) | Document checkpoint and links to current issue records |

## Evidence requiring an external or human action

- Genuine independent review: merged pull requests do not imply independent human approval.
- Lecturer access: the lecturer must open the repository and SMAR board with their own authorized account.
- Human UAT: complete [UAT_PLAN.md](UAT_PLAN.md) with an actual participant, real observations and consent. Do not prefill a pass or signature.
- Actual GPS and optional push: require a supported device and explicit browser permissions. Named search areas use fixed coordinates, not detected GPS.
- Sprint completion/report: Sprint 3 is a future final-delivery container while Sprint 2 remains active; no completed sprint or velocity claim is made.

## Verification guidance

For a live terminal demonstration, run npm test and show the complete summary; the committed text/XML logs preserve historical results. For performance, show the JSON alongside the runner and its environmental limitations. For Jira, show current final-delivery statuses and distinguish unfinished SMAR-40 from completed implementation. Never expose .env, tokens, real account passwords or private participant information. Human UAT/signatures remain unfilled.
