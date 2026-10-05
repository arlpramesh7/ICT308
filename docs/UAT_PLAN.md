# Human acceptance testing

Status: NOT YET EXECUTED BY A HUMAN PARTICIPANT. Automated API and browser checks do not establish human acceptance.

Use fictional data, the local customer and the ordered restaurant's exclusive staff/owner accounts listed in README/USER_GUIDE. All six venues have named accounts; public local password SmartDine-Demo26!. Start with a clean profile or inspect existing offers; repeat notifications are suppressed for 30 minutes. Do not record real GPS without informed agreement. Human SMAR-40 remains To Do; do not replace participant results with automated passes.

Participant name or agreed identifier: __________________
Date and local time: __________________
Browser/device: __________________
Observer: __________________
Consent to record observations: __________________

| ID | Human task | Acceptance condition | Result and observation |
|---|---|---|---|
| UAT01 | Register and log in | Customer account, no privileged role selector; useful invalid-input feedback | Pending |
| UAT02 | Save Indian/vegetarian/$$/2 km preferences, reload | Values persist | Pending |
| UAT03 | Select Town Hall then Spring Street search area | Understand fixed search coordinates versus actual GPS; distance/geofence change | Pending |
| UAT04 | Explain highest recommendation | Six backend contributions understandable | Pending |
| UAT05 | Select vegan | Incompatible venues excluded and identified | Pending |
| UAT06 | Read offer, refresh location repeatedly | Read state persists; no duplicate spam | Pending |
| UAT07 | Open directions using demo coordinates | Correct selected origin and destination; external map recognised | Pending |
| UAT08 | Submit then revise rating | Latest rating replaces previous effective rating | Pending |
| UAT09 | Staff adds/edits/disables item | Customer menu reflects saved availability | Pending |
| UAT10 | Staff edits promotion and dates | Correct active/inactive state | Pending |
| UAT11 | Owner reads metrics | Participant distinguishes engagement from physical visits | Pending |
| UAT12 | Customer opens owner page | Access denied; API protection explained separately | Pending |
| UAT13 | Export data and disable offers | Readable export; preference persists | Pending |
| UAT14 | Use narrow screen and keyboard | Labels, controls and dialogs usable without obscured text | Pending |
| UAT15 | Open a restaurant; save/un-save then reload | Filled red heart and persistence are understandable | Pending |
| UAT16 | Browse all reviews and update own rating | Pagination and current vote are understandable | Pending |
| UAT17 | Add available items; quantity/remove; checkout pickup | Totals correct; unavailable/closed items blocked; no-payment notice understood | Pending |
| UAT18 | View own confirmation/history and restaurant status | Unique ID and persistent status; other account cannot access | Pending |

Overall decision: Accept / Accept with defects / Reject
Blocking defects and references: __________________
Participant confirmation: __________________
Independent reviewer and PR link: __________________

Do not prefill a signature, date, rating or participant result. Record defects in SMAR and rerun the affected scenario after a fix. SMAR-40 remains open until genuine evidence exists. Optional SUS evaluation may use Brooke's original instrument in a later study; no SUS score is claimed in this delivery.
