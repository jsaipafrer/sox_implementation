import db from "../../../lib/sqlite";
import { NextResponse } from "next/server";

interface DBResponse {
    pk_buyer_sponsor: string;
    pk_vendor_sponsor: string;
}

interface RequestBody {
    contract_id: string;
    pk_sponsor: string;
}

export async function POST(req: Request) {
    const body = await req.json();
    const stmt = db.prepare(
        `SELECT pk_buyer_sponsor, pk_vendor_sponsor FROM disputes WHERE contract_id = ?`
    );
    const result = stmt.all(body.contract_id)[0] as DBResponse;

    if (result.pk_buyer_sponsor === null) return registerSB(body);
    else if (result.pk_vendor_sponsor === null) return registerSV(body);
}

async function registerSB(body: RequestBody) {
    const stmt = db.prepare(
        `UPDATE disputes SET pk_buyer_sponsor = ? WHERE contract_id = ?`
    );
    stmt.run(body.pk_sponsor, body.contract_id);

    return NextResponse.json({ message: "success" });
}

async function registerSV(body: RequestBody) {
    const stmt = db.prepare(
        `UPDATE disputes SET pk_vendor_sponsor = ? WHERE contract_id = ?`
    );
    stmt.run(body.pk_sponsor, body.contract_id);

    return NextResponse.json({ message: "success" });
}
