import db from "../../lib/sqlite";
import { NextResponse } from "next/server";

export async function GET() {
    const stmt = db.prepare("SELECT * FROM contracts");
    const contracts = stmt.all();

    return NextResponse.json(contracts);
}

export async function POST(req: Request) {
    const body = await req.json();
    const stmt = db.prepare("INSERT INTO items (name, price) VALUES (?, ?)");
    const result = stmt.run(body.name, body.price);
    return NextResponse.json({ id: result.lastInsertRowid });
}
