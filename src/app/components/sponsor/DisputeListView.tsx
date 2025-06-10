"use client";

import Button from "../common/Button";
import { useEffect, useState } from "react";
import Modal from "../common/Modal";
import SponsorModal from "./SponsorModal";
import init, { check_argument, hex_to_bytes } from "@/app/lib/crypto_lib";
import {
    getBasicInfo,
    sendSbFee,
    sendSvFee,
} from "@/app/lib/blockchain/optimistic";
import { downloadFile } from "@/app/lib/helpers";

type Dispute = {
    contract_id: number;
    optimistic_smart_contract: string;
    tip_dispute: number;
    pk_buyer_sponsor?: string;
    pk_vendor_sponsor?: string;
};

export default function DisputeListView() {
    const [modalProofShown, showModalProof] = useState(false);
    const [modalSponsorShown, showModalSponsor] = useState(false);
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [selectedDispute, setSelectedDispute] = useState<Dispute>();

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
        if (!selectedDispute) console.log("something went wrong");

        await fetch("/api/disputes/register-sponsor", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contract_id: selectedDispute!.contract_id,
                pk_sponsor: pk,
            }),
        });

        const isVendor = !!selectedDispute!.pk_buyer_sponsor;
        const sendFee = isVendor ? sendSvFee : sendSbFee;
        const disputeContract = await sendFee(
            pk,
            selectedDispute!.optimistic_smart_contract
        );

        if (isVendor) {
            await fetch("/api/disputes/set-contract", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contract_id: selectedDispute!.contract_id,
                    dispute_smart_contract: disputeContract,
                }),
            });
        }

        alert(
            `Sponsored dispute ${selectedDispute!.contract_id}!${
                isVendor ? ` Deployed smart contract ${disputeContract}` : ""
            }`
        );
    };

    const handleClickCheckArgument = async () => {
        await init();

        if (!selectedDispute) {
            alert("something wrong happened!");
            showModalProof(false);
        }

        const isVendor = !!selectedDispute!.pk_buyer_sponsor;
        let endpoint = "/api/arguments/buyer";
        if (isVendor) {
            endpoint = "/api/arguments/vendor";
        }

        const { argument: argument_hex, description } = await (
            await fetch(`${endpoint}/${selectedDispute!.contract_id}`)
        ).json();

        const { key, commitment } = (await getBasicInfo(
            selectedDispute!.optimistic_smart_contract
        ))!;

        console.log(argument_hex);
        const argument = hex_to_bytes(argument_hex);
        console.log(argument);
        const result = check_argument(argument, commitment, description, key);

        // yandere dev core
        if (result.error) {
            alert(`An error occurred: ${result.error}`);
        } else if (!result.is_valid) {
            alert(
                `!!! Argument in NOT valid !!!\nThe ${
                    isVendor ? "vendor" : "buyer"
                } may have lied`
            );
        } else if (result.supports_buyer) {
            alert(
                isVendor
                    ? "!!!Vendor posted an argument that DOES NOT SUPPORT them!!!"
                    : "Buyer posted an argument that supports them"
            );
        } else {
            alert(
                isVendor
                    ? "Vendor posted an argument that supports them"
                    : "!!!Buyer posted an argument that DOES NOT SUPPORT them!!!"
            );
        }
        showModalProof(false);
    };

    const handleClickDownloadArgument = async () => {
        await init();

        if (!selectedDispute) {
            alert("something wrong happened!");
            showModalProof(false);
        }

        const isVendor = !!selectedDispute!.pk_buyer_sponsor;
        let endpoint = "/api/arguments/buyer";
        if (isVendor) {
            endpoint = "/api/arguments/vendor";
        }

        const { argument: argument_hex } = await (
            await fetch(`${endpoint}/${selectedDispute!.contract_id}`)
        ).json();
        downloadFile(
            hex_to_bytes(argument_hex),
            `${selectedDispute!.contract_id}_argument_${
                isVendor ? "vendor" : "buyer"
            }.bin`
        );
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
                                    label="Check argument"
                                    onClick={() => {
                                        setSelectedDispute(d);
                                        showModalProof(true);
                                    }}
                                    width="95/100"
                                />
                            </td>
                            <td className="p-2 text-center w-1/4">
                                <Button
                                    label="Sponsor"
                                    onClick={() => {
                                        setSelectedDispute(d);
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
                    title="Check argument"
                >
                    <div className="flex gap-8 justify-between items-center">
                        <Button
                            label="Check here"
                            onClick={handleClickCheckArgument}
                        />
                    </div>
                    <br />
                    <div className="flex gap-8 justify-between items-center">
                        <Button
                            label="Download argument"
                            onClick={handleClickDownloadArgument}
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
