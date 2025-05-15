import { NextResponse } from "next/server";
import db from "../../../lib/sqlite";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    let stmt = db.prepare(`SELECT * FROM contracts WHERE id = ?`);
    const contract = stmt.all(id);

    return NextResponse.json(contract);
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const data = await req.json();
    let stmt = db.prepare(
        `UPDATE contracts SET optimistic_smart_contract = ? WHERE id = ?`
    );
    stmt.run(data.contractAddress, id);
}
