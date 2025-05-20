"use client";

import Button from "../common/Button";
import { useEffect, useState } from "react";
import Modal from "../common/Modal";
import SponsorModal from "./SponsorModal";
import { Gate, evaluateCircuit } from "../../lib/circuits/evaluator";
import { bytesToHex } from "../../lib/helpers";

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
                            onClick={async () => {
                                // TODO
                                const input = new Uint8Array([
                                    76, 111, 114, 101, 109, 32, 105, 112, 115,
                                    117, 109, 32, 100, 111, 108, 111, 114, 32,
                                    115, 105, 116, 32, 97, 109, 101, 116, 44,
                                    32, 99, 111, 110, 115, 101, 99, 116, 101,
                                    116, 117, 114, 32, 97, 100, 105, 112, 105,
                                    115, 99, 105, 110, 103, 32, 101, 108, 105,
                                    116, 44, 32, 115, 101, 100, 32, 100, 111,
                                    32, 101, 105, 117, 115, 109, 111, 100, 32,
                                    116, 101, 109, 112, 111, 114, 32, 105, 110,
                                    99, 105, 100, 105, 100, 117, 110, 116, 32,
                                    117, 116, 32, 108, 97, 98, 111, 114, 101,
                                    32, 101, 116, 32, 100, 111, 108, 111, 114,
                                    101, 32, 109, 97, 103, 110, 97, 32, 97, 108,
                                    105, 113, 117, 97, 46, 32, 85, 116, 32, 101,
                                    110, 105, 109, 32, 97, 100, 32, 109, 105,
                                    110, 105, 109, 32, 118, 101, 110, 105, 97,
                                    109, 44, 32, 113, 117, 105, 115, 32, 110,
                                    111, 115, 116, 114, 117, 100, 32, 101, 120,
                                    101, 114, 99, 105, 116, 97, 116, 105, 111,
                                    110, 32, 117, 108, 108, 97, 109, 99, 111,
                                    32, 108, 97, 98, 111, 114, 105, 115, 32,
                                    110, 105, 115, 105, 32, 117, 116, 32, 97,
                                    108, 105, 113, 117, 105, 112, 32, 101, 120,
                                    32, 101, 97, 32, 99, 111, 109, 109, 111,
                                    100, 111, 32, 99, 111, 110, 115, 101, 113,
                                    117, 97, 116, 46, 32, 68, 117, 105, 115, 32,
                                    97, 117, 116, 101, 32, 105, 114, 117, 114,
                                    101, 32, 100, 111, 108, 111, 114, 32, 105,
                                    110, 32, 114, 101, 112, 114, 101, 104, 101,
                                    110, 100, 101, 114, 105, 116, 32, 105, 110,
                                    32, 118, 111, 108, 117, 112, 116, 97, 116,
                                    101, 32, 118, 101, 108, 105, 116, 32, 101,
                                    115, 115, 101, 32, 99, 105, 108, 108, 117,
                                    109, 32, 100, 111, 108, 111, 114, 101, 32,
                                    101, 117, 32, 102, 117, 103, 105, 97, 116,
                                    32, 110, 117, 108, 108, 97, 32, 112, 97,
                                    114, 105, 97, 116, 117, 114, 46, 32, 69,
                                    120, 99, 101, 112, 116, 101, 117, 114, 32,
                                    115, 105, 110, 116, 32, 111, 99, 99, 97,
                                    101, 99, 97, 116, 32, 99, 117, 112, 105,
                                    100, 97, 116, 97, 116, 32, 110, 111, 110,
                                    32, 112, 114, 111, 105, 100, 101, 110, 116,
                                    44, 32, 115, 117, 110, 116, 32, 105, 110,
                                    32, 99, 117, 108, 112, 97, 32, 113, 117,
                                    105, 32, 111, 102, 102, 105, 99, 105, 97,
                                    32, 100, 101, 115, 101, 114, 117, 110, 116,
                                    32, 109, 111, 108, 108, 105, 116, 32, 97,
                                    110, 105, 109, 32, 105, 100, 32, 101, 115,
                                    116, 32, 108, 97, 98, 111, 114, 117, 109,
                                    46,
                                ]);
                                const circuit = [
                                    [-1, []] as Gate,
                                    [-1, []] as Gate,
                                    [-1, []] as Gate,
                                    [-1, []] as Gate,
                                    [-1, []] as Gate,
                                    [-1, []] as Gate,
                                    [-1, []] as Gate,
                                    [0, [0]] as Gate,
                                    [0, [7, 1]] as Gate,
                                    [0, [8, 2]] as Gate,
                                    [0, [9, 3]] as Gate,
                                    [0, [10, 4]] as Gate,
                                    [0, [11, 5]] as Gate,
                                    [0, [12, 6]] as Gate,
                                ];
                                evaluateCircuit(
                                    input,
                                    64,
                                    circuit,
                                    new Uint8Array(),
                                    0
                                ).then((res) => {
                                    document.getElementById(
                                        "proof_check_result"
                                    )!.textContent = bytesToHex(res);
                                });
                                // Metamask shit, only if time allows
                                // const client = createWalletClient({
                                //     chain: anvil,
                                //     transport: custom(window.ethereum!),
                                // });

                                // const [address] = await client.getAddresses();

                                // const signature = await client.signMessage({
                                //     account: address,
                                //     message: "hello world",
                                // });

                                // document.getElementById(
                                //     "proof_check_result"
                                // )!.textContent = signature;
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
