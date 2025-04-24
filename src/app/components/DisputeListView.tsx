"use client";

import Button from "./Button";
import { useEffect, useState } from "react";
import Modal from "./Modal";
import SponsorModal from "./SponsorModal";
import { sha256 } from "../lib/sha256";

type Dispute = {
    contract_id: number;
    tip_dispute: number;
    proof_path: string;
};

export default function DisputeListView() {
    const [modalProofShown, showModalProof] = useState(false);
    const [modalSponsorShown, showModalSponsor] = useState(false);
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [selectedDispute, setSelectedDispute] = useState(-1);

    const fetchDisputes = () => {
        fetch("/api/disputes")
            .then((res) => res.json())
            .then((data) => setDisputes(data));
    };

    useEffect(() => {
        fetchDisputes();

        // Listen for the reloadData event
        const handleReloadData = () => {
            fetchDisputes();
        };

        window.addEventListener("reloadData", handleReloadData);

        // Clean up the event listener on component unmount
        return () => {
            window.removeEventListener("reloadData", handleReloadData);
        };
    }, []);

    const handleSponsorConfirmation = async (pk: string) => {
        await fetch("/api/disputes/register-sponsor", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contract_id: selectedDispute,
                pk_sponsor: pk,
            }),
        });
        alert(`Sponsored dispute ${selectedDispute}`);
    };

    return (
        <div className="bg-gray-300 p-4 rounded w-1/2 overflow-auto">
            <h2 className="text-lg font-semibold mb-4">Disputes</h2>
            <table className="w-full table-fixed border-collapse">
                <thead>
                    <tr className="border-b border-black text-left font-medium">
                        <th className="p-2 w-1/4">Contract ID</th>
                        <th className="p-2 w-1/4">Tip</th>
                        <th className="p-2 w-1/4"></th>
                        <th className="p-2 w-1/4"></th>
                    </tr>
                </thead>
                <tbody>
                    {disputes.map((d) => (
                        <tr
                            key={d.contract_id}
                            className="even:bg-gray-200 border-b border-black h-15"
                        >
                            <td className="p-2 w-1/4">{d.contract_id}</td>
                            <td className="p-2 w-1/4">{d.tip_dispute}</td>
                            <td className="p-2 text-center w-1/4">
                                <Button
                                    label="Check proof"
                                    onClick={() => showModalProof(true)}
                                    width="95/100"
                                />
                            </td>
                            <td className="p-2 text-center w-1/4">
                                <Button
                                    label="Sponsor"
                                    onClick={() => {
                                        setSelectedDispute(d.contract_id);
                                        showModalSponsor(true);
                                    }}
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
                                // TODO
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
                    onConfirm={handleSponsorConfirmation}
                    id_prefix="dispute"
                />
            )}
        </div>
    );
}
