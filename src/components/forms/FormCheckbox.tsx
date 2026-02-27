interface FormCheckboxProps {
    label: string;
    name: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export default function FormCheckbox({ label, name, checked, onChange }: FormCheckboxProps) {
    return (
        <div className="flex items-center mb-4">
            <input
                type="checkbox"
                id={name}
                name={name}
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor={name} className="ml-2 text-sm text-gray-700">
                {label}
            </label>
        </div>
    );
}
