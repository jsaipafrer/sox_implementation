import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { bytes_to_hex, initSync } from "@/app/lib/circuits/wasm/circuits";

export const UPLOADS_PATH = "src/app/uploads/";
export const WASM_PATH = "src/app/lib/circuits/wasm/";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const module = readFileSync(`${WASM_PATH}circuits_bg.wasm`);
    initSync({ module: module });

    const { id } = await params;
    const fileName = `file_${id}.enc`;
    const file = readFileSync(`${UPLOADS_PATH}${fileName}`);

    return NextResponse.json({ file: bytes_to_hex(file) });
}
