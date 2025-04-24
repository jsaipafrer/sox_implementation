INSERT INTO contracts (
    pk_buyer, pk_vendor, item_description, price,
    tip_completion, tip_dispute,
    protocol_version, timeout_delay, algorithm_suite,
accepted
) VALUES (
    'buyer_pk_123', 'vendor_pk_456', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    8, 10, 5, '0.1', 60, 'default', 0
);

INSERT INTO contracts (
    pk_buyer, pk_vendor, item_description, price,
    tip_completion, tip_dispute,
    protocol_version, timeout_delay, algorithm_suite,
accepted
) VALUES (
    'buyer_pk_789', 'vendor_pk_321', '9c56cc51b374c3c1808b7fc5504ac4ff291fe27a4f2b987e0c81bb3f69a3c7bd',
    33, 25, 10, '0.1', 120, 'default', 0
);

INSERT INTO contracts (
    pk_buyer, pk_vendor, item_description, price,
    tip_completion, tip_dispute,
    protocol_version, timeout_delay, algorithm_suite,
accepted
) VALUES (
    'buyer_pk_abc', 'vendor_pk_def', '2c26b46b68ffc68ff99b453c1d30413413422f4f024b02264daaa4c2826f3fb7',
    15, 15, 7, '0.1', 90, 'default', 0
);

INSERT INTO contracts (
    pk_buyer, pk_vendor, item_description, price,
    tip_completion, tip_dispute,
    protocol_version, timeout_delay, algorithm_suite,
accepted
) VALUES (
    'buyer_pk_xyz', 'vendor_pk_lmn', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdddfb55a6f743ffcd93',
    21, 20, 8, '0.1', 75, 'default', 0
);

INSERT INTO contracts (
    pk_buyer, pk_vendor, item_description, price,
    tip_completion, tip_dispute,
    protocol_version, timeout_delay, algorithm_suite,
accepted
) VALUES (
    'buyer_pk_456', 'vendor_pk_654', '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
    156.7, 30, 12, '0.1', 180, 'default', 0
);

INSERT INTO disputes VALUES (
    1, "SB_pk1", "SV_pk1", "proofb1.bin", "proofv1.bin"
);

INSERT INTO disputes VALUES (
    2, "SB_pk2", NULL, "proofb1.bin", NULL
);

INSERT INTO disputes VALUES (
    3, NULL, NULL, NULL, NULL
);