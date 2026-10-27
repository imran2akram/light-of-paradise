CREATE TABLE IF NOT EXISTS errors (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    ts      TEXT NOT NULL,         -- when the Worker received it (ISO 8601, UTC)
    build   TEXT,                  -- document.lastModified of the page: which deploy of the game
    where_  TEXT,                  -- 'update', 'draw', 'window' or 'promise'
    message TEXT NOT NULL,
    stack   TEXT,
    room    TEXT,
    phase   TEXT,
    level   INTEGER,
    input   TEXT,                  -- 'keyboard', 'touch' or 'pad'
    ua      TEXT                   -- browser user agent
);
CREATE INDEX IF NOT EXISTS errors_ts ON errors (ts);
