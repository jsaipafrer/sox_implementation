"use client";

import { useEffect, useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import FormTextField from "../common/FormTextField";
import FormSelect from "../common/FormSelect";
import FormFileInput from "../common/FormFileInput";
import { downloadFile, fileToBytes } from "../../lib/helpers";
import { generateKey } from "../../lib/encryption";
import init, {
    bytes_to_hex,
    compute_precontract_values,
} from "@/app/lib/circuits/wasm/circuits";

const BLOCK_SIZE = 64;

interface NewContractModalProps {
    onClose: () => void;
    vendorPk: string;
    title: string;
}

export default function NewContractModal({
    onClose,
    vendorPk,
    title,
}: NewContractModalProps) {
    const [buyerPk, setBuyerPk] = useState("");
    const [price, setPrice] = useState("");
    const [tipCompletion, setTipCompletion] = useState("");
    const [tipDispute, setTipDispute] = useState("");
    const [version, setVersion] = useState("0");
    const [timeoutDelay, setTimeoutDelay] = useState("");
    const [algorithms, setAlgorithms] = useState("default");
    const [file, setFile] = useState<FileList | null>();

    const handleSubmit = async () => {
        await init();
        // generate the encryption key and encrypt the file with it
        const [, keyBytes] = await generateKey(16); // 128 bits key
        const fileBytes = await fileToBytes(file![0]);

        const {
            ct,
            circuit_bytes,
            description,
            h_ct,
            h_circuit,
            commitment,
            num_blocks,
            num_gates,
        } = compute_precontract_values(fileBytes, keyBytes, BLOCK_SIZE);

        const keyHex = bytes_to_hex(keyBytes);
        let data = {
            pk_buyer: buyerPk,
            pk_vendor: vendorPk,
            item_description: bytes_to_hex(description),
            price: price,
            tip_completion: tipCompletion,
            tip_dispute: tipDispute,
            protocol_version: version,
            timeout_delay: timeoutDelay,
            algorithm_suite: algorithms,
            commitment: bytes_to_hex(commitment),
            num_blocks,
            num_gates,
            key: keyHex,
            file: bytes_to_hex(ct),
        };

        const response_raw = await fetch("/api/precontracts", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
        const { id } = await response_raw.json();
        alert(
            `Added new contract with ID ${id}. The encryption key is: ${keyHex}`
        );
        localStorage.setItem(`h_circuit_${id}`, bytes_to_hex(h_circuit));
        localStorage.setItem(`h_ct_${id}`, bytes_to_hex(h_ct));

        if (confirm("Do you want to save the encrypted file ?"))
            downloadFile(ct, "encrypted_file.bin");
        if (confirm("Do you want to save the circuit data ?"))
            downloadFile(circuit_bytes, "circuit.bin");

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

                <FormFileInput id="sold-file" onChange={setFile}>
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
