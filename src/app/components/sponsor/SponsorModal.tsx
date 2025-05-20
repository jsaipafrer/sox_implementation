import { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";

interface SponsorModalProps {
    title: string;
    onClose: () => void;
    onConfirm: (pk: string) => void;
    id_prefix: string;
}

export default function SponsorModal({
    title,
    onClose,
    onConfirm,
    id_prefix,
}: SponsorModalProps) {
    const [pkSponsor, setPkSponsor] = useState("");

    const onClick = () => {
        onConfirm(pkSponsor);
        window.dispatchEvent(new Event("reloadData"));
        onClose();
    };

    return (
        <Modal onClose={onClose} title={title}>
            <div>
                <table className="w-1/1 border-spacing-y-3 border-spacing-x-4 border-separate">
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
                                    onChange={(e) =>
                                        setPkSponsor(e.target.value)
                                    }
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
                        <tr className="text-center gap-8">
                            <td>
                                <Button label="Confirm" onClick={onClick} />
                            </td>
                            <td>
                                <Button label="Cancel" onClick={onClose} />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </Modal>
    );
}
