interface FormDatePickerProps {
    label: string;
    name: string;
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    required?: boolean;
    error?: string;
}

export default function FormDatePicker({ label, name, value, onChange, min, max, required, error }: FormDatePickerProps) {
    return (
        <div className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                type="date"
                id={name}
                name={name}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                min={min}
                max={max}
                required={required}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none ${error ? 'border-red-500' : 'border-gray-200'
                    }`}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
}
