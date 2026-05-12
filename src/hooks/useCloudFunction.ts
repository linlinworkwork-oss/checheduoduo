import { useState, useCallback } from 'react';
import { callCloudFunction } from '../lib/cloud';

/**
 * Hook wrapper for cloud function calls with loading/error state.
 */
export function useCloudFunction<T = any>(name: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const call = useCallback(
    async (params: Record<string, unknown> = {}) => {
      setLoading(true);
      setError(null);
      try {
        const result = await callCloudFunction<T>(name, params);
        setData(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : '请求失败';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [name],
  );

  return { call, loading, error, data };
}
