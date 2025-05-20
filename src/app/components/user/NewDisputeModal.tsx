"use client";

import { useState } from "react";
import Modal, { ModalProps } from "../common/Modal";
import Button from "../common/Button";
import FormInput from "../common/FormTextField";

interface NewDisputeModalProps {
    onClose: () => void;
    title: string;
}

export default function NewDisputeModal({
    onClose,
    title,
}: NewDisputeModalProps) {
    const [contractId, setContractId] = useState("");

    const handleSubmit = async () => {
        await fetch("/api/disputes/trigger", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ contract_id: contractId }),
        });
        window.dispatchEvent(new Event("reloadData"));
        onClose();
        alert(`Triggered dispute for contract ${contractId}`);
    };

    return (
        <Modal title={title} onClose={onClose}>
            <div className="space-y-4">
                <FormInput
                    id="dispute-contract-id"
                    type="text"
                    value={contractId}
                    onChange={setContractId}
                >
                    Contract ID
                </FormInput>

                <div className="flex gap-8 justify-between items-center">
                    <Button label="Submit" onClick={handleSubmit} />
                    <Button label="Cancel" onClick={onClose} />
                </div>
            </div>
        </Modal>
    );
}
