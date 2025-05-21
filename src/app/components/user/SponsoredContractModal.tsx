"use client";

import Modal from "../common/Modal";
import Button from "../common/Button";
import { Contract, OPTIMISTIC_STATES } from "./SponsoredContractsListView";
import { useEffect, useState } from "react";
import {
    getBasicInfo,
    getDetails,
    sendPayment,
} from "@/app/lib/blockchain/optimistic";

interface SponsoredContractModalProps {
    onClose: () => void;
    contract?: Contract;
    publicKey: string;
}

function timestampToString(timestamp: bigint) {
    const timeNumber = Number(timestamp);
    const date = new Date(timeNumber * 1000);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    return `${date.toLocaleDateString(language, {
        timeZone,
    })}, ${date.toLocaleTimeString(language, {
        timeZone,
    })}`;
}

export default function SponsoredContractModal({
    onClose,
    contract,
    publicKey,
}: SponsoredContractModalProps) {
    if (!contract) return;

    const {
        id,
        pk_buyer,
        pk_vendor,
        item_description,
        price,
        tip_completion,
        tip_dispute,
        protocol_version,
        timeout_delay,
        algorithm_suite,
        accepted,
        optimistic_smart_contract,
    } = contract;

    const [key, setKey] = useState("Loading...");
    const [state, setState] = useState(-1);
    const [nextTimeout, setNextTimeout] = useState("Loading...");
    const [buyer, setBuyer] = useState(pk_buyer);
    const [vendor, setVendor] = useState(pk_vendor);
    const [sponsor, setSponsor] = useState(contract.sponsor);
    const [bSponsor, setBSponsor] = useState("Loading...");
    const [vSponsor, setVSponsor] = useState("Loading...");
    const [completionTip, setCompletionTip] = useState(contract.tip_completion);
    const [disputeTip, setDisputeTip] = useState(contract.tip_dispute);
    const [sponsorDeposit, setSponsorDeposit] = useState("Loading...");
    const [buyerDeposit, setBuyerDeposit] = useState("Loading...");
    const [bSponsorDeposit, setBSponsorDeposit] = useState("Loading...");
    const [vSponsorDeposit, setVSponsorDeposit] = useState("Loading...");
    const [detailsShown, setShowDetails] = useState(false);

    useEffect(() => {
        getBasicInfo(optimistic_smart_contract).then((data) => {
            if (!data) return;

            setKey(data.key == "0x" ? "No key" : data.key);
            setState(Number(data.state));

            setNextTimeout(timestampToString(data.nextTimeout));
        });
    }, [optimistic_smart_contract]);

    const handleShowdetails = async () => {
        const details = await getDetails(optimistic_smart_contract);
        if (!details) return;

        setKey(details.key == "0x" ? "No key" : details.key);
        setState(Number(details.state));

        setNextTimeout(timestampToString(details.nextTimeout));

        setBuyer(details.buyer);
        setVendor(details.vendor);
        setSponsor(details.sponsor);
        setBSponsor(details.bSponsor);
        setVSponsor(details.vSponsor);
        setCompletionTip(details.completionTip);
        setDisputeTip(details.disputeTip);
        setSponsorDeposit(details.sponsorDeposit);
        setBuyerDeposit(details.buyerDeposit);
        setBSponsorDeposit(details.bSponsorDeposit);
        setVSponsorDeposit(details.vSponsorDeposit);

        setShowDetails(true);
    };

    const displayButtons = () => {
        switch (state) {
            case 0:
                if (publicKey == pk_buyer)
                    return (
                        <Button
                            label={`Pay ${price + tip_completion} wei`}
                            onClick={sendPaymentTransaction}
                        />
                    );
                break;
        }
        return <Button label="Close" onClick={onClose} />;
    };

    const sendPaymentTransaction = async () => {
        const res = await sendPayment(
            publicKey,
            contract.optimistic_smart_contract,
            price + tip_completion
        );
        if (res) {
            console.log(res);
            onClose();
            alert("Payment has been transferred");
            window.dispatchEvent(new Event("reloadData"));
        } else {
            alert("Something wrong happened during the payment");
        }
    };

    return (
        <Modal title={`Contract ${id} details`} onClose={onClose}>
            <div className="space-y-4 grid grid-cols-2 gap-4">
                <div>
                    <strong>Smart contract address: </strong>
                    {optimistic_smart_contract}
                </div>
                <div>
                    <strong>Current state:</strong>{" "}
                    {state == -1 ? "Loading..." : OPTIMISTIC_STATES[state]}
                </div>
                <div>
                    <strong>Buyer:</strong> {buyer}
                </div>
                <div>
                    <strong>Vendor:</strong> {vendor}
                </div>
                <div>
                    <strong>Key:</strong> {key}
                </div>
                <div>
                    <strong>Timeout of current step:</strong> {nextTimeout}
                </div>
                {detailsShown && (
                    <>
                        <div>
                            <strong>Sponsor:</strong> {sponsor}
                        </div>
                        <div>
                            <strong>Buyer dispute sponsor:</strong> {bSponsor}
                        </div>
                        <div>
                            <strong>Vendor dispute sponsor:</strong> {vSponsor}
                        </div>
                        <div>
                            <strong>Completion tip:</strong> {completionTip} wei
                        </div>
                        <div>
                            <strong>Dispute tip:</strong> {disputeTip} wei
                        </div>
                        <div>
                            <strong>Sponsor deposit:</strong> {sponsorDeposit}{" "}
                            wei
                        </div>
                        <div>
                            <strong>Buyer deposit:</strong> {buyerDeposit} wei
                        </div>
                        <div>
                            <strong>Buyer dispute sponsor deposit:</strong>{" "}
                            {bSponsorDeposit} wei
                        </div>
                        <div>
                            <strong>Vendor dispute sponsor deposit:</strong>{" "}
                            {vSponsorDeposit} wei
                        </div>
                    </>
                )}

                {!detailsShown && (
                    <div className="col-span-2">
                        <Button
                            label="Show details"
                            onClick={handleShowdetails}
                        />
                    </div>
                )}

                <div className="col-span-2 flex gap-8">{displayButtons()}</div>
            </div>
        </Modal>
    );
}
