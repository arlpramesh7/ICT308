-- SmartDine database schema
-- Matches the ERD from ICT307 Assessment 3 (System Design Report)
-- SQLite syntax for the Iteration 1 prototype; production target is MySQL 8.0 (3NF), per design doc.

CREATE TABLE IF NOT EXISTS user (
    user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','staff','owner')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    is_active     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS preference (
    pref_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL UNIQUE REFERENCES user(user_id),
    cuisine_type TEXT,
    dietary_req  TEXT,
    price_range  TEXT,
    radius_km    REAL DEFAULT 5
);

CREATE TABLE IF NOT EXISTS restaurant (
    restaurant_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT NOT NULL,
    address          TEXT,
    latitude         REAL NOT NULL,
    longitude        REAL NOT NULL,
    geofence_radius  INTEGER NOT NULL DEFAULT 200, -- metres
    cuisine_type     TEXT,
    price_range      TEXT,
    is_active        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS menu_item (
    item_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurant(restaurant_id),
    item_name     TEXT NOT NULL,
    price         REAL NOT NULL,
    category      TEXT,
    is_available  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS recommendation (
    rec_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES user(user_id),
    restaurant_id INTEGER NOT NULL REFERENCES restaurant(restaurant_id),
    score         REAL NOT NULL,
    timestamp     TEXT NOT NULL DEFAULT (datetime('now')),
    is_viewed     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notification (
    notif_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES user(user_id),
    restaurant_id INTEGER NOT NULL REFERENCES restaurant(restaurant_id),
    message       TEXT NOT NULL,
    sent_at       TEXT NOT NULL DEFAULT (datetime('now')),
    is_read       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS feedback (
    feedback_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES user(user_id),
    restaurant_id INTEGER NOT NULL REFERENCES restaurant(restaurant_id),
    rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       TEXT,
    submitted_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
