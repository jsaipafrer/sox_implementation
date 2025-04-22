import { ReactNode, useEffect } from "react";

export type ModalProps = {
    onClose: () => void;
    title: string;
    children: ReactNode;
};

export default function Modal({ onClose, title, children }: ModalProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-gray-500/75 flex items-center justify-center z-50">
            <div className="bg-[#f5f5f5] p-6 rounded shadow-lg w-1/3 max-w-full">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-sm text-blue-800 hover:underline"
                    >
                        Close
                    </button>
                </div>
                <div className="modal-content">{children}</div>
            </div>
        </div>
    );
}
