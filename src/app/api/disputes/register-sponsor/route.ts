import db from "../../../lib/sqlite";
import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "node:fs";
import {
    bytes_to_hex,
    hex_to_bytes,
    initSync,
} from "@/app/lib/circuits/wasm/circuits";
import { UPLOADS_PATH, WASM_PATH } from "../../files/[id]/route";

interface RequestBody {
    contract_id: string;
    pk_buyer_sponsor?: string;
    pk_vendor_sponsor?: string;
    argument: string;
}

export async function POST(req: Request) {
    const module = readFileSync(`${WASM_PATH}circuits_bg.wasm`);
    initSync({ module: module });

    const body = await req.json();

    if (body.pk_buyer_sponsor) return registerSB(body);
    if (body.pk_vendor_sponsor) return registerSV(body);
    return NextResponse.json({
        message: "error",
        error_msg: "Missing sponsor",
    });
}

async function registerSB(body: RequestBody) {
    let stmt = db.prepare(
        `SELECT contract_id FROM disputes WHERE contract_id = ?`
    );
    let dispute = stmt.all(body.contract_id);
    if (dispute.length == 0) {
        stmt = db.prepare(
            `INSERT INTO disputes (contract_id, pk_buyer_sponsor) VALUES (?, ?)`
        );
        stmt.run(body.contract_id, body.pk_buyer_sponsor!);
    } else {
        stmt = db.prepare(
            `UPDATE disputes SET pk_buyer_sponsor = ? WHERE contract_id = ?`
        );
        stmt.run(body.pk_buyer_sponsor!, body.contract_id);
    }

    const fileName = `argument_buyer_${body.contract_id}.bin`;
    writeFileSync(`${UPLOADS_PATH}${fileName}`, hex_to_bytes(body.argument));

    return NextResponse.json({ message: "success" });
}

async function registerSV(body: RequestBody) {
    let stmt = db.prepare(
        `SELECT contract_id FROM disputes WHERE contract_id = ?`
    );
    let dispute = stmt.all(body.contract_id);

    if (dispute.length == 0) {
        stmt = db.prepare(
            `INSERT INTO disputes (contract_id, pk_vendor_sponsor) VALUES (?, ?)`
        );
        stmt.run(body.contract_id, body.pk_vendor_sponsor!);
    } else {
        stmt = db.prepare(
            `UPDATE disputes SET pk_vendor_sponsor = ? WHERE contract_id = ?`
        );
        stmt.run(body.pk_vendor_sponsor!, body.contract_id);
    }

    const fileName = `argument_vendor_${body.contract_id}.bin`;
    writeFileSync(`${UPLOADS_PATH}${fileName}`, hex_to_bytes(body.argument));

    return NextResponse.json({ message: "success" });
}
