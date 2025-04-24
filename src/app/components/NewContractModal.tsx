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
        let data = {
            pk_buyer: buyerPk,
            pk_vendor: vendorPk,
            item_description: itemDescription,
            price: price,
            tip_completion: tipCompletion,
            tip_dispute: tipDispute,
            protocol_version: version,
            timeout_delay: timeoutDelay,
            algorithm_suite: algorithms,
        };
        fetch("/api/precontracts", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        })
            .then((res) => res.json())
            .then((data) =>
                alert(`Added new contract, it has the ID ${data.id}`)
            );
        window.dispatchEvent(new Event("reloadData"));
        onClose();
    };

    return (
        <Modal title={title} onClose={onClose}>
            <div className="space-y-4 grid grid-cols-2 gap-4">
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
                    type="number"
                    value={tipCompletion}
                    onChange={setTipCompletion}
                >
                    Tip for completion
                </FormTextField>

                <FormTextField
                    id="tip-dispute"
                    type="number"
                    value={tipDispute}
                    onChange={setTipDispute}
                >
                    Tip for dispute
                </FormTextField>

                <FormTextField
                    id="timeout-delay"
                    type="number"
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
                    disabled
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

                <div className="col-span-2 flex gap-8">
                    <Button label="Submit" onClick={handleSubmit} width="1/2" />
                    <Button label="Cancel" onClick={onClose} width="1/2" />
                </div>
            </div>
        </Modal>
    );
}
