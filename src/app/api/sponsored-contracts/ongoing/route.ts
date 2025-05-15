import db from "@/app/lib/sqlite";
import { NextRequest, NextResponse } from "next/server";
import { getBlockchainContractInfo } from "@/app/lib/blockchain/optimistic";

type DBContract = {
    id: number;
    pk_buyer: string;
    pk_vendor: string;
    price: number;
    tip_completion: number;
    tip_dispute: number;
    timeout_delay: number;
    sponsor: string;
    optimistic_smart_contract: string;
};

type Contract = {
    id: number;
    pk_buyer: string;
    pk_vendor: string;
    price: number;
    tip_completion: number;
    tip_dispute: number;
    timeout_delay: number;
    sponsor: string;
    optimistic_smart_contract: string;
};

type BlockchainContractInfo = {};

export async function GET(req: NextRequest) {
    const pk = await req.nextUrl.searchParams.get("pk");
    let stmt = db.prepare(
        `SELECT * FROM contracts 
        WHERE 
            (pk_buyer = ? OR pk_vendor = ?) AND 
            accepted <> 0 AND 
            sponsor IS NOT NULL;`
    );
    const contracts = stmt.all(pk, pk) as Contract[];

    for (let i = 0; i < contracts.length; ++i) {
        const c = contracts[i];
        if (!c.optimistic_smart_contract) continue;
        const extraInfo = await getBlockchainContractInfo(
            c.optimistic_smart_contract as `0x${string}`
        );
        console.log(extraInfo);
    }

    return NextResponse.json(contracts);
}
