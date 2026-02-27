interface CodeBlockProps {
    code: string;
    language?: string;
}

export default function CodeBlock({ code, language = 'javascript' }: CodeBlockProps) {
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
    };

    return (
        <div className="relative">
            <div className="absolute top-2 right-2">
                <button
                    onClick={handleCopy}
                    className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600"
                >
                    Copy
                </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <code className={`language-${language}`}>{code}</code>
            </pre>
        </div>
    );
}
