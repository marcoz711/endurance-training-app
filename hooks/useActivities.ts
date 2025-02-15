import useSWR from 'swr';
import { ActivityLogEntry } from '../types/activity';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useActivities(startDate?: string, endDate?: string) {
  const url = startDate && endDate 
    ? `/api/activityLog?startDate=${startDate}&endDate=${endDate}`
    : '/api/activityLog';

  const { data, error, mutate } = useSWR<ActivityLogEntry[]>(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  });

  return {
    activities: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
} 