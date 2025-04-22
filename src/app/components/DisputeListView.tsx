"use client";

import { ListViewProps } from "./ContractsListView";
import Button from "./Button";
import { useState } from "react";
import Modal from "./Modal";
import SponsorModal from "./SponsorModal";
import { sha256 } from "../lib/sha256";

export default function ContractsListView({
    title,
    headers,
    rows,
}: ListViewProps) {
    const [modalProofShown, showModalProof] = useState(false);
    const [modalSponsorShown, showModalSponsor] = useState(false);

    return (
        <div className="bg-gray-300 p-4 rounded w-1/2 overflow-auto">
            <h2 className="text-lg font-semibold mb-4">{title}</h2>
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-black p-2 text-left font-medium">
                        {headers.map((header, index) => (
                            <th key={index}>{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr
                            key={rowIndex}
                            className="even:bg-gray-200 border-b border-black p-2 h-15"
                        >
                            {row.map((cell, cellIndex) => (
                                <td key={cellIndex}>{cell}</td>
                            ))}
                            <td className="w-1/5">
                                <Button
                                    label="Check proof"
                                    onClick={() => showModalProof(true)}
                                />
                            </td>
                            <td className="w-1/5 text-center">
                                <Button
                                    label="Sponsor"
                                    onClick={() => showModalSponsor(true)}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {modalProofShown && (
                <Modal
                    onClose={() => showModalProof(false)}
                    title="Check proof"
                >
                    <div className="flex gap-8 justify-between items-center">
                        <Button
                            label="Check here"
                            onClick={() => {
                                let content =
                                    document.getElementById(
                                        "proof_check_result"
                                    )!.textContent;
                                let [_, hash] = sha256(content!);
                                document.getElementById(
                                    "proof_check_result"
                                )!.textContent = hash;
                            }}
                            width="1/2"
                        />
                        <p
                            className="block w-1/2 text-center"
                            id="proof_check_result"
                        >
                            hello
                        </p>
                    </div>
                    <br />
                    <div className="flex gap-8 justify-between items-center">
                        <Button
                            label="Download proof"
                            onClick={() => alert("downloaded proof")}
                            width="full"
                        />
                    </div>
                </Modal>
            )}

            {modalSponsorShown && (
                <SponsorModal
                    title="Sponsor dispute"
                    onClose={() => showModalSponsor(false)}
                    id_prefix="dispute"
                />
            )}
        </div>
    );
}
