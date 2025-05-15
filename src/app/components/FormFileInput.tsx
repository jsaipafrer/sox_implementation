import React, { useRef } from "react";

interface FormFileInputProps {
    id: string;
    children: string;
    type: string;
    onChange?: (newValue: FileList | null) => void;
}

export default function FormFileInput({
    id,
    children: label,
    type,
    onChange = () => {},
}: FormFileInputProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div>
            <label className="block mb-1 font-medium" htmlFor={id}>
                {label}
            </label>
            <input
                ref={fileInputRef}
                name={id}
                id={id}
                type={type}
                onChange={(e) => onChange(e.target.files)}
                className="w-full border border-gray-300 p-2 rounded"
            />
        </div>
    );
}
