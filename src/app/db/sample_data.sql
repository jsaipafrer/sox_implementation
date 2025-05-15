INSERT INTO contracts (
    pk_buyer, pk_vendor, item_description, price,
    tip_completion, tip_dispute,
    protocol_version, timeout_delay, algorithm_suite,
    commitment, key, accepted
) VALUES (
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    8, 10, 5, 0, 60, 'default', 'commit', 'keyy', 0
);

INSERT INTO contracts (
    pk_buyer, pk_vendor, item_description, price,
    tip_completion, tip_dispute,
    protocol_version, timeout_delay, algorithm_suite,
    commitment, key, accepted
) VALUES (
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '9c56cc51b374c3c1808b7fc5504ac4ff291fe27a4f2b987e0c81bb3f69a3c7bd',
    33, 25, 10, 0, 120, 'default', 'commit', 'keyy', 1
);

INSERT INTO contracts (
    pk_buyer, pk_vendor, item_description, price,
    tip_completion, tip_dispute,
    protocol_version, timeout_delay, algorithm_suite,
    commitment, key, accepted
) VALUES (
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '2c26b46b68ffc68ff99b453c1d30413413422f4f024b02264daaa4c2826f3fb7',
    15, 15, 7, 0, 90, 'default', 'commit', 'keyy', 1
);

INSERT INTO contracts (
    pk_buyer, pk_vendor, item_description, price,
    tip_completion, tip_dispute,
    protocol_version, timeout_delay, algorithm_suite,
    commitment, key, accepted, sponsor
) VALUES (
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdddfb55a6f743ffcd93',
    21, 20, 8, 0, 75, 'default', 'commit', 'keyy', 1, "Stéphane Sponsor"
);

INSERT INTO contracts (
    pk_buyer, pk_vendor, item_description, price,
    tip_completion, tip_dispute,
    protocol_version, timeout_delay, algorithm_suite,
    commitment, key, accepted, sponsor
) VALUES (
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
    156.7, 30, 12, 0, 180, 'default', 'commit', 'keyy', 1, "Στεφανος Σπονσορου"
);

INSERT INTO contracts (
    pk_buyer, pk_vendor, item_description, price,
    tip_completion, tip_dispute,
    protocol_version, timeout_delay, algorithm_suite,
    commitment, key, accepted, sponsor
) VALUES (
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '408f31d86c6bf4a8aff4ea682ad002278f8cb39dc5f37b53d343e63a61f3cc4f',
    44.7, 35, 12, 0, 110, 'default', 'commit', 'keyy', 1, "Stephen Sponsor"
);

INSERT INTO disputes VALUES (
    4, "SB_pk1", "SV_pk1", "proofb1.bin", "proofv1.bin", NULL
);

INSERT INTO disputes VALUES (
    6, "SB_pk2", NULL, "proofb1.bin", NULL, NULL
);

INSERT INTO disputes VALUES (
    5, NULL, NULL, NULL, NULL, NULL
);