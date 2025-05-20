import db from "@/app/lib/sqlite";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const pk = await req.nextUrl.searchParams.get("pk");
    let stmt = db.prepare(
        `SELECT * FROM contracts 
        WHERE 
            (pk_buyer = ? OR pk_vendor = ?) AND 
            accepted <> 0 AND 
            sponsor IS NOT NULL;`
    );
    const contracts = stmt.all(pk, pk);

    return NextResponse.json(contracts);
}
