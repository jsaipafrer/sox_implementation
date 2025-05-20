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

            <div className="flex gap-8 my-8">
                <SponsorContractsListView />
                <DisputeListView />
            </div>
        </main>
    );
}
