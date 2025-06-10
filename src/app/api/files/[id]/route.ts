import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { bytes_to_hex, initSync } from "@/app/lib/crypto_lib";

export const UPLOADS_PATH = "src/app/uploads/";
export const WASM_PATH = "src/app/lib/crypto_lib/";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const module = readFileSync(`${WASM_PATH}crypto_lib_bg.wasm`);
    initSync({ module: module });

    const { id } = await params;
    const fileName = `file_${id}.enc`;
    const file = readFileSync(`${UPLOADS_PATH}${fileName}`);

    return NextResponse.json({ file: bytes_to_hex(file) });
}
