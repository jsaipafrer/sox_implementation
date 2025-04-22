"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "../components/Button";

export default function NewContract() {
    const router = useRouter();

    const [buyerKey, setBuyerKey] = useState("");
    const [vendorKey, setVendorKey] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [version, setVersion] = useState("0.1"); // <- New state

    const handleSubmit = () => {
        alert("submitted");
        router.push("/");
    };

    return (
        <div className="max-w-xl mx-auto p-6 bg-white rounded shadow">
            <h1 className="text-2xl font-bold mb-6">New contract</h1>

            <div className="mb-4">
                <label className="block mb-1 font-medium">
                    Buyer's public key
                </label>
                <input
                    type="text"
                    value={buyerKey}
                    onChange={(e) => setBuyerKey(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded"
                />
            </div>

            <div className="mb-4">
                <label className="block mb-1 font-medium">
                    Vendor's public key
                </label>
                <input
                    type="text"
                    value={vendorKey}
                    onChange={(e) => setVendorKey(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded"
                />
            </div>

            <div className="mb-4">
                <label className="block mb-1 font-medium">
                    Item description
                </label>
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded"
                />
            </div>

            <div className="mb-4">
                <label className="block mb-1 font-medium">Price</label>
                <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full border border-gray-300 p-2 rounded"
                />
            </div>

            <div className="mb-6">
                <label className="block mb-1 font-medium">
                    Circuit version
                </label>
                <select
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    disabled
                    className="w-full border border-gray-300 p-2 rounded bg-gray-100 text-gray-500"
                >
                    <option value="0.1">0.1</option>
                </select>
            </div>

            <Button label="Submit" onClick={handleSubmit} width="full" />
        </div>
    );
}
