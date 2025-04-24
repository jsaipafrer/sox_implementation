import db from "../../lib/sqlite";
import { NextResponse } from "next/server";

export async function GET() {
    const stmt = db.prepare(
        "SELECT * FROM contracts WHERE accepted <> 0 AND sponsor IS NULL;"
    );
    const contracts = stmt.all();

    return NextResponse.json(contracts);
}

export async function POST(req: Request) {
    const data = await req.json();
    const stmt = db.prepare(`UPDATE contracts SET sponsor = ? WHERE id = ?`);
    const result = stmt.run(data.pkSponsor, data.id);
    return NextResponse.json(result);
}
