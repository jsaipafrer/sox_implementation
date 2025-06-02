import { NextResponse } from "next/server";
import db from "../../../lib/sqlite";
import { readFileSync } from "node:fs";
import { bytes_to_hex, initSync } from "@/app/lib/circuits/wasm/circuits";

export const UPLOADS_PATH = "src/app/uploads/";
export const WASM_PATH = "src/app/lib/circuits/wasm/";

interface FileNameResponse {
    encrypted_file_name: string;
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const module = readFileSync(`${WASM_PATH}circuits_bg.wasm`);
    initSync({ module: module });

    const { id } = await params;
    let stmt = db.prepare(
        `SELECT encrypted_file_name FROM contracts WHERE id = ?`
    );
    const resp = stmt.all(id)[0] as FileNameResponse;
    const file = readFileSync(`${UPLOADS_PATH}${resp.encrypted_file_name}`);

    return NextResponse.json({ file: bytes_to_hex(file) });
}
