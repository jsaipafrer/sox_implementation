import { ReactNode, useEffect } from "react";
import Modal from "./Modal";
import Button from "./Button";

interface SponsorModalProps {
    title: string;
    onClose: () => void;
    id_prefix: string;
}

export default function SponsorModal({
    onClose,
    title,
    id_prefix,
}: SponsorModalProps) {
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
        <Modal onClose={onClose} title={title}>
            <form action="">
                <table className="w-1/1 border-spacing-y-3 border-separate">
                    <tbody>
                        <tr className="w-1/1">
                            <td className="w-1/2">
                                <label htmlFor={`${id_prefix}-sponsor-pk`}>
                                    Sponsor public key (hex)
                                </label>
                            </td>
                            <td className="w-1/2">
                                <input
                                    type="text"
                                    name={`${id_prefix}-sponsor-pk`}
                                    id={`${id_prefix}-sponsor-pk`}
                                    className="bg-white w-full border rounded"
                                />
                            </td>
                        </tr>
                        <tr className="w-1/1">
                            <td>
                                <label htmlFor={`${id_prefix}-sponsor-sig`}>
                                    Sponsor signature (hex)
                                </label>
                            </td>
                            <td>
                                <input
                                    type="text"
                                    name={`${id_prefix}-sponsor-sig`}
                                    id={`${id_prefix}-sponsor-sig`}
                                    className="bg-white w-full border rounded"
                                />
                            </td>
                        </tr>
                        <tr className="text-center">
                            <td>
                                <Button
                                    label="Confirm"
                                    onClick={() => {
                                        alert("sponsored!");
                                        onClose();
                                    }}
                                />
                            </td>
                            <td>
                                <Button label="Cancel" onClick={onClose} />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </form>
        </Modal>
    );
}
