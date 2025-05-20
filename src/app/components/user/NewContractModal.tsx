"use client";

import { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import FormTextField from "../common/FormTextField";
import FormSelect from "../common/FormSelect";
import FormFileInput from "../common/FormFileInput";
import { commit } from "../../lib/commitment";
import {
    bytesToBlocks,
    bytesToHex,
    circuitToBytesArray,
    concatBytes,
    fileToBytes,
    padBytes,
} from "../../lib/helpers";
import { encrypt, generateKey } from "../../lib/encryption";
import { acc } from "../../lib/accumulator";
import { compileBasicCircuit } from "../../lib/circuits/compilator";
import { BLOCK_SIZE } from "../../lib/circuits/components/aes-ctr";
import { sha256CircuitPadding } from "../../lib/circuits/components/sha256";

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
    const [price, setPrice] = useState("");
    const [tipCompletion, setTipCompletion] = useState("");
    const [tipDispute, setTipDispute] = useState("");
    const [version, setVersion] = useState("0");
    const [timeoutDelay, setTimeoutDelay] = useState("");
    const [algorithms, setAlgorithms] = useState("default");
    const [file, setFile] = useState<FileList | null>();

    const handleSubmit = async () => {
        // generate the encryption key and encrypt the file with it
        const [key, keyBytes] = await generateKey(16); // 128 bits key
        const fileBytes = await fileToBytes(file![0]);

        // we pad the file so that its length is a multiple of the block size
        const padLength = BLOCK_SIZE - (fileBytes.length % BLOCK_SIZE);
        const paddedFile = padBytes(
            fileBytes,
            fileBytes.length + padLength,
            true
        );
        const ct = await encrypt(paddedFile, key);
        const ctCircuit = concatBytes([
            ct.ct,
            padBytes(ct.counter, BLOCK_SIZE),
        ]);

        // Get the description. Note that even though the basic circuit does AES
        // decryption + SHA256, doing a standard SHA256 hash will not work because
        // the circuit doesn't use the same padding as SHA256 does. This is why
        // we use a "special" SHA256 with right 0-padding to get the description.
        const description = sha256CircuitPadding(paddedFile);

        // convert the ciphertext to blocks and compute accumulator
        const ctBlocks = bytesToBlocks(ctCircuit, BLOCK_SIZE);
        const hCt = acc(ctBlocks);

        // compile circuit and compute accumulator
        const circuit = compileBasicCircuit(ctBlocks.length - 1);
        const hCircuit = acc(circuitToBytesArray(circuit.circuit));

        // compute commitment
        const commitment = commit(hCircuit, hCt);

        let data = {
            pk_buyer: buyerPk,
            pk_vendor: vendorPk,
            item_description: bytesToHex(description, true),
            price: price,
            tip_completion: tipCompletion,
            tip_dispute: tipDispute,
            protocol_version: version,
            timeout_delay: timeoutDelay,
            algorithm_suite: algorithms,
            commitment: bytesToHex(commitment, true),
            key: bytesToHex(keyBytes, true),
            file: bytesToHex(ctCircuit),
        };

        fetch("/api/precontracts", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        })
            .then((res) => res.json())
            .then((data) => {
                alert(`Added new contract with ID ${data.id}`);
            });
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
