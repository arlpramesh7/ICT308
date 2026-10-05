# Design revisions

The ICT307 design is the baseline, not proof of technologies delivered. Existing Assessment 1 code at e1a3ca1 already used Express, browser JavaScript and node:sqlite. The final delivery extends it without erasing history.

| Original design or baseline | Final implementation | Reason | Impact and trade-off | Lesson |
|---|---|---|---|---|
| React Native customer application | Responsive multipage HTML/CSS/JS | Reuse working browser code and simplify demonstration | One browser deployment; no native background location | Validate complete journeys before adding another platform |
| MySQL 8 | SQLite through node:sqlite on Node 24 | Zero separate database service; reproducible local setup | Relational constraints preserved; synchronous queries and single writer limit scale | Database choice depends on deployment workload |
| Microservices and Python/Flask recommender | Express modular monolith and JavaScript scoring service | Avoid distributed deployment without training data | Fewer services; reduced independent scaling | Logical module separation can precede service separation |
| Collaborative filtering | Explicit six-term weighted score retained | No reliable interaction corpus; explainability | Cold-start behavior is deterministic; preferences and priors are hand selected | Transparent rules still require fairness evaluation |
| Redis caching | Indexed SQL plus bounded local workload | Small dataset; avoid invalidation complexity | Less infrastructure; large histories need further optimisation | Measure bottlenecks before adding caches |
| Firebase/native notifications | Persistent in-app offers and optional standards-based Web Push | Mandatory offer UI works without permission | Background delivery depends on browser/provider; no delivery guarantee | Separate durable offer creation from delivery acknowledgement |
| Prototype public role input | Customer-only registration, database roles and venue membership | Verified privilege escalation and cross-restaurant mutation | Privileged provisioning is controlled, not self-service | Authorisation belongs at each server resource boundary |
| FR8 API only | Assigned-venue staff menu/promotion UI | Complete the lecturer-visible journey | CRUD, availability, dated offers and audit list | Endpoint existence alone is not feature completion |
| Repeated feedback rows count repeatedly | Latest user/venue feedback view and update behavior | Prevent simple rating inflation while preserving old records | One effective rating per customer; no verified-visit proof | Preserve history without letting duplicates distort metrics |

The change from better-sqlite3 to node:sqlite is not claimed as new final-iteration work: the recovered baseline already used node:sqlite. Remaining ICT307 targets not demonstrated include 99% uptime, encrypted database storage, native background GPS, production scale and independently verified usability.
