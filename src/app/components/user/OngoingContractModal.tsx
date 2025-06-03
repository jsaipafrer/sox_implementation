"use client";

import Modal from "../common/Modal";
import Button from "../common/Button";
import {
    Contract,
    DISPUTE_STATES,
    OPTIMISTIC_STATES,
} from "./OngoingContractsListView";
import { useEffect, useState } from "react";
import {
    getBasicInfo,
    getDetails,
    sendKey,
    sendPayment,
    sendSbFee,
    sendSvFee,
    startDispute,
    submitSb,
    submitSv,
} from "@/app/lib/blockchain/optimistic";
import {
    finishDispute,
    getChallenge,
    getLatestChallengeResponse,
    giveOpinion,
    respondChallenge,
    submitCommitment,
    submitCommitmentLeft,
    submitCommitmentRight,
} from "@/app/lib/blockchain/dispute";
import { downloadFile, fileToBytes, openFile } from "@/app/lib/helpers";
import init, {
    bytes_to_hex,
    check_argument,
    check_received_ct_key,
    compile_basic_circuit,
    compute_proof_right,
    compute_proofs,
    compute_proofs_left,
    evaluate_circuit,
    hex_to_bytes,
    hpre,
    make_argument,
} from "@/app/lib/circuits/wasm/circuits";

