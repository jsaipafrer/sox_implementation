DROP TABLE IF EXISTS contracts;
DROP TABLE IF EXISTS disputes;

CREATE TABLE contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pk_buyer TEXT,
    pk_vendor TEXT,
    item_description TEXT,
    tip_completion NUMBER,
    tip_dispute NUMBER,
    protocol_version TEXT,
    timeout_delay NUMBER,
    algorithm_suite TEXT
)