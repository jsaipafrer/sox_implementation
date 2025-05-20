"use client";

import { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import FormTextField from "../common/FormTextField";
import FormSelect from "../common/FormSelect";
import FormFileInput from "../common/FormFileInput";
import { Contract } from "./NonAcceptedPrecontractsListView";
import {
    bytesToBlocks,
    circuitToBytesArray,
    hexToBytes,
} from "@/app/lib/helpers";
import { BLOCK_SIZE } from "@/app/lib/encryption";
import { acc } from "@/app/lib/accumulator";
import { compileBasicCircuit } from "@/app/lib/circuits/compilator";
import { openCommitment } from "@/app/lib/commitment";

interface NonAcceptedPrecontractModalProps {
    onClose: () => void;
    contract: Contract;
    publicKey: string;
}

export default function NonAcceptedPrecontractModal({
    onClose,
    contract,
}: NonAcceptedPrecontractModalProps) {
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

    const handleVerifyCommitment = async () => {
        const fileHex = (
            await (
                await fetch(`/api/files/${id}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                })
            ).json()
        ).file;

        const commitmentHex = (
            await (
                await fetch(`/api/commitments/${id}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                })
            ).json()
        ).commitment;

        const ctCircuit = hexToBytes(fileHex);
        const ctBlocks = bytesToBlocks(ctCircuit, BLOCK_SIZE);
        const hCt = acc(ctBlocks);

        // compile circuit and compute accumulator
        const circuit = compileBasicCircuit(ctBlocks.length - 1);
        const hCircuit = acc(circuitToBytesArray(circuit.circuit));

        try {
            openCommitment(hexToBytes(commitmentHex), [hCircuit, hCt]);
            alert("Commitment is correct!");
        } catch {
            alert("!!! Commitment is incorrect !!!");
        }
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
        <Modal title="Non accepted precontract details" onClose={onClose}>
            <div className="space-y-4 grid grid-cols-2 gap-4">
                <div>
                    <strong>Contract ID:</strong> {id}
                </div>
                <div>
                    <strong>Buyer:</strong> {pk_buyer}
                </div>
                <div>
                    <strong>Vendor:</strong> {pk_vendor}
                </div>
                <div>
                    <strong>Item Description:</strong> {item_description}
                </div>
                <div>
                    <strong>Price:</strong> {price}
                </div>
                <div>
                    <strong>Tip Completion:</strong> {tip_completion}
                </div>
                <div>
                    <strong>Tip Dispute:</strong> {tip_dispute}
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
                    <Button
                        label="Verify commitment"
                        onClick={handleVerifyCommitment}
                    />
                </div>

                <div className="col-span-2 flex gap-8">
                    <Button label="Accept" onClick={handleAccept} width="1/2" />
                    <Button label="Reject" onClick={handleReject} width="1/2" />
                </div>
            </div>
        </Modal>
    );
}
