"use client";

import Button from "../components/Button";
import { useRouter } from "next/navigation";
import UserContractsListView from "../components/UserContractsListView";
import ContractInformation from "../components/ContractInformation";
import { useState } from "react";

type Contract = {
    id: number;
    pk_buyer: string;
    pk_vendor: string;
    item_description: string;
    price: number;
    tip_completion: number;
    tip_dispute: number;
    protocol_version: number;
    timeout_delay: number;
    algorithm_suite: string;
    accepted: number;
    sponsor: string;
    optimistic_smart_contract: string | null;
};

export default function Home() {
    const router = useRouter();
    const [selectedContract, setSelectedContract] = useState<Contract>();

    return (
        <main className="p-4 min-h-screen">
            <h1 className="text-xl font-bold mb-4">Sponsored fair exchange</h1>

            <div className="flex gap-8 justify-between items-center mb-8">
                <Button
                    label="To sponsor view"
                    onClick={() => router.push("/")}
                />
                <Button
                    label="Reload data"
                    onClick={() =>
                        window.dispatchEvent(new Event("reloadData"))
                    }
                />
            </div>

            <div className="flex gap-8 justify-between items-center"></div>

            <div className="flex gap-8 my-8">
                <UserContractsListView
                    setSelectedContract={setSelectedContract}
                />
                <ContractInformation contract={selectedContract} />
            </div>

            {/* <div className="flex gap-8 justify-between items-center">
                <Button
                    label="Compile circuit"
                    onClick={() => showModalNewContract(true)}
                />
                <Button
                    label="Search pre-contract"
                    onClick={() => showModalSearchContract(true)}
                />
                <Button
                    label="+ New dispute"
                    onClick={() => showModalNewDispute(true)}
                />
            </div> */}
        </main>
    );
}
