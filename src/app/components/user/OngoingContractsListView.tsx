"use client";

import Button from "../common/Button";
import { SetStateAction, useEffect, useState } from "react";
import OngoingContractModal from "./OngoingContractModal";
import { getState } from "@/app/lib/blockchain/common";

export type Contract = {
    id: number;
    pk_buyer: string;
    pk_vendor: string;
    price: number;
    item_description: string;
    tip_completion: number;
    tip_dispute: number;
    protocol_version: number;
    timeout_delay: number;
    algorithm_suite: string;
    sponsor: string;
    commitment: string;
    num_blocks: number;
    num_gates: number;
    optimistic_smart_contract: string;
    opening_value: string;
    state?: bigint;
    dispute_smart_contract?: string;
    pk_sb?: string;
    pk_sv?: string;
};

/*
    WaitPayment,
    WaitKey,
    WaitSB,
    WaitSBFee,
    WaitSV,
    WaitSVFee,
    WaitDisputeStart,
    InDispute,
    End
*/
export const OPTIMISTIC_STATES = [
    "Waiting for buyer payment",
    "Waiting for vendor key",
    "Key available. Waiting for buyer dispute sponsor",
    "Waiting for buyer dispute sponsor's fee",
    "Waiting for vendor dispute sponsor",
    "Waiting for vendor dispute sponsor's fee",
    "Waiting for dispute to start",
    "In dispute",
    "End",
];

/*
    ChallengeBuyer,
    WaitVendorOpinion,
    WaitVendorData,
    WaitVendorDataLeft,
    WaitVendorDataRight,
    Complete,
    Cancel,
    End
*/
export const DISPUTE_STATES = [
    "Waiting for buyer challenge response",
    "Waiting for vendor's opinion on challenge response",
    "Waiting for vendor's argument",
    "Waiting for vendor's argument",
    "Waiting for vendor's argument",
    "Transaction completed, can be ended",
    "Transaction cancelled, can be ended",
    "End",
];

interface OngoingContractsListViewProps {
    publicKey: string;
}

export default function OngoingContractsListView({
    publicKey,
}: OngoingContractsListViewProps) {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [displayedContract, setSelectedContract] = useState<Contract>();
    const [modalShown, showModal] = useState(false);

    const fetchContracts = async () => {
        const contractsRaw = await fetch(
            `/api/sponsored-contracts/ongoing?pk=${publicKey}`
        );
        const contracts = await contractsRaw.json();

        for (let i = 0; i < contracts.length; ++i) {
            contracts[i].state = await getState(contracts[i]);
        }

        setContracts(contracts);
    };

    const handleShowDetails = (c: Contract) => {
        setSelectedContract(c);
        showModal(true);
    };

    const displayState = (c: Contract) => {
        if (c.dispute_smart_contract) {
            return DISPUTE_STATES[Number(c.state)];
        } else {
            return c.state != undefined
                ? OPTIMISTIC_STATES[Number(c.state)]
                : "";
        }
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
            <div className="bg-gray-300 p-4 rounded overflow-auto">
                <h2 className="text-lg font-semibold mb-4">
                    Ongoing contracts
                </h2>

                <table className="w-full table-fixed border-collapse">
                    <thead>
                        <tr className="border-b border-black text-left font-medium">
                            <th className="p-2 w-1/10">ID</th>
                            <th className="p-2 w-5/10">
                                Smart contract address
                            </th>
                            <th className="p-2 w-2/10">State</th>
                            <th className="p-2 w-2/10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {contracts.map((c, i) => (
                            <tr
                                key={c.id}
                                className="even:bg-gray-200 border-b border-black h-15"
                            >
                                <td className="p-2 w-1/10">{c.id}</td>
                                <td className="p-2 w-5/10 text-wrap">
                                    {c.dispute_smart_contract
                                        ? c.dispute_smart_contract
                                        : c.optimistic_smart_contract}
                                </td>
                                <td className="p-2 w-2/10 text-wrap">
                                    {displayState(c)}
                                </td>
                                <td className="p-2 w-2/10 text-center">
                                    <Button
                                        label="More information"
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
                <OngoingContractModal
                    onClose={() => showModal(false)}
                    contract={displayedContract}
                    publicKey={publicKey}
                />
            )}
        </>
    );
}
