"use client";

import Button from "./Button";
import { SetStateAction, useEffect, useState } from "react";

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

interface UserContractsListViewProps {
    setSelectedContract: (id: SetStateAction<Contract | undefined>) => void;
}

export default function UserContractsListView({
    setSelectedContract,
}: UserContractsListViewProps) {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [pk, setPk] = useState("");

    const fetchContracts = () => {
        fetch(`/api/sponsored-contracts/ongoing?pk=${pk}`)
            .then((res) => res.json())
            .then((data) => setContracts(data));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            console.log("eh");
            fetchContracts();
        }
    };

    useEffect(() => {
        const handleReloadData = () => {
            fetchContracts();
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("reloadData", handleReloadData);

        return () => {
            window.removeEventListener("reloadData", handleReloadData);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [pk]);

    return (
        <>
            <div className="bg-gray-300 p-4 rounded w-1/2 overflow-auto">
                <h2 className="text-lg font-semibold mb-4">Contracts</h2>
                <label className="mb-1 font-medium" htmlFor="public-key">
                    Public key
                </label>
                <input
                    name="public-key"
                    id="public-key"
                    type="text"
                    value={pk}
                    onChange={(e) => setPk(e.target.value)}
                    className="mx-4 border border-black p-2 rounded bg-white"
                />
                <Button
                    label="Search"
                    onClick={fetchContracts}
                    width="95/100"
                />

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
                                            setSelectedContract(c);
                                        }}
                                        width="95/100"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
