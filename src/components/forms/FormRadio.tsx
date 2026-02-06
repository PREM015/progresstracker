interface FormRadioProps {
    label: string;
    name: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
}

export default function FormRadio({ label, name, options, value, onChange }: FormRadioProps) {
    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <div className="space-y-2">
                {options.map(option => (
                    <div key={option.value} className="flex items-center">
                        <input
                            type="radio"
                            id={`${name}-${option.value}`}
                            name={name}
                            value={option.value}
                            checked={value === option.value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                        />
                        <label htmlFor={`${name}-${option.value}`} className="ml-2 text-sm text-gray-700">
                            {option.label}
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
}