interface OngoingContractModalProps {
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

export default function OngoingContractModal({
    onClose,
    contract,
    publicKey,
}: OngoingContractModalProps) {
    if (!contract) return;

    const {
        id,
        pk_buyer,
        pk_vendor,
        price,
        item_description,
        tip_completion,
        tip_dispute,
        opening_value,
        optimistic_smart_contract,
        dispute_smart_contract,
        pk_sb,
        pk_sv,
        num_blocks,
        num_gates,
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
    const [keyInput, setKeyInput] = useState("");
    const [sbInput, setSbInput] = useState("");
    const [svInput, setSvInput] = useState("");
    const [commitment, setCommitment] = useState("");
    const [challengeFile, setChallengeFile] = useState<FileList | null>();

    useEffect(() => {
        getBasicInfo(optimistic_smart_contract, !!dispute_smart_contract).then(
            (data) => {
                if (!data) return;

                setKey(data.key == "0x" ? "No key" : data.key);
                setState(Number(data.state));

                setNextTimeout(timestampToString(data.nextTimeout));
                setCommitment(data.commitment);
            }
        );
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

    /*
        enum OptimisticState {
            WaitPayment,
            WaitKey,
            WaitSB,
            WaitSBFee,
            WaitSV,
            WaitSVFee,
            WaitDisputeStart,
            InDispute,
            End
        }
    */

    const displayButtons = () => {
        if (dispute_smart_contract) return displayDisputeButtons();
        return displayOptimisticButtons();
    };

    const displayOptimisticButtons = () => {
        switch (state) {
            case 0:
                if (publicKey == pk_buyer)
                    return (
                        <Button
                            label={`Pay ${price + tip_completion} wei`}
                            onClick={clickSendPayment}
                        />
                    );
                break;

            case 1:
                if (publicKey == pk_vendor)
                    return (
                        <div className="flex gap-8 justify-between w-full items-center">
                            <input
                                value={keyInput}
                                onChange={(e) => setKeyInput(e.target.value)}
                                className="w-2/3 border border-gray-300 p-2 rounded"
                                placeholder="Key (hex)"
                            ></input>
                            <Button
                                label="Send key"
                                onClick={clickSendKey}
                                width="1/3"
                            />
                        </div>
                    );
                break;

            case 2:
                if (publicKey == pk_buyer)
                    return (
                        <>
                            <div className="flex gap-8 justify-between w-full items-center mb-8">
                                <Button
                                    label="Decrypt file"
                                    onClick={clickDecryptFile}
                                />
                            </div>
                            <div className="flex gap-8 justify-between w-full items-center">
                                <input
                                    value={sbInput}
                                    onChange={(e) => setSbInput(e.target.value)}
                                    className="w-2/3 border border-gray-300 p-2 rounded"
                                    placeholder="Sponsor public key"
                                ></input>
                                <Button
                                    label={`Register dispute sponsor and pay ${tip_dispute} wei`}
                                    onClick={clickSubmitSb}
                                    width="1/3"
                                />
                            </div>
                        </>
                    );
                break;

            case 3:
                if (publicKey == pk_sb)
                    return (
                        <>
                            <Button
                                label="Verify buyer's argument"
                                onClick={clickVerifyBuyerArgument}
                            />
                            <br />
                            <br />
                            <Button
                                label={`Pay ${1000} wei`}
                                onClick={clickSendSbFee}
                            />
                        </>
                    );
                break;

            case 4:
                if (publicKey == pk_vendor)
                    return (
                        <div className="flex gap-8 justify-between w-full items-center">
                            <input
                                value={svInput}
                                onChange={(e) => setSvInput(e.target.value)}
                                className="w-2/3 border border-gray-300 p-2 rounded"
                                placeholder="Sponsor public key"
                            ></input>
                            <Button
                                label={`Register dispute sponsor and pay ${tip_dispute} wei`}
                                onClick={clickSubmitSv}
                                width="1/3"
                            />
                        </div>
                    );
                break;

            case 5:
                if (publicKey == pk_sv)
                    return (
                        <>
                            <Button
                                label="Verify vendor's argument"
                                onClick={clickVerifyVendorArgument}
                            />
                            <br />
                            <br />
                            <Button
                                label={`Pay ${1000} wei`}
                                onClick={clickSendSvFee}
                            />
                        </>
                    );
                break;

            case 6:
                if (publicKey == pk_sb || publicKey == pk_sv)
                    return (
                        <Button
                            label={"Start dispute"}
                            onClick={clickStartDispute}
                        />
                    );
                break;
        }
        return <Button label="Close" onClick={onClose} />;
    };

    const clickSendPayment = async () => {
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

    const clickSendKey = async () => {
        await sendKey(publicKey, contract.optimistic_smart_contract, keyInput);
        onClose();
        alert("key sent!");
    };

    const clickDecryptFile = async () => {
        await init();
        let file: File | null = null;
        if (confirm("Do you want to select a local file ?")) {
            file = await openFile();
        }

        let ct: Uint8Array | null = null;
        if (file) {
            ct = await fileToBytes(file);
        } else {
            ct = hex_to_bytes(
                (
                    await (
                        await fetch(`/api/files/${id}`, {
                            method: "GET",
                            headers: {
                                "Content-Type": "application/json",
                            },
                        })
                    ).json()
                ).file
            );
        }

        const { success, decrypted_file } = check_received_ct_key(
            ct,
            hex_to_bytes(key),
            item_description
        );

        if (success) {
            if (
                confirm(
                    "The received file seems correct, download the decrypted file ?"
                )
            ) {
                downloadFile(decrypted_file, "decrypted_file");
            }
        } else {
            if (
                confirm(
                    "The received file does NOT seem correct, download anyway ?"
                )
            ) {
                downloadFile(decrypted_file, "decrypted_file");
            }
        }
    };

    const clickSubmitSb = async () => {
        const ct = hex_to_bytes(
            (
                await (
                    await fetch(`/api/files/${id}`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    })
                ).json()
            ).file
        );
        const h_circuit = localStorage.getItem(`h_circuit_${id}`)!;
        const h_ct = localStorage.getItem(`h_ct_${id}`)!;

        const argument = make_argument(ct, item_description, opening_value);

        await submitSb(
            publicKey,
            contract.optimistic_smart_contract,
            sbInput,
            tip_dispute
        );
        await fetch("/api/disputes/register-sponsor", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contract_id: contract.id,
                pk_buyer_sponsor: sbInput,
                argument: bytes_to_hex(argument),
            }),
        });
        onClose();
        alert("Sponsor registered!");
    };

    const clickVerifyBuyerArgument = async () => {
        await init();

        const response = await fetch(`/api/arguments/buyer/${id}`);
        const { argument } = await response.json();
        const success = check_argument(hex_to_bytes(argument), commitment);

        if (success) {
            alert("Argument is valid");
        } else {
            alert("Argument is NOT valid!");
        }
    };

    const clickSendSbFee = async () => {
        await sendSbFee(publicKey, contract.optimistic_smart_contract, 1000); // TODO set amount
        onClose();
        alert("Fee sent!");
    };

    const clickSubmitSv = async () => {
        await init();

        const ct = hex_to_bytes(
            (
                await (
                    await fetch(`/api/files/${id}`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    })
                ).json()
            ).file
        );
        const h_circuit = localStorage.getItem(`h_circuit_${id}`)!;
        const h_ct = localStorage.getItem(`h_ct_${id}`)!;

        const argument = make_argument(ct, item_description, opening_value);

        await submitSv(
            publicKey,
            contract.optimistic_smart_contract,
            svInput,
            tip_dispute
        );
        await fetch("/api/disputes/register-sponsor", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contract_id: contract.id,
                pk_vendor_sponsor: svInput,
                argument: bytes_to_hex(argument),
            }),
        });
        onClose();
        alert("Sponsor registered!");
    };

    const clickVerifyVendorArgument = async () => {
        await init();

        const response = await fetch(`/api/arguments/vendor/${id}`);
        const { argument } = await response.json();
        const success = check_argument(hex_to_bytes(argument), commitment);

        if (success) {
            alert("Argument is valid");
        } else {
            alert("Argument is NOT valid!");
        }
    };

    const clickSendSvFee = async () => {
        await sendSvFee(publicKey, contract.optimistic_smart_contract, 1000); // TODO set amount
        onClose();
        alert("Fee sent!");
    };

    const clickStartDispute = async () => {
        const disputeContract = await startDispute(
            publicKey,
            contract.optimistic_smart_contract
        ); // TODO manage numGates and numBlocks
        await fetch("/api/disputes/set-contract", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contract_id: contract.id,
                dispute_smart_contract: disputeContract,
            }),
        });
        onClose();
        alert("Dispute started!");
    };

    /*
        enum DisputeState {
            ChallengeBuyer,
            WaitVendorOpinion,
            WaitVendorData,
            WaitVendorDataLeft,
            WaitVendorDataRight,
            Complete,
            Cancel,
            End
        }
    */
    const displayDisputeButtons = () => {
        switch (state) {
            case 0:
                if (publicKey == pk_buyer)
                    return (
                        <>
                            <Button
                                label="Respond to challenge"
                                onClick={clickRespondChallenge}
                            />
                        </>
                    );
                break;
            case 1:
                if (publicKey == pk_vendor)
                    return (
                        <>
                            <Button
                                label="Give opinion"
                                onClick={clickGiveOpinion}
                            />
                        </>
                    );

                break;
            case 2:
            case 3:
            case 4:
                if (publicKey == pk_vendor)
                    return (
                        <Button label="Send proofs" onClick={clickSendProofs} />
                    );

                break;
            case 5:
            case 6:
                return (
                    <Button
                        label="Finish dispute"
                        onClick={clickFinishDispute}
                    />
                );
        }

        return <Button label="Close" onClick={onClose} />;
    };

    const clickRespondChallenge = async () => {
        await init();

        const challenge = await getChallenge(dispute_smart_contract!);
        const evaluated_circuit = await getEvaluatedCircuit();

        const response = hpre(evaluated_circuit, num_blocks, Number(challenge));

        await respondChallenge(
            publicKey,
            dispute_smart_contract!,
            bytes_to_hex(response)
        );
        onClose();
        alert("Response sent");
    };

    const clickGiveOpinion = async () => {
        await init();

        const challenge = await getChallenge(dispute_smart_contract!);
        const evaluated_circuit = await getEvaluatedCircuit();

        const computedResponse = hpre(
            evaluated_circuit,
            num_blocks,
            Number(challenge)
        );
        const latestResponse = await getLatestChallengeResponse(
            dispute_smart_contract!
        );
        const opinion = computedResponse == latestResponse;
        console.log(opinion);

        await giveOpinion(publicKey, dispute_smart_contract!, opinion);
        onClose();
        alert("Opinion sent");
    };

    const clickSendProofs = async () => {
        const { ct, circuit, evaluated_circuit } = await getLargeData();
        const challenge = await getChallenge(dispute_smart_contract!);

        if (state == 2) {
            const {
                gate,
                values,
                curr_acc,
                proof1,
                proof2,
                proof3,
                proof_ext,
            } = compute_proofs(circuit, evaluated_circuit, ct, challenge);

            const h_circuit = localStorage.getItem(`h_circuit_${id}`);
            const h_ct = localStorage.getItem(`h_ct_${id}`);
            await submitCommitment(
                hex_to_bytes(h_circuit!),
                hex_to_bytes(h_ct!),
                challenge,
                gate,
                values,
                0,
                curr_acc,
                proof1,
                proof2,
                proof3,
                proof_ext,
                publicKey,
                dispute_smart_contract!
            );
        } else if (state == 3) {
            const { gate, values, curr_acc, proof1, proof2, proof_ext } =
                compute_proofs_left(circuit, evaluated_circuit, ct, challenge);

            const h_circuit = localStorage.getItem(`h_circuit_${id}`);
            const h_ct = localStorage.getItem(`h_ct_${id}`);
            await submitCommitmentLeft(
                hex_to_bytes(h_circuit!),
                hex_to_bytes(h_ct!),
                challenge,
                gate,
                values,
                0,
                curr_acc,
                proof1,
                proof2,
                proof_ext,
                publicKey,
                dispute_smart_contract!
            );
        } else if (state == 4) {
            const proof = compute_proof_right(
                evaluated_circuit,
                num_blocks,
                num_gates
            );

            await submitCommitmentRight(
                proof,
                publicKey,
                dispute_smart_contract!
            );
        }
    };

    const clickFinishDispute = async () => {
        await finishDispute(state, publicKey, dispute_smart_contract!);
    };

    const showCurrentState = () => {
        if (contract.dispute_smart_contract) {
            return DISPUTE_STATES[Number(state)];
        } else {
            return state != -1
                ? OPTIMISTIC_STATES[Number(state)]
                : "Loading...";
        }
    };

    const getEvaluatedCircuit = async () => {
        let ct_file;
        let circuit_file;
        let evaluated_circuit_file;

        if (confirm("Do you have an evaluated circuit ?")) {
            evaluated_circuit_file = await openFile();
        }

        if (
            !evaluated_circuit_file &&
            confirm("Do you want to select the encrypted file ?")
        ) {
            ct_file = await openFile();
        }

        if (
            !evaluated_circuit_file &&
            confirm("Do you want to select a circuit ?")
        ) {
            circuit_file = await openFile();
        }

        let evaluated_circuit;

        if (evaluated_circuit_file) {
            evaluated_circuit = await fileToBytes(evaluated_circuit_file);
        } else {
            let circuit;
            let ct;
            if (ct_file) {
                ct = await fileToBytes(ct_file);
            } else {
                ct = hex_to_bytes(
                    (
                        await (
                            await fetch(`/api/files/${id}`, {
                                method: "GET",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                            })
                        ).json()
                    ).file
                );
            }

            if (circuit_file) {
                circuit = await fileToBytes(circuit_file);
            } else {
                circuit = compile_basic_circuit(
                    ct!.length,
                    hex_to_bytes(item_description)
                ).to_bytes();
            }

            evaluated_circuit = evaluate_circuit(
                circuit,
                ct,
                [key],
                item_description
            ).to_bytes();
            if (confirm("Save evaluated circuit ?"))
                await downloadFile(evaluated_circuit, "evaluated_circuit.bin");
        }

        return evaluated_circuit;
    };

    const getLargeData = async () => {
        let ct_file;
        let ct;

        let circuit_file;
        let circuit;

        let evaluated_circuit_file;
        let evaluated_circuit;

        if (confirm("Do you have an evaluated circuit ?")) {
            evaluated_circuit_file = await openFile();
        }

        if (confirm("Do you want to select the encrypted file ?")) {
            ct_file = await openFile();
        }

        if (confirm("Do you want to select a circuit ?")) {
            circuit_file = await openFile();
        }

        if (ct_file) {
            ct = await fileToBytes(ct_file);
        } else {
            ct = hex_to_bytes(
                (
                    await (
                        await fetch(`/api/files/${id}`, {
                            method: "GET",
                            headers: {
                                "Content-Type": "application/json",
                            },
                        })
                    ).json()
                ).file
            );
        }

        if (circuit_file) {
            circuit = await fileToBytes(circuit_file);
        } else {
            circuit = compile_basic_circuit(
                ct!.length,
                hex_to_bytes(item_description)
            ).to_bytes();
        }

        if (evaluated_circuit_file) {
            evaluated_circuit = await fileToBytes(evaluated_circuit_file);
        } else {
            evaluated_circuit = evaluate_circuit(
                circuit,
                ct,
                [key],
                item_description
            ).to_bytes();
        }

        return { ct, circuit, evaluated_circuit };
    };

    return (
        <Modal title={`Contract ${id} details`} onClose={onClose}>
            <div className="space-y-4 grid grid-cols-2 gap-4">
                <div>
                    <strong>Smart contract address: </strong>
                    {optimistic_smart_contract}
                </div>
                <div>
                    <strong>Current state:</strong> {showCurrentState()}
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
                            <strong>Item description: </strong>{" "}
                            {item_description}
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
                        {!!dispute_smart_contract && (
                            <>
                                <div>
                                    <strong>Dispute smart contract: </strong>{" "}
                                    {dispute_smart_contract}
                                </div>
                                <div>
                                    <strong>Buyer dispute sponsor: </strong>{" "}
                                    {pk_sb}
                                </div>
                                <div>
                                    <strong>Vendor dispute sponsor: </strong>{" "}
                                    {pk_sb}
                                </div>
                            </>
                        )}
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

                <div className="col-span-2 gap-8">{displayButtons()}</div>
            </div>
        </Modal>
    );
}
