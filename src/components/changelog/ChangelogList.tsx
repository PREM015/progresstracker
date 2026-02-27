/**
 * ============================================================================
 * CHANGELOG LIST COMPONENT
 * ============================================================================
 * Client-side React component that renders the timeline of application updates.
 * Features a vertical timeline UI, tag chips for update types, and handles
 * parsing complex JSON differences from the backend.
 */
'use client';

import React from 'react';

/**
 * Type Definition for a single Changelog Entry as returned by Prisma DB
 */
export interface ChangelogEntry {
    id: string;
    version: string;        // e.g. v1.1.0
    title: string;          // e.g. "Major Dashboard Redesign"
    description: string;    // Long explanatory descriptive text
    type: string;           // Update category: feature, bugfix, improvement, etc.
    changes: any;           // JSON representation of the bullet points
    publishedAt: string | null;
    isBreaking: boolean;    // Flag for critical reverse-incompatible changes
    isFeatured: boolean;    // Flag to highlight major release logic
}

/**
 * Props passed from the parent page loader
 */
interface ChangelogListProps {
    versions: ChangelogEntry[];
    isLoading: boolean;
}

export const ChangelogList = ({ versions, isLoading }: ChangelogListProps) => {

    // Phase 1: Show a loading screen while resolving the initial fetch
    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Phase 2: Show empty placeholder if no updates exist
    if (!versions || versions.length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500 shadow-sm transition-all hover:shadow-md">
                <h3 className="text-lg font-medium text-gray-900">No updates yet</h3>
                <p className="mt-1">Check back later for new features, bug fixes, and improvements.</p>
            </div>
        );
    }

    // Phase 3: Render iterations over all features in a timeline layout
    return (
        // Creates the vertical timeline line down the middle of the screen
        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">

            {versions.map(entry => {
                // Robust handling for parsing the 'changes' JSON payload.
                // It could be an array of strings natively, or it might be stored as an object.
                let changesList: string[] = [];

                if (Array.isArray(entry.changes)) {
                    // Best case scenario: it's a native array
                    changesList = entry.changes as string[];
                } else if (typeof entry.changes === 'object' && entry.changes !== null) {
                    // Fallback heuristic: Extract all string values out of unpredictable JSON object formats
                    changesList = Object.values(entry.changes).filter(c => typeof c === 'string') as string[];
                }

                return (
                    // Timeline Row Container 
                    <div key={entry.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">

                        {/* Version Bubble - Snaps to the center vertical line on Desktop */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-indigo-100 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 flex-none z-10">
                            <span className="text-xs font-bold leading-none">{entry.version}</span>
                        </div>

                        {/* Changelog Card Container */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition hover:shadow-md hover:border-indigo-100">

                            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-3">

                                {/* Header Information */}
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{entry.title}</h3>
                                    <time className="text-sm text-gray-500 font-medium">
                                        {entry.publishedAt ? new Date(entry.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unpublished'}
                                    </time>
                                </div>

                                {/* Status Tags / Chips */}
                                <div className="flex flex-wrap gap-2 items-end sm:justify-end">
                                    {entry.isFeatured && (
                                        <span className="text-yellow-700 bg-yellow-50 text-xs px-2.5 py-1 rounded-full font-medium border border-yellow-200 shadow-sm">
                                            Featured
                                        </span>
                                    )}
                                    {entry.isBreaking && (
                                        <span className="text-red-700 bg-red-50 text-xs px-2.5 py-1 rounded-full font-medium border border-red-200 shadow-sm">
                                            Breaking Change
                                        </span>
                                    )}
                                    {/* General Type Chip (only visible if not featured or breaking to reduce clutter) */}
                                    {entry.type && !entry.isBreaking && !entry.isFeatured && (
                                        <span className="text-indigo-700 bg-indigo-50 text-xs px-2.5 py-1 rounded-full font-medium border border-indigo-200 capitalize shadow-sm">
                                            {entry.type}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* General description */}
                            <p className="text-gray-700 mt-2 mb-4 leading-relaxed">{entry.description}</p>

                            {/* Bulleted list of specific atomic changes */}
                            {changesList.length > 0 && (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Detailed Changes:</h4>
                                    <ul className="space-y-2">
                                        {changesList.map((change, i) => (
                                            <li key={i} className="flex gap-2 text-gray-600 text-sm">
                                                <span className="text-indigo-400 font-bold mt-0.5">•</span>
                                                <span>{change}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                        </div>
                    </div>
                );
            })}
        </div>
    );
};
