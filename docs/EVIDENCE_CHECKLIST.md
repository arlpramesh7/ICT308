# SmartDine Evidence Checklist

The JPEG files below are genuine browser captures under docs/screenshots. Screenshots establish the displayed state at capture time; the tests and database evidence establish behavior. They are not human UAT or independent review. Different screenshots may show different counts because real demo actions occurred between captures.

| File or evidence | State | Report placement |
|---|---|---|
| 01-login.jpg | Captured | Appendix A registration/login |
| 02-registration.jpg | Captured; subsequent customer redirect observed | Appendix A registration |
| 03-customer-mobile.jpg | Captured at 390 px; no horizontal overflow | Appendix B browser checks |
| 05-restaurant-menu.jpg | Captured | Appendix A menus |
| 06-score-breakdown.jpg | Captured | Section 2.3 discussion and Appendix A |
| 07-dietary-and-offer.jpg | Captured | Appendix A dietary filtering and offers |
| 09-directions.jpg | Google Maps opened in walking mode for selected simulated coordinates | Appendix B directions |
| 10-feedback.jpg | Captured form; save verified afterward | Appendix B feedback evidence |
| 11-staff-dashboard.jpg | Captured | Appendix A staff workflow |
| 12-add-menu-item.jpg | Captured | Appendix A adding an item |
| 13-edit-menu-item.jpg | Captured | Appendix B staff edit evidence |
| 13-promotion.jpg | Captured | Appendix B promotion evidence |
| 14-owner-analytics.jpg | Captured; values came from actual demo activity | Appendix A owner workflow |
| 14-owner-mobile.jpg | Captured narrow layout, 748 px; not a 390 px certification | Appendix B responsive evidence |
| 15-access-denied.jpg | Captured | Appendix A security demonstration |
| 18-ci-pass.jpg | Captured | Appendix D CI |
| 19-github-commits.jpg | Captured comparison showing four real implementation commits | Appendix D GitHub |
| 20-pull-request.jpg | Actual PR 2 created through authenticated browser | Appendix D pull request |
| 21-jira-backlog.jpg | Actual future Sprint 3 container; SMAR-39 In Review and SMAR-40 To Do at capture | Appendix D Jira |
| 25-account.jpg | Captured | Appendix A account/privacy |
| 26-no-results.jpg | Captured | Appendix B empty-state check |
| 27-notification-opt-out.jpg | Saved preference verified after reload | Appendix B privacy |
| evidence/tests.txt and tests.xml | Actual 82-pass baseline output | Appendix B automated results |
| evidence/performance.json | Actual measured workload/environment | Appendix B performance results |
| evidence/clean-install.json | Actual isolated clone verification | Appendix B deployment check |

## Evidence still requiring an external or human action
- Genuine independent review: PR 2 now exists and its screenshot is captured, but no independent approval is claimed.
- Lecturer access: lecturer must open the repository and SMAR board with their own authorized account.
- Human UAT: complete UAT_PLAN.md with an actual participant, real observations and consent. Screenshot only with agreement; do not prefill a pass or signature.
- Actual GPS and optional push: requires a supported device and explicit browser permissions. Label demonstration coordinates as simulated.
- Sprint completion/report: Sprint 3 is a future final-delivery container while Sprint 2 remains active; no completed sprint or velocity claim is made.

## Capture guidance
For a live terminal demonstration, run npm test and capture the complete summary if requested; the committed text/XML logs already preserve the actual result. For performance, show the JSON alongside the runner and its environmental limitations. For Jira, capture the current final-delivery backlog/statuses after verification; distinguish unfinished SMAR-40 from completed implementation. Never expose .env, tokens, passwords belonging to real accounts or private participant information.
