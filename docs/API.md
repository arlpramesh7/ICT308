# SmartDine API

All paths below start with `/api`. Browser requests use the same origin and an HttpOnly session cookie; API clients may use a Bearer JWT. JSON bodies are required for mutations. A session expires after one hour; logout revokes all sessions for that account.

| Method and path | Access | Purpose |
|---|---|---|
| GET /health | Public | Service health and version |
| POST /auth/register | Public | Customer registration; username, email, password, privacy_accepted=true |
| POST /auth/login | Public | Email/password login and cookie |
| GET /auth/me | Authenticated | Current database-backed account |
| POST /auth/logout | Authenticated | Revoke sessions and clear cookie |
| GET /preferences | Customer | Current saved preferences or null |
| PUT /preferences | Customer | cuisine_type, dietary_req, price_range, radius_km |
| POST /location/update | Customer | latitude/longitude; recommendations, exclusions and geofence offers |
| POST /location/recommendations/:restaurantId/viewed | Customer | Mark latest own impression viewed |
| GET /location/notifications | Customer | Own offers |
| PATCH /location/notifications/:notifId/read | Customer | Mark own offer read |
| GET /restaurants | Public | Active demonstration venues |
| GET /restaurants/:id/menu | Public | Available menu items |
| GET /restaurants/managed | Staff/owner | Assigned venues |
| GET /restaurants/:id/manage | Assigned staff/owner | Full menu, promotion, audit records |
| POST /restaurants/:id/menu | Assigned staff/owner | Create item |
| PATCH /restaurants/:id/menu/:itemId | Assigned staff/owner | Edit item or availability |
| DELETE /restaurants/:id/menu/:itemId | Assigned staff/owner | Delete item |
| PATCH /restaurants/:id/promotion | Assigned staff/owner | Text, enabled flag and optional ISO start/end |
| POST /feedback/:restaurantId | Customer | Upsert rating 1–5 and optional comment |
| GET /feedback/:restaurantId | Public | Venue ratings without customer identity |
| GET /feedback | Customer | Own ratings |
| GET /analytics/restaurants/:restaurantId | Assigned owner | Aggregate engagement and feedback |
| GET /privacy/export | Authenticated | Own data without password hash or secret keys |
| GET /privacy/settings | Authenticated | Offer preference |
| PATCH /privacy/settings | Authenticated | notifications_enabled boolean |
| DELETE /privacy/history | Authenticated | Own recommendation and notification history |
| DELETE /privacy/account | Authenticated | Password and confirmation=DELETE; delete own account |
| GET /push/config | Customer | Public VAPID key and configuration status |
| POST /push/subscribe | Customer | Browser endpoint and keys, allowlisted provider |
| DELETE /push/subscribe | Customer | Remove own endpoint |

Menu fields: item_name, description, category, price, vegetarian, vegan, is_available. Consult `routes/restaurants.js` for exact validation. Dietary values are null, vegetarian or vegan; radius 0.1–50 km; price bands $ to $$$$. Unknown dietary requirements are rejected, never assumed safe.

Status semantics: 200 success; 201 creation; 400 invalid input; 401 missing/expired/revoked authentication; 403 role or venue denial; 404 unavailable resource; 409 duplicate email; 413 excessive body; 415 non-JSON mutation; 429 throttling/lockout; 500 unexpected failure. Error responses do not expose SQL or stacks.
