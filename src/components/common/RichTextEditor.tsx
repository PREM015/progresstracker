interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 p-2 flex gap-2">
                <button className="px-2 py-1 hover:bg-gray-200 rounded" title="Bold">
                    <b>B</b>
                </button>
                <button className="px-2 py-1 hover:bg-gray-200 rounded" title="Italic">
                    <i>I</i>
                </button>
                <button className="px-2 py-1 hover:bg-gray-200 rounded" title="Underline">
                    <u>U</u>
                </button>
            </div>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full p-4 min-h-[200px] outline-none resize-none"
            />
        </div>
    );
}
