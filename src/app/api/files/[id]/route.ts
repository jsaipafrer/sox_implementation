import { NextResponse } from "next/server";
import db from "../../../lib/sqlite";
import fs from "node:fs";
import { bytesToHex } from "@/app/lib/helpers";

export const UPLOADS_PATH = "src/app/uploads/";

interface FileNameResponse {
    encrypted_file_name: string;
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    let stmt = db.prepare(
        `SELECT encrypted_file_name FROM contracts WHERE id = ?`
    );
    const resp = stmt.all(id)[0] as FileNameResponse;
    const file = fs.readFileSync(`${UPLOADS_PATH}${resp.encrypted_file_name}`);

    return NextResponse.json({ file: bytesToHex(file) });
}
