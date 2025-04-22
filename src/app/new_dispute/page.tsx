"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewDispute() {
    const router = useRouter();
    const [textValue, setTextValue] = useState("");
    const [numberValue, setNumberValue] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.push("/");
    };

    return (
        <div className="p-6 bg-green-200 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Form 1</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label>Text Field: </label>
                    <input
                        type="text"
                        placeholder="<text>"
                        value={textValue}
                        onChange={(e) => setTextValue(e.target.value)}
                        className="border p-2 rounded w-full"
                    />
                </div>
                <div>
                    <label>Number Field: </label>
                    <input
                        type="number"
                        placeholder="<number>"
                        value={numberValue}
                        onChange={(e) => setNumberValue(e.target.value)}
                        className="border p-2 rounded w-full"
                    />
                </div>
                <button
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                    type="submit"
                >
                    Submit
                </button>
            </form>
        </div>
    );
}
