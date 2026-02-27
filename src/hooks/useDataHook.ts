import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { HttpError } from '@/lib/http-client';

/**
 * Configuration for data hooks
 */
interface DataHookConfig<TData, TError = HttpError> {
    key: string[]; // Query key
    fetcher: () => Promise<TData>; // Fetch function
    options?: UseQueryOptions<TData, TError>; // React Query options
}

/**
 * Standard hook for fetching data
 */
export function useData<TData, TError = HttpError>({ key, fetcher, options }: DataHookConfig<TData, TError>) {
    return useQuery<TData, TError>({
        queryKey: key,
        queryFn: fetcher,
        ...options,
    });
}

/**
 * Standard hook for direct mutations (create, update, delete)
 */
export function useDataMutation<TData, TVariables, TError = HttpError>(
    mutationFn: (variables: TVariables) => Promise<TData>,
    options?: UseMutationOptions<TData, TError, TVariables>
) {
    const queryClient = useQueryClient();

    return useMutation<TData, TError, TVariables>({
        mutationFn,
        onSuccess: (...args) => {
            options?.onSuccess?.(...args);
        },
        ...options,
    });
}
