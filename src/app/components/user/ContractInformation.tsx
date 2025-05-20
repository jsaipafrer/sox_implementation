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

interface ContractInformationProps {
    contract: Contract | undefined;
}

export default function ContractInformation(
    contract: ContractInformationProps
) {
    if (!contract || !contract.contract) {
        return <div>No contract information available.</div>;
    }

    const {
        id,
        pk_buyer,
        pk_vendor,
        item_description,
        price,
        tip_completion,
        tip_dispute,
        protocol_version,
        timeout_delay,
        algorithm_suite,
        accepted,
        sponsor,
        optimistic_smart_contract,
    } = contract.contract!;

    return (
        <div>
            <div>
                <strong>Contract ID:</strong> {id}
            </div>
            <div>
                <strong>Buyer:</strong> {pk_buyer}
            </div>
            <div>
                <strong>Vendor:</strong> {pk_vendor}
            </div>
            <div>
                <strong>Item Description:</strong> {item_description}
            </div>
            <div>
                <strong>Price:</strong> {price}
            </div>
            <div>
                <strong>Tip Completion:</strong> {tip_completion}
            </div>
            <div>
                <strong>Tip Dispute:</strong> {tip_dispute}
            </div>
            <div>
                <strong>Protocol Version:</strong> {protocol_version}
            </div>
            <div>
                <strong>Timeout Delay:</strong> {timeout_delay}
            </div>
            <div>
                <strong>Algorithm Suite:</strong> {algorithm_suite}
            </div>
            <div>
                <strong>Accepted:</strong> {accepted ? "Yes" : "No"}
            </div>
            <div>
                <strong>Sponsor:</strong> {sponsor}
            </div>
            <div>
                <strong>Optimistic Smart Contract:</strong>{" "}
                {optimistic_smart_contract || "N/A"}
            </div>
        </div>
    );
}
