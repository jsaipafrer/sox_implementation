import db from "../../lib/sqlite";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
    const data = await req.json();
    const stmt = db.prepare(`INSERT INTO contracts (
        pk_buyer, pk_vendor, item_description, price,
        tip_completion, tip_dispute,
        protocol_version, timeout_delay, algorithm_suite,
        commitment, key, accepted
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0
    );`);
    const result = stmt.run(
        data.pk_buyer,
        data.pk_vendor,
        data.item_description,
        data.price,
        data.tip_completion,
        data.tip_dispute,
        data.protocol_version,
        data.timeout_delay,
        data.algorithm_suite,
        data.commitment,
        data.key
    );
    return NextResponse.json({ id: result.lastInsertRowid });
}
