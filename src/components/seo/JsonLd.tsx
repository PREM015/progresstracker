'use client'; // Required for using simple-jsonld or similar if needed, but implementing manually here

import Script from 'next/script';

// SCHEMA TYPES:
interface OrganizationSchema {
    type: 'Organization';
    name: string;
    url: string;
    logo: string;
    sameAs?: string[];
}

interface WebsiteSchema {
    type: 'WebSite';
    name: string;
    url: string;
    searchAction?: {
        target: string;
        queryInput: string;
    };
}

interface ArticleSchema {
    type: 'Article';
    headline: string;
    description: string;
    image: string;
    datePublished: string;
    dateModified?: string;
    author: {
        name: string;
        url?: string;
    };
    publisher: {
        name: string;
        logo: string;
    };
}

interface BreadcrumbSchema {
    type: 'BreadcrumbList';
    items: Array<{
        name: string;
        url: string;
    }>;
}

interface FAQSchema {
    type: 'FAQPage';
    questions: Array<{
        question: string;
        answer: string;
    }>;
}

interface SoftwareApplicationSchema {
    type: 'SoftwareApplication';
    name: string;
    description: string;
    applicationCategory: string;
    operatingSystem: string;
    offers?: {
        price: string;
        priceCurrency: string;
    };
}

type SchemaType =
    | OrganizationSchema
    | WebsiteSchema
    | ArticleSchema
    | BreadcrumbSchema
    | FAQSchema
    | SoftwareApplicationSchema;

// COMPONENT:
interface JsonLdProps {
    schema: SchemaType;
}

export function JsonLd({ schema }: JsonLdProps) {
    const generateSchema = () => {
        switch (schema.type) {
            case 'Organization':
                return {
                    '@context': 'https://schema.org',
                    '@type': 'Organization',
                    name: schema.name,
                    url: schema.url,
                    logo: schema.logo,
                    sameAs: schema.sameAs,
                };

            case 'WebSite':
                return {
                    '@context': 'https://schema.org',
                    '@type': 'WebSite',
                    name: schema.name,
                    url: schema.url,
                    ...(schema.searchAction && {
                        potentialAction: {
                            '@type': 'SearchAction',
                            target: schema.searchAction.target,
                            'query-input': schema.searchAction.queryInput,
                        },
                    }),
                };

            case 'Article':
                return {
                    '@context': 'https://schema.org',
                    '@type': 'Article',
                    headline: schema.headline,
                    description: schema.description,
                    image: schema.image,
                    datePublished: schema.datePublished,
                    dateModified: schema.dateModified || schema.datePublished,
                    author: {
                        '@type': 'Person',
                        name: schema.author.name,
                        url: schema.author.url,
                    },
                    publisher: {
                        '@type': 'Organization',
                        name: schema.publisher.name,
                        logo: {
                            '@type': 'ImageObject',
                            url: schema.publisher.logo,
                        },
                    },
                };

            case 'BreadcrumbList':
                return {
                    '@context': 'https://schema.org',
                    '@type': 'BreadcrumbList',
                    itemListElement: schema.items.map((item, index) => ({
                        '@type': 'ListItem',
                        position: index + 1,
                        name: item.name,
                        item: item.url,
                    })),
                };

            case 'FAQPage':
                return {
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    mainEntity: schema.questions.map((q) => ({
                        '@type': 'Question',
                        name: q.question,
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: q.answer,
                        },
                    })),
                };

            case 'SoftwareApplication':
                return {
                    '@context': 'https://schema.org',
                    '@type': 'SoftwareApplication',
                    name: schema.name,
                    description: schema.description,
                    applicationCategory: schema.applicationCategory,
                    operatingSystem: schema.operatingSystem,
                    ...(schema.offers && {
                        offers: {
                            '@type': 'Offer',
                            price: schema.offers.price,
                            priceCurrency: schema.offers.priceCurrency,
                        },
                    }),
                };

            default:
                return null;
        }
    };

    const jsonLd = generateSchema();
    if (!jsonLd) return null;

    return (
        <Script
            id={`json-ld-${schema.type}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}

// PRESET SCHEMAS:
export const organizationSchema: OrganizationSchema = {
    type: 'Organization',
    name: 'Progress Tracker',
    url: 'https://progresstracker.com',
    logo: 'https://progresstracker.com/logo.png',
    sameAs: [
        'https://twitter.com/progresstracker',
        'https://github.com/progresstracker',
    ],
};

export const websiteSchema: WebsiteSchema = {
    type: 'WebSite',
    name: 'Progress Tracker',
    url: 'https://progresstracker.com',
    searchAction: {
        target: 'https://progresstracker.com/search?q={search_term_string}',
        queryInput: 'required name=search_term_string',
    },
};
