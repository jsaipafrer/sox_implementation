"use client";

import Button from "./Button";
import { useState } from "react";
import Modal from "./Modal";
import SponsorModal from "./SponsorModal";

export type ListViewProps = {
    title: string;
    headers: string[];
    rows: string[][];
};

export default function ContractsListView({
    title,
    headers,
    rows,
}: ListViewProps) {
    const [modalShown, showModal] = useState(false);

    return (
        <div className="bg-gray-300 p-4 rounded w-1/2 overflow-auto">
            <h2 className="text-lg font-semibold mb-4">{title}</h2>
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-black p-2 text-left font-medium">
                        {headers.map((header, index) => (
                            <th key={index}>{header}</th>
                        ))}
                        <th></th>
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
                            <td className="w-1/5 text-center">
                                <Button
                                    label="Sponsor"
                                    onClick={() => showModal(true)}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {modalShown && (
                <SponsorModal
                    title="Sponsor contract"
                    onClose={() => showModal(false)}
                    id_prefix="contract"
                />
            )}
        </div>
    );
}
