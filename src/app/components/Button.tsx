type ButtonProps = {
    label: string;
    onClick: () => void;
    width?: string;
};

export default function Button({ label, onClick, width }: ButtonProps) {
    const all_classes =
        " bg-blue-200 hover:bg-blue-300 text-black py-2 px-4 rounded-md transition-colors";
    let width_class = width ? `w-${width}` : "w-95/100";
    return (
        <button onClick={onClick} className={width_class + all_classes}>
            {label}
        </button>
    );
}
