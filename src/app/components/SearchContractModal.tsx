"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import FormInput from "./FormTextField";
import { bytesToBlocks, circuitToBytesArray, hexToBytes } from "../lib/helpers";
import { acc } from "../lib/accumulator";
import { BLOCK_SIZE } from "../lib/encryption";
import { compileBasicCircuit } from "../lib/circuits/compilator";
import { open } from "../lib/commitment";

interface NewContractModalProps {
    onClose: () => void;
    title: string;
}

type ContractRow = {
    id: string;
    pk_buyer: string;
    pk_vendor: string;
    item_description: string;
    // add other fields as needed…
};

export default function SearchContractModal({
    onClose,
    title,
}: NewContractModalProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<ContractRow[]>([]);

    const handleSearch = async () => {
        setResults([]);
        const res = await fetch(`/api/precontracts/${query}`);
        const rows = await res.json();
        if (rows.length > 0) setResults(rows);
    };

    const handleAccept = async (id: string) => {
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

    const handleReject = async (id: string) => {
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

    const verifyCommitment = async (id: string) => {
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
            open(hexToBytes(commitmentHex), [hCircuit, hCt]);
            alert("Commitment is correct!");
        } catch {
            alert("!!! Commitment is incorrect !!!");
        }
    };

    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if (e.key === "Enter") {
                await handleSearch();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleSearch]);

    return (
        <Modal title={title} onClose={onClose}>
            <div className="space-y-4">
                <FormInput
                    id="search-contract"
                    type="text"
                    value={query}
                    onChange={setQuery}
                >
                    Contract Number
                </FormInput>
                <Button label="Search" onClick={handleSearch} width="full" />

                {results.length > 0 && (
                    <div className="overflow-auto">
                        <table className="w-full table-fixed border-collapse mt-4">
                            <thead>
                                <tr className="bg-gray-200">
                                    <th className="p-2">ID</th>
                                    <th className="p-2">Buyer PK</th>
                                    <th className="p-2">Vendor PK</th>
                                    <th className="p-2">Description</th>
                                    <th className="p-2"></th>
                                    <th className="p-2"></th>
                                    <th className="p-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="even:bg-gray-100"
                                    >
                                        <td className="p-2 border">{row.id}</td>
                                        <td className="p-2 border">
                                            {row.pk_buyer}
                                        </td>
                                        <td className="p-2 border">
                                            {row.pk_vendor}
                                        </td>
                                        <td className="p-2 border">
                                            {row.item_description}
                                        </td>
                                        <td className="p-2 border text-center">
                                            <Button
                                                label="Verify commitment"
                                                onClick={() =>
                                                    verifyCommitment(row.id)
                                                }
                                                width="full"
                                            />
                                        </td>
                                        <td className="p-2 border text-center">
                                            <Button
                                                label="Accept"
                                                onClick={() =>
                                                    handleAccept(row.id)
                                                }
                                                width="full"
                                            />
                                        </td>
                                        <td className="p-2 border text-center">
                                            <Button
                                                label="Reject"
                                                onClick={() =>
                                                    handleReject(row.id)
                                                }
                                                width="full"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Modal>
    );
}
