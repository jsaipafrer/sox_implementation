"use client";

import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import FormTextField from "./FormTextField";
import FormSelect from "./FormSelect";
import FormFileInput from "./FormFileInput";
import { commitFile } from "../lib/commitment";
import { bytesToBlocks, bytesToHex } from "../lib/helpers";
import { encryptFile, generateKey } from "../lib/encryption";
import { acc } from "../lib/accumulator";

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
    const [version, setVersion] = useState("0");
    const [timeoutDelay, setTimeoutDelay] = useState("");
    const [algorithms, setAlgorithms] = useState("default");
    const [file, setFile] = useState<FileList | null>();

    const handleSubmit = async () => {
        const key = await generateKey(16); // 128 bits key
        const ct = await encryptFile(file!, key, new Uint8Array(16)); // TODO how to handle iv
        const ctBlocks = bytesToBlocks(ct, 256);
        const hCt = acc(ctBlocks);

        // const commitment = await commitFile(file!, new Uint8Array(8)); // TODO set key,
        // const description =
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
            // commitment: bytesToHex(commitment, true),
            // key: bytesToHex(key, true),
        };

        console.log(data);
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

                {/* <FormTextField
                    id="item-description"
                    type="text"
                    value={itemDescription}
                    onChange={setItemDescription}
                >
                    Item description
                </FormTextField> */}

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
                    Timeout delay (s)
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
                    options={["0"]}
                    disabled
                >
                    Circuit version
                </FormSelect>

                <FormFileInput id="sold-file" type="file" onChange={setFile}>
                    File
                </FormFileInput>

                <div className="col-span-2 flex gap-8">
                    <Button label="Submit" onClick={handleSubmit} width="1/2" />
                    <Button label="Cancel" onClick={onClose} width="1/2" />
                </div>
            </div>
        </Modal>
    );
}
