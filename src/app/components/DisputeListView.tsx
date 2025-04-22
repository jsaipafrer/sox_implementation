"use client";

import Button from "./Button";
import { useState } from "react";
import Modal from "./Modal";
import SponsorModal from "./SponsorModal";
import { sha256 } from "../lib/sha256";

export default function ContractsListView() {
    const [modalProofShown, showModalProof] = useState(false);
    const [modalSponsorShown, showModalSponsor] = useState(false);

    const totalColumns = headers.length + 2; // +2 for the two button columns
    const columnWidth = `${100 / totalColumns}%`;

    return (
        <div className="bg-gray-300 p-4 rounded w-1/2 overflow-auto">
            <h2 className="text-lg font-semibold mb-4">{title}</h2>
            <table className="w-full table-fixed border-collapse">
                <thead>
                    <tr className="border-b border-black text-left font-medium">
                        {headers.map((header, index) => (
                            <th
                                key={index}
                                style={{ width: columnWidth }}
                                className="p-2"
                            >
                                {header}
                            </th>
                        ))}
                        <th style={{ width: columnWidth }} className="p-2"></th>
                        <th style={{ width: columnWidth }} className="p-2"></th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr
                            key={rowIndex}
                            className="even:bg-gray-200 border-b border-black h-15"
                        >
                            {row.map((cell, cellIndex) => (
                                <td
                                    key={cellIndex}
                                    style={{ width: columnWidth }}
                                    className="p-2"
                                >
                                    {cell}
                                </td>
                            ))}
                            <td
                                style={{ width: columnWidth }}
                                className="p-2 text-center"
                            >
                                <Button
                                    label="Check proof"
                                    onClick={() => showModalProof(true)}
                                    width="95/100"
                                />
                            </td>
                            <td
                                style={{ width: columnWidth }}
                                className="p-2 text-center"
                            >
                                <Button
                                    label="Sponsor"
                                    onClick={() => showModalSponsor(true)}
                                    width="95/100"
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
