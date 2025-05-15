"use client";

import SponsorContractsListView from "./components/SponsorContractsListView";
import DisputeListView from "./components/DisputeListView";
import Button from "./components/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import NewContractModal from "./components/NewContractModal";
import NewDisputeModal from "./components/NewDisputeModal";
import SearchContractModal from "./components/SearchContractModal";

export default function Home() {
    const router = useRouter();

    const [modalNewContractShown, showModalNewContract] = useState(false);
    const [modalNewDisputeShown, showModalNewDispute] = useState(false);
    const [modalSearchContractShown, showModalSearchContract] = useState(false);

    return (
        <main className="p-4 min-h-screen">
            <h1 className="text-xl font-bold mb-4">Sponsored fair exchange</h1>

            <div className="flex gap-8 justify-between items-center mb-8">
                <Button
                    label="To user view"
                    onClick={() => router.push("/user")}
                />
                <Button
                    label="Reload data"
                    onClick={() =>
                        window.dispatchEvent(new Event("reloadData"))
                    }
                />
            </div>

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
                <SponsorContractsListView />
                <DisputeListView />
            </div>

            {/* <div className="flex gap-8 justify-between items-center">
                <Button
                    label="Compile circuit"
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
            </div> */}

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
