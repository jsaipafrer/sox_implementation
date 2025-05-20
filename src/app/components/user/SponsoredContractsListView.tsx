"use client";

import Button from "../common/Button";
import { SetStateAction, useEffect, useState } from "react";
import SponsoredContractModal from "./SponsoredContractModal";

export type Contract = {
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

interface SponsoredContractsListViewProps {
    publicKey: string;
}

export default function SponsoredContractsListView({
    publicKey,
}: SponsoredContractsListViewProps) {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [displayedContract, setSelectedContract] = useState<Contract>();
    const [modalShown, showModal] = useState(false);

    const fetchContracts = () => {
        fetch(`/api/sponsored-contracts/ongoing?pk=${publicKey}`)
            .then((res) => res.json())
            .then((data) => setContracts(data));
    };

    const handleShowDetails = (c: Contract) => {
        setSelectedContract(c);
        showModal(true);
    };

    useEffect(() => {
        const handleReloadData = () => {
            fetchContracts();
        };

        handleReloadData();
        window.addEventListener("reloadData", handleReloadData);

        return () => {
            window.removeEventListener("reloadData", handleReloadData);
        };
    }, [publicKey]);

    return (
        <>
            <div className="bg-gray-300 p-4 rounded w-1/2 overflow-auto">
                <h2 className="text-lg font-semibold mb-4">
                    Sponsored contracts
                </h2>

                <table className="w-full table-fixed border-collapse">
                    <thead>
                        <tr className="border-b border-black text-left font-medium">
                            <th className="p-2 w-1/6">ID</th>
                            <th className="p-2 w-1/3">
                                Smart contract address
                            </th>
                            <th className="p-2 w-1/6">State</th>
                            <th className="p-2 w-1/6"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {contracts.map((c, i) => (
                            <tr
                                key={c.id}
                                className="even:bg-gray-200 border-b border-black h-15"
                            >
                                <td className="p-2 w-1/5">{c.id}</td>
                                <td className="p-2 w-1/5">
                                    {c.optimistic_smart_contract}
                                </td>
                                <td className="p-2 w-1/5">{c.timeout_delay}</td>
                                <td className="p-2 w-1/5 text-center">
                                    <Button
                                        label="Show details"
                                        onClick={() => {
                                            handleShowDetails(c);
                                        }}
                                        width="95/100"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modalShown && (
                <SponsoredContractModal
                    onClose={() => showModal(false)}
                    contract={displayedContract}
                />
            )}
        </>
    );
}
