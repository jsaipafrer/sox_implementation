"use client";

import { useState } from "react";
import Modal, { ModalProps } from "./Modal";
import Button from "./Button";

interface NewDisputeModalProps {
    onClose: () => void;
    title: string;
}

export default function NewDisputeModal({
    onClose,
    title,
}: NewDisputeModalProps) {
    const [buyerKey, setBuyerKey] = useState("");
    const [vendorKey, setVendorKey] = useState("");
    const [contractId, setContractId] = useState("");

    const handleSubmit = () => {
        alert("submitted");
        onClose();
    };

    return (
        <Modal title={title} onClose={onClose}>
            <form className="space-y-4">
                <div>
                    <label className="block mb-1 font-medium">
                        Buyer's public key
                    </label>
                    <input
                        type="text"
                        value={buyerKey}
                        onChange={(e) => setBuyerKey(e.target.value)}
                        className="w-full border border-gray-300 p-2 rounded"
                    />
                </div>

                <div>
                    <label className="block mb-1 font-medium">
                        Vendor's public key
                    </label>
                    <input
                        type="text"
                        value={vendorKey}
                        onChange={(e) => setVendorKey(e.target.value)}
                        className="w-full border border-gray-300 p-2 rounded"
                    />
                </div>

                <div>
                    <label className="block mb-1 font-medium">
                        Item description
                    </label>
                    <input
                        type="text"
                        value={contractId}
                        onChange={(e) => setContractId(e.target.value)}
                        className="w-full border border-gray-300 p-2 rounded"
                    />
                </div>

                <div className="flex gap-8 justify-between items-center">
                    <Button label="Submit" onClick={handleSubmit} />
                    <Button label="Cancel" onClick={onClose} />
                </div>
            </form>
        </Modal>
    );
}
