interface FormFileUploadProps {
    label: string;
    name: string;
    accept?: string;
    onChange: (file: File | null) => void;
    required?: boolean;
    error?: string;
}

export default function FormFileUpload({ label, name, accept, onChange, required, error }: FormFileUploadProps) {
    return (
        <div className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                type="file"
                id={name}
                name={name}
                accept={accept}
                onChange={(e) => onChange(e.target.files?.[0] || null)}
                required={required}
                className={`w-full px-4 py-2 border rounded-lg ${error ? 'border-red-500' : 'border-gray-200'}`}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
}
