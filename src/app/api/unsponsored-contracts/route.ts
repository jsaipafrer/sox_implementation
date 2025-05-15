import db from "../../lib/sqlite";
import { NextResponse } from "next/server";

export async function GET() {
    const stmt = db.prepare(
        "SELECT * FROM contracts WHERE accepted <> 0 AND sponsor IS NULL;"
    );
    const contracts = stmt.all();

    return NextResponse.json(contracts);
}
