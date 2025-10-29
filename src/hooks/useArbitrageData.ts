import { useState, useEffect, useCallback } from 'react';
import { ArbitrageOpportunity } from '../types';
import { apiService } from '../services/api';

export const useArbitrageData = (selectedExchanges: string[]) => {
  const [data, setData] = useState<ArbitrageOpportunity[]>([]);
  const [groupedData, setGroupedData] = useState<{ [blockchain: string]: ArbitrageOpportunity[] }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [nextUpdate, setNextUpdate] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (selectedExchanges.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getArbitrageData(selectedExchanges);
      setData(response.opportunities);
      setGroupedData(response.grouped || {});
      setLastUpdate(response.lastUpdate);
      setNextUpdate(response.nextUpdate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [selectedExchanges]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    if (selectedExchanges.length === 0) return;

    const interval = setInterval(fetchData, 600000); // 10 minutes
    return () => clearInterval(interval);
  }, [fetchData, selectedExchanges]);

  return {
    data,
    groupedData,
    loading,
    error,
    lastUpdate,
    nextUpdate,
    refetch: fetchData,
  };
};
