import Head from 'next/head';

// PROPS:
interface MetaTagsProps {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: 'website' | 'article' | 'profile';
    author?: string;
    publishedTime?: string;
    modifiedTime?: string;
    section?: string;
    tags?: string[];
    noindex?: boolean;
    nofollow?: boolean;
}

// DEFAULT VALUES:
const defaults = {
    siteName: 'Progress Tracker',
    defaultTitle: 'Progress Tracker - Track Your Coding Journey',
    defaultDescription: 'Track your progress across LeetCode, GitHub, Codeforces, and more. Set goals, earn achievements, and compete on leaderboards.',
    defaultImage: '/og-image.png',
    twitterHandle: '@progresstracker',
    siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.com',
};

// COMPONENT (for pages router or client-side needs):
export function MetaTags({
    title,
    description = defaults.defaultDescription,
    image = defaults.defaultImage,
    url,
    type = 'website',
    author,
    publishedTime,
    modifiedTime,
    section,
    tags,
    noindex = false,
    nofollow = false,
}: MetaTagsProps) {
    const fullTitle = title ? `${title} | ${defaults.siteName}` : defaults.defaultTitle;
    const fullUrl = url ? `${defaults.siteUrl}${url}` : defaults.siteUrl;
    const fullImage = image.startsWith('http') ? image : `${defaults.siteUrl}${image}`;

    const robotsContent = [
        noindex ? 'noindex' : 'index',
        nofollow ? 'nofollow' : 'follow',
    ].join(', ');

    return (
        <Head>
            {/* Basic */}
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <meta name="robots" content={robotsContent} />
            <link rel="canonical" href={fullUrl} />

            {/* Open Graph */}
            <meta property="og:type" content={type} />
            <meta property="og:site_name" content={defaults.siteName} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={fullImage} />
            <meta property="og:url" content={fullUrl} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content={defaults.twitterHandle} />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={fullImage} />

            {/* Article specific */}
            {type === 'article' && (
                <>
                    {author && <meta property="article:author" content={author} />}
                    {publishedTime && <meta property="article:published_time" content={publishedTime} />}
                    {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
                    {section && <meta property="article:section" content={section} />}
                    {tags?.map((tag) => (
                        <meta key={tag} property="article:tag" content={tag} />
                    ))}
                </>
            )}
        </Head>
    );
}

// HELPER FOR APP ROUTER (generateMetadata):
export function generateMetaTags(props: MetaTagsProps) {
    const title = props.title ? `${props.title} | ${defaults.siteName}` : defaults.defaultTitle;
    const description = props.description || defaults.defaultDescription;
    const image = props.image?.startsWith('http')
        ? props.image
        : `${defaults.siteUrl}${props.image || defaults.defaultImage}`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [{ url: image }],
            type: props.type || 'website',
            siteName: defaults.siteName,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [image],
        },
        robots: {
            index: !props.noindex,
            follow: !props.nofollow,
        },
    };
}
