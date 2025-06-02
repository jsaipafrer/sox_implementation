import { UPLOADS_PATH, WASM_PATH } from "@/app/api/files/[id]/route";
import { bytes_to_hex, initSync } from "@/app/lib/circuits/wasm/circuits";
import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const fileName = `argument_vendor_${id}.bin`;
    const module = readFileSync(`${WASM_PATH}circuits_bg.wasm`);
    initSync({ module: module });

    const argument = readFileSync(`${UPLOADS_PATH}${fileName}`);

    return NextResponse.json({ argument: bytes_to_hex(argument) });
}
