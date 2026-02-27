import { APIResponse, APIError } from '@/types/api';
import * as Sentry from '@sentry/nextjs';

// Configuration
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const BASE_URL = '/api';
const IS_DEV = process.env.NODE_ENV === 'development';

// Error class for HTTP errors
export class HttpError extends Error {
    public status: number;
    public code: string;
    public data?: any;

    constructor(message: string, status: number, code: string = 'UNKNOWN_ERROR', data?: any) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.code = code;
        this.data = data;
    }
}

// Request options interface
interface RequestOptions extends RequestInit {
    timeout?: number;
    params?: Record<string, string | number | boolean | undefined>;
    requiresAuth?: boolean; // Defaults to true
}

class HttpClient {
    private baseUrl: string;
    private defaultHeaders: Record<string, string>;

    constructor() {
        this.baseUrl = BASE_URL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
    }

    // Helper to build Query String
    private buildQueryString(params?: Record<string, string | number | boolean | undefined>): string {
        if (!params) return '';
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                query.append(key, String(value));
            }
        });
        const queryString = query.toString();
        return queryString ? `?${queryString}` : '';
    }

    // Core request method
    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { timeout = DEFAULT_TIMEOUT, params, headers, ...fetchOptions } = options;
        const startTime = performance.now();

        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        // Handle double /api prefix if endpoint already starts with /api
        let url: string;
        if (endpoint.startsWith('/api') && this.baseUrl.endsWith('/api')) {
            url = `${this.baseUrl.replace(/\/api$/, '')}${endpoint}${this.buildQueryString(params)}`;
        } else {
            url = `${this.baseUrl}${endpoint}${this.buildQueryString(params)}`;
        }

        try {
            const response = await fetch(url, {
                ...fetchOptions,
                headers: {
                    ...this.defaultHeaders,
                    ...headers,
                },
                signal: options.signal || controller.signal,
            });

            clearTimeout(id);
            const endTime = performance.now();
            const duration = endTime - startTime;

            if (IS_DEV && duration > 500) {
                console.warn(`[HttpClient] Slow request to ${endpoint}: ${duration.toFixed(2)}ms`);
            } else if (IS_DEV) {
                console.debug(`[HttpClient] ${fetchOptions.method || 'GET'} ${endpoint}: ${duration.toFixed(2)}ms`);
            }

            // Handle non-JSON responses (if any)
            const contentType = response.headers.get('content-type');
            const isJson = contentType && contentType.includes('application/json');

            let data: any;
            if (isJson) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            // Check for HTTP error status
            if (!response.ok) {
                let errorMessage = response.statusText || 'Unknown error occurred';

                // Try to extract a meaningful message from the data
                if (data) {
                    if (typeof data === 'string') {
                        errorMessage = data;
                    } else if (typeof data === 'object') {
                        errorMessage = data.error || data.message || JSON.stringify(data);
                    }
                }

                const errorCode = data?.code || 'HTTP_ERROR';

                const error = new HttpError(errorMessage, response.status, errorCode, data);

                // Track non-404 errors in Sentry
                if (response.status !== 404) {
                    console.error(`[HttpClient] Error ${response.status} on ${endpoint}:`, errorMessage);
                    Sentry.captureException(error, {
                        extra: { endpoint, status: response.status, code: errorCode, params },
                        tags: { service: 'HttpClient', category: 'API_ERROR' }
                    });
                }

                throw error;
            }

            const apiResponse = data as APIResponse<T>;
            if (apiResponse && typeof apiResponse.success === 'boolean') {
                if (!apiResponse.success) {
                    const error = new HttpError(
                        apiResponse.error || apiResponse.message || 'Operation failed',
                        response.status,
                        apiResponse.code || 'API_ERROR',
                        apiResponse
                    );

                    Sentry.captureException(error, {
                        extra: { endpoint, apiResponse },
                        tags: { service: 'HttpClient', category: 'API_FAILURE' }
                    });

                    throw error;
                }
                return apiResponse.data as T;
            }

            return data as T;

        } catch (error: any) {
            clearTimeout(id);

            if (error instanceof HttpError) {
                throw error;
            }

            if (error.name === 'AbortError') {
                const timeoutError = new HttpError('Request timed out', 408, 'TIMEOUT_ERROR');
                Sentry.captureException(timeoutError, { extra: { endpoint, timeout } });
                throw timeoutError;
            }

            // Network errors, etc.
            const networkError = new HttpError(error.message || 'Network request failed', 500, 'NETWORK_ERROR');
            Sentry.captureException(networkError, { extra: { endpoint, originalError: error.message } });
            throw networkError;
        }
    }

    // Public methods
    public get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    public post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    public put<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    public patch<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(body)
        });
    }

    public delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

export const httpClient = new HttpClient();
export default httpClient;
