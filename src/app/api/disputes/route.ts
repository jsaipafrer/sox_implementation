import db from "../../lib/sqlite";
import { NextResponse } from "next/server";

export async function GET() {
    const stmt = db.prepare(
        `SELECT contract_id, tip_dispute, buyer_proof_path 
        FROM disputes 
        JOIN contracts 
        ON disputes.contract_id = contracts.id
        WHERE pk_buyer_sponsor IS NULL OR pk_vendor_sponsor IS NULL;`
    );
    const contracts = stmt.all();

    return NextResponse.json(contracts);
}

export async function POST(req: Request) {
    const body = await req.json();
    const stmt = db.prepare(`INSERT INTO disputes VALUES (?, ?, ?, ?);`);
    const result = stmt.run(
        body.contract_id,
        body.pk_buyer_sponsor,
        body.pk_vendor_sponsor,
        body.proof_path
    );
    return NextResponse.json({ id: result.lastInsertRowid });
}
