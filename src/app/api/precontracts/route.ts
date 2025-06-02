"use server";

import { hexToBytes } from "@/app/lib/helpers";
import db from "../../lib/sqlite";
import { NextRequest, NextResponse } from "next/server";
import fs, { readFileSync } from "node:fs";
import { UPLOADS_PATH, WASM_PATH } from "../files/[id]/route";
import { hex_to_bytes, initSync } from "@/app/lib/circuits/wasm/circuits";

export async function GET(req: NextRequest) {
    const pk = await req.nextUrl.searchParams.get("pk");
    const stmt = db.prepare(`SELECT * FROM contracts 
        WHERE pk_buyer = ? AND accepted = 0`);

    const contracts = stmt.all(pk);

    return NextResponse.json(contracts);
}

export async function PUT(req: Request) {
    const data = await req.json();
    let stmt = db.prepare(`INSERT INTO contracts (
        pk_buyer, pk_vendor, item_description, price,
        tip_completion, tip_dispute,
        protocol_version, timeout_delay, algorithm_suite,
        commitment, encryption_key, num_blocks, 
        num_gates, accepted
    ) VALUES (
        ?, ?, ?, ?, 
        ?, ?, 
        ?, ?, ?, 
        ?, ?, ?, 
        ?, 0
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
        data.key,
        data.num_blocks,
        data.num_gates
    );
    const id = result.lastInsertRowid;

    const module = readFileSync(`${WASM_PATH}circuits_bg.wasm`);
    initSync({ module: module });

    const fileName = `file_${id}.enc`;
    fs.writeFileSync(`${UPLOADS_PATH}${fileName}`, hex_to_bytes(data.file));

    console.log(fileName);
    stmt = db.prepare(`UPDATE contracts 
        SET encrypted_file_name = ? 
        WHERE id = ?`);
    stmt.run(fileName, id); // FIXME raw insertion might be unsafe
    return NextResponse.json({ id });
}
