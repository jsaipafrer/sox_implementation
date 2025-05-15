DROP TABLE IF EXISTS contracts;
DROP TABLE IF EXISTS disputes;

CREATE TABLE contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pk_buyer TEXT NOT NULL,
    pk_vendor TEXT NOT NULL,
    item_description TEXT NOT NULL,
    price REAL NOT NULL,
    tip_completion REAL NOT NULL,
    tip_dispute REAL NOT NULL,
    protocol_version NUMBER NOT NULL,
    timeout_delay REAL NOT NULL,
    algorithm_suite TEXT NOT NULL,
    commitment TEXT NOT NULL,
    key TEXT NOT NULL,
    accepted NUMBER NOT NULL,
    sponsor TEXT, -- can be null while the sponsor hasn't been found
    optimistic_smart_contract TEXT -- can be null while the sponsor hasn't been found
);

CREATE TABLE disputes (
    contract_id INTEGER UNIQUE NOT NULL,
    pk_buyer_sponsor TEXT,
    pk_vendor_sponsor TEXT,
    buyer_proof_path TEXT, -- no need to store it directly here, it's easier to have a path to it
    vendor_proof_path TEXT,
    dispute_smart_contract TEXT,
    CONSTRAINT fk_contract_id
        FOREIGN KEY (contract_id) 
        REFERENCES contracts(id)
        ON DELETE CASCADE
);