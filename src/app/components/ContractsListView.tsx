"use client";

import Button from "./Button";
import { useEffect, useState } from "react";
import SponsorModal from "./SponsorModal";
import { deployOptimisticContract } from "../lib/blockchain/optimistic";

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
    const [isDeploying, setIsDeploying] = useState(false);

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
        setIsDeploying(true);
        const contractInfo = await fetch("/api/unsponsored-contracts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id: selectedContract,
                pkSponsor,
            }),
        }).then((res) => res.json());

        const contractAddress = await deployOptimisticContract(
            contractInfo.pk_buyer,
            contractInfo.pk_vendor,
            contractInfo.price as number
        );

        setIsDeploying(false);
        alert(
            `Sponsored contract ${selectedContract}!
    Deployed contract with address ${contractAddress}`
        );
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

            {isDeploying && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
                    <div className="text-white text-lg">
                        Deploying contract...
                    </div>

                    <div role="status">
                        <svg
                            aria-hidden="true"
                            className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                            viewBox="0 0 100 101"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                fill="currentColor"
                            />
                            <path
                                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                fill="currentFill"
                            />
                        </svg>
                    </div>
                </div>
            )}
        </div>
    );
}
