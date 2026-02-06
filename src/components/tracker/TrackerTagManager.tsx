'use client';

import { useState, useEffect } from 'react';

interface TrackerTagManagerProps {
    entryId: string;
    initialTags?: string[];
    initialTopics?: string[];
    initialLanguages?: string[];
    onUpdate?: (data: { tags: string[]; topics: string[]; languages: string[] }) => void;
    className?: string;
}

export function TrackerTagManager({
    entryId,
    initialTags = [],
    initialTopics = [],
    initialLanguages = [],
    onUpdate,
    className = '',
}: TrackerTagManagerProps) {
    const [tags, setTags] = useState<string[]>(initialTags);
    const [topics, setTopics] = useState<string[]>(initialTopics);
    const [languages, setLanguages] = useState<string[]>(initialLanguages);
    const [tagInput, setTagInput] = useState('');
    const [topicInput, setTopicInput] = useState('');
    const [languageInput, setLanguageInput] = useState('');

    useEffect(() => {
        setTags(initialTags);
        setTopics(initialTopics);
        setLanguages(initialLanguages);
    }, [initialTags, initialTopics, initialLanguages]);

    const addTag = (type: 'tag' | 'topic' | 'language', value: string) => {
        const trimmed = value.trim().toLowerCase();
        if (!trimmed) return;

        if (type === 'tag' && !tags.includes(trimmed)) {
            const newTags = [...tags, trimmed];
            setTags(newTags);
            updateBackend({ tags: newTags, topics, languages });
            setTagInput('');
        } else if (type === 'topic' && !topics.includes(trimmed)) {
            const newTopics = [...topics, trimmed];
            setTopics(newTopics);
            updateBackend({ tags, topics: newTopics, languages });
            setTopicInput('');
        } else if (type === 'language' && !languages.includes(trimmed)) {
            const newLanguages = [...languages, trimmed];
            setLanguages(newLanguages);
            updateBackend({ tags, topics, languages: newLanguages });
            setLanguageInput('');
        }
    };

    const removeTag = (type: 'tag' | 'topic' | 'language', value: string) => {
        if (type === 'tag') {
            const newTags = tags.filter(t => t !== value);
            setTags(newTags);
            updateBackend({ tags: newTags, topics, languages });
        } else if (type === 'topic') {
            const newTopics = topics.filter(t => t !== value);
            setTopics(newTopics);
            updateBackend({ tags, topics: newTopics, languages });
        } else if (type === 'language') {
            const newLanguages = languages.filter(l => l !== value);
            setLanguages(newLanguages);
            updateBackend({ tags, topics, languages: newLanguages });
        }
    };

    const updateBackend = async (data: { tags: string[]; topics: string[]; languages: string[] }) => {
        try {
            await fetch(`/api/tracker/${entryId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (onUpdate) onUpdate(data);
        } catch (error) {
            console.error('Failed to update tags:', error);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent, type: 'tag' | 'topic' | 'language') => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = type === 'tag' ? tagInput : type === 'topic' ? topicInput : languageInput;
            addTag(type, value);
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Tags */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag, idx) => (
                        <TagBadge key={idx} label={tag} onRemove={() => removeTag('tag', tag)} color="blue" />
                    ))}
                </div>
                <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, 'tag')}
                    placeholder="Add tag and press Enter..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
            </div>

            {/* Topics */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topics
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {topics.map((topic, idx) => (
                        <TagBadge key={idx} label={topic} onRemove={() => removeTag('topic', topic)} color="green" />
                    ))}
                </div>
                <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, 'topic')}
                    placeholder="Add topic and press Enter..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
            </div>

            {/* Languages */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Languages
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {languages.map((lang, idx) => (
                        <TagBadge key={idx} label={lang} onRemove={() => removeTag('language', lang)} color="purple" />
                    ))}
                </div>
                <input
                    type="text"
                    value={languageInput}
                    onChange={(e) => setLanguageInput(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, 'language')}
                    placeholder="Add language and press Enter..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
            </div>

            {/* Common Tags Suggestions */}
            <div className="pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-500 mb-2">Quick add:</div>
                <div className="flex flex-wrap gap-2">
                    {COMMON_TAGS.map((tag) => (
                        <button
                            key={tag}
                            onClick={() => addTag('tag', tag)}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                            + {tag}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

interface TagBadgeProps {
    label: string;
    onRemove: () => void;
    color: 'blue' | 'green' | 'purple';
}

function TagBadge({ label, onRemove, color }: TagBadgeProps) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-700',
        green: 'bg-green-100 text-green-700',
        purple: 'bg-purple-100 text-purple-700',
    };

    return (
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${colorClasses[color]}`}>
            {label}
            <button
                onClick={onRemove}
                className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                title="Remove"
            >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </span>
    );
}

const COMMON_TAGS = [
    'data-structures',
    'algorithms',
    'interview',
    'leetcode',
    'frontend',
    'backend',
    'system-design',
    'debugging',
    'learning',
    'project',
];

export default TrackerTagManager;
