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
    let stmt = db.prepare(`UPDATE contracts SET sponsor = ? WHERE id = ?`);
    stmt.run(data.pkSponsor, data.id);

    stmt = db.prepare(`SELECT * FROM contracts WHERE id = ?`);
    const result = stmt.all(data.id)[0];
    return NextResponse.json(result);
}
