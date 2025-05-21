"use client";

import Button from "../components/common/Button";
import { useRouter } from "next/navigation";
import SponsoredContractsListView from "../components/user/SponsoredContractsListView";
import { useState } from "react";
import NewDisputeModal from "../components/user/NewDisputeModal";
import SearchContractModal from "../components/user/SearchContractModal";
import NewContractModal from "../components/user/NewContractModal";
import FormTextField from "../components/common/FormTextField";
import UnsponsoredContractsListView from "../components/user/UnsponsoredContractsListView";
import NonAcceptedPrecontractsListView from "../components/user/NonAcceptedPrecontractsListView";

type Contract = {
    id: number;
    pk_buyer: string;
    pk_vendor: string;
    item_description: string;
    price: number;
    tip_completion: number;
    tip_dispute: number;
    protocol_version: number;
    timeout_delay: number;
    algorithm_suite: string;
    accepted: number;
    sponsor: string;
    optimistic_smart_contract: string | null;
};

export default function Home() {
    const router = useRouter();

    const [modalNewContractShown, showModalNewContract] = useState(false);
    const [modalNewDisputeShown, showModalNewDispute] = useState(false);
    const [modalSearchContractShown, showModalSearchContract] = useState(false);
    const [isLoggedIn, setLoggedIn] = useState(false);
    const [publicKey, setPublicKey] = useState(
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    );

    const logIn = () => {
        // TODO signature and stuff
        setLoggedIn(true);
    };

    return (
        <main className="p-4 min-h-screen">
            <h1 className="text-xl font-bold mb-4">Sponsored fair exchange</h1>

            <div className="flex gap-8 justify-between items-center mb-8">
                <Button
                    label="To sponsor view"
                    onClick={() => router.push("/")}
                />
                <Button
                    label="Reload data"
                    onClick={() =>
                        window.dispatchEvent(new Event("reloadData"))
                    }
                />
            </div>

            {!isLoggedIn && (
                <>
                    <FormTextField
                        id="user-public-key"
                        type="text"
                        value={publicKey}
                        onChange={setPublicKey}
                    >
                        Public key
                    </FormTextField>
                    <br />
                    <Button onClick={logIn} label="Log in" />
                </>
            )}

            {isLoggedIn && (
                <>
                    <div className="flex gap-8 justify-between items-center">
                        <Button
                            label="+ New pre-contract"
                            onClick={() => showModalNewContract(true)}
                        />
                        <Button
                            label="Search pre-contract"
                            onClick={() => showModalSearchContract(true)}
                        />
                        <Button
                            label="+ New dispute"
                            onClick={() => showModalNewDispute(true)}
                        />
                    </div>

                    <div className="flex gap-8 my-8">
                        <NonAcceptedPrecontractsListView
                            publicKey={publicKey}
                        />

                        <UnsponsoredContractsListView publicKey={publicKey} />
                    </div>

                    <div className="flex gap-8 my-8">
                        <SponsoredContractsListView publicKey={publicKey} />
                        <SponsoredContractsListView publicKey={publicKey} />
                    </div>
                </>
            )}

            {modalNewContractShown && (
                <NewContractModal
                    title="New contract"
                    onClose={() => showModalNewContract(false)}
                ></NewContractModal>
            )}

            {modalSearchContractShown && (
                <SearchContractModal
                    title="Search contract"
                    onClose={() => showModalSearchContract(false)}
                ></SearchContractModal>
            )}

            {modalNewDisputeShown && (
                <NewDisputeModal
                    title="New dispute"
                    onClose={() => showModalNewDispute(false)}
                ></NewDisputeModal>
            )}
        </main>
    );
}
