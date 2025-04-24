"use client";

import Button from "./Button";
import { useEffect, useState } from "react";
import SponsorModal from "./SponsorModal";

type Contract = {
    id: number;
    pk_buyer: string;
    pk_vendor: string;
    item_description: string;
    tip_completion: number;
    tip_dispute: number;
    protocol_version: string;
    timeout_delay: number;
    algorithm_suite: string;
};

export default function ContractsListView() {
    const [modalShown, showModal] = useState(false);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [selectedContract, setSelectedContract] = useState(-1);

    const fetchContracts = () => {
        fetch("/api/unsponsored-contracts")
            .then((res) => res.json())
            .then((data) => setContracts(data));
    };

    useEffect(() => {
        fetchContracts();

        // Listen for the reloadData event
        const handleReloadData = () => {
            fetchContracts();
        };

        window.addEventListener("reloadData", handleReloadData);

        // Clean up the event listener on component unmount
        return () => {
            window.removeEventListener("reloadData", handleReloadData);
        };
    }, []);

    const handleSponsorConfirmation = async (pkSponsor: string) => {
        await fetch("/api/unsponsored-contracts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id: selectedContract,
                pkSponsor,
            }),
        });
        alert(`Sponsored contract ${selectedContract}`);
    };

    return (
        <div className="bg-gray-300 p-4 rounded w-1/2 overflow-auto">
            <h2 className="text-lg font-semibold mb-4">Contracts</h2>
            <table className="w-full table-fixed border-collapse">
                <thead>
                    <tr className="border-b border-black text-left font-medium">
                        <th className="p-2 w-1/5">ID</th>
                        <th className="p-2 w-1/5">Item description</th>
                        <th className="p-2 w-1/5">Completion tip</th>
                        <th className="p-2 w-1/5">Timeout delay</th>
                        <th className="p-2 w-1/5"></th>
                    </tr>
                </thead>
                <tbody>
                    {contracts.map((c, i) => (
                        <tr
                            key={c.id}
                            className="even:bg-gray-200 border-b border-black h-15"
                        >
                            <td className="p-2 w-1/5">{c.id}</td>
                            <td className="p-2 w-1/5">{c.item_description}</td>
                            <td className="p-2 w-1/5">{c.tip_completion}</td>
                            <td className="p-2 w-1/5">{c.timeout_delay}</td>
                            <td className="p-2 w-1/5 text-center">
                                <Button
                                    label="Sponsor"
                                    onClick={() => {
                                        setSelectedContract(c.id);
                                        showModal(true);
                                    }}
                                    width="95/100"
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {modalShown && (
                <SponsorModal
                    title="Sponsor contract"
                    onClose={() => showModal(false)}
                    onConfirm={handleSponsorConfirmation}
                    id_prefix="contract"
                />
            )}
        </div>
    );
}
