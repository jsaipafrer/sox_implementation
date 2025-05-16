"use server";

import { hexToBytes } from "@/app/lib/helpers";
import db from "../../lib/sqlite";
import { NextResponse } from "next/server";
import fs from "node:fs/promises";

const UPLOADS_PATH = "src/app/uploads/";

export async function PUT(req: Request) {
    const data = await req.json();
    let stmt = db.prepare(`INSERT INTO contracts (
        pk_buyer, pk_vendor, item_description, price,
        tip_completion, tip_dispute,
        protocol_version, timeout_delay, algorithm_suite,
        commitment, encryption_key, accepted
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
    const id = result.lastInsertRowid;

    const fileName = `file_${id}.enc`;
    await fs.writeFile(`${UPLOADS_PATH}${fileName}`, hexToBytes(data.file));

    stmt = db.prepare(`UPDATE contracts 
        SET encrypted_file_name = ? 
        WHERE id = ?`);
    stmt.run(fileName, data.id); // FIXME raw insertion might be unsafe
    return NextResponse.json({ id });
}
