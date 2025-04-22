"use client";

import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import FormTextField from "./FormTextField";
import FormSelect from "./FormSelect";

interface NewContractModalProps {
    onClose: () => void;
    title: string;
}

export default function NewContractModal({
    onClose,
    title,
}: NewContractModalProps) {
    const [buyerPk, setBuyerPk] = useState("");
    const [vendorPk, setVendorPk] = useState("");
    const [itemDescription, setItemDescription] = useState("");
    const [price, setPrice] = useState("");
    const [tipCompletion, setTipCompletion] = useState("");
    const [tipDispute, setTipDispute] = useState("");
    const [version, setVersion] = useState("0.1");
    const [timeoutDelay, setTimeoutDelay] = useState("");
    const [algorithms, setAlgorithms] = useState("default");

    const handleSubmit = () => {
        alert("submitted");
        onClose();
    };

    return (
        <Modal title={title} onClose={onClose}>
            <form className="space-y-4">
                <FormTextField
                    id="buyer-pk"
                    type="text"
                    value={buyerPk}
                    onChange={setBuyerPk}
                >
                    Buyer's public key
                </FormTextField>

                <FormTextField
                    id="vendor-pk"
                    type="text"
                    value={vendorPk}
                    onChange={setVendorPk}
                >
                    Vendor's public key
                </FormTextField>

                <FormTextField
                    id="item-description"
                    type="text"
                    value={itemDescription}
                    onChange={setItemDescription}
                >
                    Item description
                </FormTextField>

                <FormTextField
                    id="price"
                    type="number"
                    value={price}
                    onChange={setPrice}
                >
                    Price
                </FormTextField>

                <FormTextField
                    id="tip-completion"
                    type="text"
                    value={tipCompletion}
                    onChange={setTipCompletion}
                >
                    Tip for completion
                </FormTextField>

                <FormTextField
                    id="tip-dispute"
                    type="text"
                    value={tipDispute}
                    onChange={setTipDispute}
                >
                    Tip for dispute
                </FormTextField>

                <FormTextField
                    id="timeout-delay"
                    type="text"
                    value={timeoutDelay}
                    onChange={setTimeoutDelay}
                >
                    Timeout delay
                </FormTextField>

                <FormSelect
                    id="algorithms"
                    value={algorithms}
                    onChange={setAlgorithms}
                    options={["default"]}
                >
                    Algorithm suite
                </FormSelect>

                <FormSelect
                    id="circuit-version"
                    value={version}
                    onChange={setVersion}
                    options={["0.1"]}
                    disabled
                >
                    Circuit version
                </FormSelect>

                <div className="flex gap-8">
                    <Button label="Submit" onClick={handleSubmit} width="1/2" />
                    <Button label="Cancel" onClick={onClose} width="1/2" />
                </div>
            </form>
        </Modal>
    );
}
