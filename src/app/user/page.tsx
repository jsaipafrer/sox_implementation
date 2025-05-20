"use client";

import Button from "../components/Button";
import { useRouter } from "next/navigation";
import UserContractsListView from "../components/UserContractsListView";
import ContractInformation from "../components/ContractInformation";
import { useState } from "react";
import NewDisputeModal from "../components/NewDisputeModal";
import SearchContractModal from "../components/SearchContractModal";
import NewContractModal from "../components/NewContractModal";
import FormTextField from "../components/FormTextField";
import UserUnsponsoredContractsListView from "../components/PendingPrecontractsListView";

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
    const [selectedContract, setSelectedContract] = useState<Contract>();

    const [modalNewContractShown, showModalNewContract] = useState(false);
    const [modalNewDisputeShown, showModalNewDispute] = useState(false);
    const [modalSearchContractShown, showModalSearchContract] = useState(false);
    const [isLoggedIn, setLoggedIn] = useState(false);
    const [publicKey, setPublicKey] = useState("");

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
                        <UserUnsponsoredContractsListView
                            publicKey={publicKey}
                        />

                        <UserUnsponsoredContractsListView
                            publicKey={publicKey}
                        />
                    </div>

                    <div className="flex gap-8 my-8">
                        <UserContractsListView
                            publicKey={publicKey}
                            setSelectedContract={setSelectedContract}
                        />
                        <UserContractsListView
                            publicKey={publicKey}
                            setSelectedContract={setSelectedContract}
                        />
                    </div>

                    <ContractInformation contract={selectedContract} />
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
