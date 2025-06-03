"use client";

import Modal from "../common/Modal";
import Button from "../common/Button";
import { Contract } from "./NonAcceptedPrecontractsListView";
import init, {
    bytes_to_hex,
    check_precontract,
    hex_to_bytes,
} from "@/app/lib/circuits/wasm/circuits";
import { downloadFile } from "@/app/lib/helpers";

const BLOCK_SIZE = 64;

interface NonAcceptedPrecontractModalProps {
    onClose: () => void;
    contract?: Contract;
}

export default function NonAcceptedPrecontractModal({
    onClose,
    contract,
}: NonAcceptedPrecontractModalProps) {
    if (!contract) return;
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
        commitment,
        opening_value,
        optimistic_smart_contract,
    } = contract;

    const handleVerifyCommitment = async () => {
        await init();
        const ct = hex_to_bytes(
            (
                await (
                    await fetch(`/api/files/${id}`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    })
                ).json()
            ).file
        );

        const { success, h_circuit, h_ct } = check_precontract(
            item_description,
            commitment,
            opening_value,
            ct
        );

        if (success) {
            if (
                confirm(
                    "Commitment is correct! Do you want to save the encrypted file ?"
                )
            ) {
                downloadFile(ct, "encrypted_file.bin");
            }

            localStorage.setItem(`h_circuit_${id}`, bytes_to_hex(h_circuit));
            localStorage.setItem(`h_ct_${id}`, bytes_to_hex(h_ct));
        } else {
            alert("!!! Commitment doesn't match the received file !!!");
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
