# SmartDine API

All paths below start with `/api`. Browser requests use the same origin and an HttpOnly session cookie; API clients may use a Bearer JWT. JSON bodies are required for mutations. A session expires after one hour; logout revokes all sessions for that account.

| Method and path | Access | Purpose |
|---|---|---|
| GET /health | Public | Service health and version |
| POST /auth/register | Public | Customer registration; username, email, password, privacy_accepted=true |
| POST /auth/login | Public | Email/password login and cookie |
| GET /auth/me | Authenticated | Current database-backed account including display_name (fallback username) |
| POST /auth/logout | Authenticated | Revoke sessions and clear cookie |
| GET /preferences | Customer | Current saved preferences or null |
| PUT /preferences | Customer | cuisine_type, dietary_req, price_range, radius_km |
| POST /location/update | Customer | latitude/longitude; recommendations, exclusions and geofence offers |
| POST /location/recommendations/:restaurantId/viewed | Customer | Mark latest own impression viewed |
| GET /location/notifications | Customer | Own offers |
| PATCH /location/notifications/:notifId/read | Customer | Mark own offer read |
| GET /restaurants | Public | Active fixture venues |
| GET /restaurants/:id/menu | Public | Available menu items |
| GET /restaurants/:id | Public | Full venue metadata and all menu items including unavailable labels |
| GET /favourites | Customer | Own saved restaurants |
| PUT /favourites/:id | Customer | Idempotently save restaurant |
| DELETE /favourites/:id | Customer | Remove own saved restaurant |
| GET /cart | Customer | Persisted cart, integer-cent totals, revision and checkout eligibility |
| POST /cart/items | Customer | Add item_id and integer quantity; one restaurant per cart |
| POST /cart/switch | Customer | Confirmed atomic replacement: item_id, quantity, current cart_revision; stale/unavailable rejection preserves old cart |
| PUT /cart/items/:id | Customer | Set quantity 1-20; maximum 50 units per cart |
| DELETE /cart/items/:id | Customer | Remove own item; JSON {} body |
| DELETE /cart | Customer | Clear own cart; JSON {} body |
| POST /orders | Customer | Validate and atomically store pickup order, then clear own cart |
| GET /orders | Customer | Own order history |
| GET /orders/:id | Customer | Own confirmation/detail; other customers receive 404 |
| GET /orders/managed?restaurant_id=:id | Assigned staff/owner | Latest 100 restaurant orders |
| PATCH /orders/:id/status | Assigned staff/owner | Sequential Confirmed, Preparing, Ready, Completed transitions |
| GET /restaurants/managed | Staff/owner | Assigned venues |
| GET /restaurants/:id/manage | Assigned staff/owner | Full menu, promotion, audit records |
| POST /restaurants/:id/menu | Assigned staff/owner | Create item |
| PATCH /restaurants/:id/menu/:itemId | Assigned staff/owner | Edit item or availability |
| DELETE /restaurants/:id/menu/:itemId | Assigned staff/owner | Delete item |
| PATCH /restaurants/:id/promotion | Assigned staff/owner | Text, enabled flag and optional ISO start/end |
| POST /feedback/:restaurantId | Customer | Upsert rating 1–5 and optional comment |
| GET /feedback/:restaurantId | Public | Paginated reviews: page/page_size; maximum 50 per page, without email |
| GET /feedback/:restaurantId/mine | Customer | Own editable current review |
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

Order fields: customer_name (2-80 characters), optional contact_phone (blank or Australian mobile/landline/service format, at most 25 characters including spaces/parentheses/hyphens), optional pickup_notes (up to 500), fulfilment exactly pickup, cart_revision from GET /cart (64-character hash), idempotency_key (UUID). Prices/totals are server-owned. Money is calculated and persisted in integer AUD cents; order items keep name/price snapshots. A retry with the same account/key returns the original order with HTTP 200, rather than another HTTP 201 creation. The server rechecks availability and Sydney opening hours inside the checkout transaction. No payment or external fulfilment endpoint exists.

Menu fields: item_name, description, category, price, vegetarian, vegan, is_available. Consult `routes/restaurants.js` for exact validation. Dietary values are null, vegetarian or vegan; radius 0.1–50 km; price bands $ to $$$$. Unknown dietary requirements are rejected, never assumed safe.

Status semantics: 200 success; 201 creation; 400 invalid input; 401 missing/expired/revoked authentication; 403 role or venue denial; 404 unavailable resource; 409 duplicate email, cross-restaurant cart, unavailable checkout, stale price/cart or invalid order transition; 413 excessive body; 415 non-JSON mutation; 429 throttling/lockout; 500 unexpected failure. Error responses do not expose SQL or stacks.
