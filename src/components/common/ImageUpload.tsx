import { useState } from 'react';

interface ImageUploadProps {
    label: string;
    currentImage?: string;
    onChange: (file: File | null) => void;
    maxSize?: number;
}

export default function ImageUpload({ label, currentImage, onChange, maxSize = 5 }: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(currentImage || null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;

        if (file) {
            if (file.size > maxSize * 1024 * 1024) {
                alert(`Image size must be less than ${maxSize}MB`);
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }

        onChange(file);
    };

    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            {preview && (
                <div className="mb-4">
                    <img src={preview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border border-gray-200" />
                </div>
            )}
            <input
                type="file"
                accept="image/*"
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
            />
        </div>
    );
}
