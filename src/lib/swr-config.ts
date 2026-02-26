import { SWRConfiguration } from 'swr';

/**
 * Global SWR Configuration to be used in hooks or SWRConfig provider.
 * Enforces consistent caching and revalidation policies across the application.
 */
export const SWR_CONFIG: SWRConfiguration = {
    // Deduplicate requests with the same key in this time window (60s)
    dedupingInterval: 60000,

    // Refresh data every 60s while the component is mounted
    refreshInterval: 60000,

    // Disable automatic revalidation on window focus to save API calls
    revalidateOnFocus: false,

    // Revalidate when the browser regains network connection
    revalidateOnReconnect: true,

    // Keep showing previous data while fetching new data to prevent layout shift
    keepPreviousData: true,

    // Retry on error
    shouldRetryOnError: true,
    errorRetryCount: 3,
};

/**
 * Realtime SWR Configuration for critical data that needs faster updates
 */
export const SWR_REALTIME_CONFIG: SWRConfiguration = {
    ...SWR_CONFIG,
    dedupingInterval: 5000,
    refreshInterval: 5000,
};

/**
 * Static SWR Configuration for data that rarely changes (e.g. settings, templates)
 */
export const SWR_STATIC_CONFIG: SWRConfiguration = {
    ...SWR_CONFIG,
    dedupingInterval: 10 * 60 * 1000, // 10 minutes
    refreshInterval: 0, // Disable auto-refresh
    revalidateOnFocus: false,
    revalidateOnMount: true, // Fetch once on mount
};
