"use client";

import { useState } from "react";
import Modal, { ModalProps } from "./Modal";
import Button from "./Button";

interface NewContractModalProps {
    onClose: () => void;
    title: string;
}

export default function NewContractModal({
    onClose,
    title,
}: NewContractModalProps) {
    const [buyerKey, setBuyerKey] = useState("");
    const [vendorKey, setVendorKey] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [version, setVersion] = useState("0.1");

    const handleSubmit = () => {
        alert("submitted");
        onClose();
    };

    return (
        <Modal title={title} onClose={onClose}>
            <div className="space-y-4">
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
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full border border-gray-300 p-2 rounded"
                    />
                </div>

                <div>
                    <label className="block mb-1 font-medium">Price</label>
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full border border-gray-300 p-2 rounded"
                    />
                </div>

                <div>
                    <label className="block mb-1 font-medium">
                        Circuit version
                    </label>
                    <select
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        disabled
                        className="w-full border border-gray-300 p-2 rounded bg-gray-100 text-gray-500"
                    >
                        <option value="0.1">0.1</option>
                    </select>
                </div>

                <div className="flex gap-8">
                    <Button label="Submit" onClick={handleSubmit} width="1/2" />
                    <Button label="Cancel" onClick={onClose} width="1/2" />
                </div>
            </div>
        </Modal>
    );
}
