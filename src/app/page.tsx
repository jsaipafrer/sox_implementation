"use client";

import ContractsListView from "./components/ContractsListView";
import DisputeListView from "./components/DisputeListView";
import Button from "./components/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import NewContractModal from "./components/NewContractModal";
import NewDisputeModal from "./components/NewDisputeModal";

export default function Home() {
    const router = useRouter();

    const [modalNewContractShown, showModalNewContract] = useState(false);
    const [modalNewDisputeShown, showModalNewDispute] = useState(false);

    return (
        <main className="p-4 min-h-screen">
            <h1 className="text-xl font-bold mb-4">Sponsored fair exchange</h1>

            <div className="flex gap-8 justify-between items-center">
                <Button
                    label="+ New pre-contract"
                    onClick={() => showModalNewContract(true)}
                />
                <Button
                    label="+ un autre truc"
                    onClick={() => showModalNewContract(true)}
                />
                <Button
                    label="+ New dispute"
                    onClick={() => showModalNewDispute(true)}
                />
            </div>

            <div className="flex gap-8 mt-8">
                <ContractsListView />
                {/* <DisputeListView /> */}
            </div>

            {modalNewContractShown && (
                <NewContractModal
                    title="New contract"
                    onClose={() => showModalNewContract(false)}
                ></NewContractModal>
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
