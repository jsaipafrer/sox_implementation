"use client";

import Modal from "../common/Modal";
import Button from "../common/Button";
import { Contract } from "./SponsoredContractsListView";
import {
    bytesToBlocks,
    circuitToBytesArray,
    hexToBytes,
} from "@/app/lib/helpers";
import { BLOCK_SIZE } from "@/app/lib/encryption";
import { acc } from "@/app/lib/accumulator";
import { compileBasicCircuit } from "@/app/lib/circuits/compilator";
import { openCommitment } from "@/app/lib/commitment";
import { useState } from "react";

interface SponsoredContractModalProps {
    onClose: () => void;
    contract?: Contract;
}

export default function SponsoredContractModal({
    onClose,
    contract,
}: SponsoredContractModalProps) {
    if (!contract) return;

    const [detailsShown, setShowDetails] = useState(false);

    const {
        id,
        pk_buyer,
        pk_vendor,
        item_description,
        price,
        tip_completion,
        tip_dispute,
        protocol_version,
        timeout_delay,
        algorithm_suite,
        accepted,
        sponsor,
        optimistic_smart_contract,
    } = contract;

    const handleShowdetails = async () => {
        setShowDetails(true);
    };

    const handleAccept = async () => {
        await fetch("/api/precontracts/accept", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id }),
        });
        window.dispatchEvent(new Event("reloadData"));
        alert(`Accepted contract ${id}`);
        onClose();
    };

    const handleReject = async () => {
        await fetch("/api/precontracts/reject", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id }),
        });
        window.dispatchEvent(new Event("reloadData"));
        alert(`Rejected contract ${id}`);
        onClose();
    };

    return (
        <Modal title={`Contract ${id} details`} onClose={onClose}>
            <div className="space-y-4 grid grid-cols-2 gap-4">
                <div>
                    <strong>Contract ID:</strong> {id}
                </div>
                <div>
                    <strong>Smart contract address:</strong> {pk_buyer}
                </div>
                <div>
                    <strong>Buyer:</strong> {pk_vendor}
                </div>
                <div>
                    <strong>Vendor:</strong> {item_description}
                </div>
                <div>
                    <strong>Price:</strong> {price}
                </div>
                <div>
                    <strong>Completion tip:</strong> {tip_completion}
                </div>
                <div>
                    <strong>Dispute tip:</strong> {tip_dispute}
                </div>
                <div>
                    <strong>Protocol Version:</strong> {protocol_version}
                </div>
                <div>
                    <strong>Timeout Delay:</strong> {timeout_delay}
                </div>
                <div>
                    <strong>Algorithm Suite:</strong> {algorithm_suite}
                </div>
                <div>
                    <strong>Accepted:</strong> {accepted != 0 ? "Yes" : "No"}
                </div>
                <div>
                    <strong>Sponsor:</strong> {sponsor}
                </div>
                <div>
                    <strong>Optimistic Smart Contract:</strong>{" "}
                    {optimistic_smart_contract || "N/A"}
                </div>
                <div className="col-span-2">
                    <Button label="Show details" onClick={handleShowdetails} />
                </div>

                <div className="col-span-2 flex gap-8">
                    <Button label="Accept" onClick={handleAccept} width="1/2" />
                    <Button label="Reject" onClick={handleReject} width="1/2" />
                </div>
            </div>
        </Modal>
    );
}
