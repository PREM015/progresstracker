interface FormTextareaProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    rows?: number;
    required?: boolean;
    error?: string;
}

export default function FormTextarea({ label, name, value, onChange, placeholder, rows = 4, required, error }: FormTextareaProps) {
    return (
        <div className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <textarea
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={rows}
                required={required}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none ${error ? 'border-red-500' : 'border-gray-200'
                    }`}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
}
