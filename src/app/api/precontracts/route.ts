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
        item_description, opening_value,
        pk_buyer, pk_vendor, price, num_blocks, 
        num_gates, commitment, tip_completion, tip_dispute,
        protocol_version, timeout_delay, algorithm_suite,
        accepted
    ) VALUES (
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        0
    );`);
    const result = stmt.run(
        data.item_description,
        data.opening_value,
        data.pk_buyer,
        data.pk_vendor,
        data.price,
        data.num_blocks,
        data.num_gates,
        data.commitment,
        data.tip_completion,
        data.tip_dispute,
        data.protocol_version,
        data.timeout_delay,
        data.algorithm_suite
    );
    const id = result.lastInsertRowid;

    const module = readFileSync(`${WASM_PATH}circuits_bg.wasm`);
    initSync({ module: module });

    const fileName = `file_${id}.enc`;
    fs.writeFileSync(`${UPLOADS_PATH}${fileName}`, hex_to_bytes(data.file));
    return NextResponse.json({ id });
}
