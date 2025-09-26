import React, { useEffect, useState } from 'react';
import { useTelegramWebApp } from './hooks/useTelegramWebApp';
import { useArbitrageData } from './hooks/useArbitrageData';
import { apiService } from './services/api';
import { Exchange } from './types';

// Components (you'll need to create these)
import { ArbitrageTable } from './components/ArbitrageTable';
import { ExchangeSelector } from './components/ExchangeSelector';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';

const App: React.FC = () => {
  const { 
    webApp, 
    user, 
    isReady, 
    error: tgError,
    hapticFeedback,
    isTelegramWebApp 
  } = useTelegramWebApp();
  
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const [exchangesLoading, setExchangesLoading] = useState(true);
  const [exchangesError, setExchangesError] = useState<string | null>(null);
  
  const { 
    data: arbitrageData, 
    loading: dataLoading, 
    error: dataError,
    lastUpdate,
    refetch 
  } = useArbitrageData(selectedExchanges);

  // Initialize exchanges and selected exchanges
  useEffect(() => {
    const initializeExchanges = async () => {
      try {
        setExchangesLoading(true);
        setExchangesError(null);
        
        const availableExchanges = await apiService.getAvailableExchanges();
        setExchanges(availableExchanges);
        
        // Set default selected exchanges
        const defaultSelected = availableExchanges
          .filter(ex => ex.isSelected)
          .map(ex => ex.id);
        setSelectedExchanges(defaultSelected);
        
        console.log('Exchanges initialized:', {
          total: availableExchanges.length,
          selected: defaultSelected.length
        });
        
      } catch (error) {
        console.error('Failed to initialize exchanges:', error);
        setExchangesError(error instanceof Error ? error.message : 'Failed to load exchanges');
      } finally {
        setExchangesLoading(false);
      }
    };

    if (isReady) {
      initializeExchanges();
    }
  }, [isReady]);

  // Handle exchange selection changes
  const handleExchangeToggle = (exchangeId: string, selected: boolean) => {
    hapticFeedback('selection');
    
    setSelectedExchanges(prev => {
      const newSelected = selected 
        ? [...prev, exchangeId]
        : prev.filter(id => id !== exchangeId);
      
      // Save preferences if user is available
      if (user?.id) {
        apiService.saveUserPreferences(user.id.toString(), newSelected).catch(console.error);
      }
      
      return newSelected;
    });
  };

  // Handle refresh
  const handleRefresh = () => {
    hapticFeedback('impact', 'light');
    refetch();
  };

  // Show loading state while initializing
  if (!isReady || exchangesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tg-theme-bg-color)]">
        <LoadingSpinner message="Initializing..." />
      </div>
    );
  }

  // Show error if Telegram WebApp failed to initialize
  if (tgError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tg-theme-bg-color)] p-4">
        <ErrorMessage 
          title="Initialization Error"
          message={tgError}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  // Show error if exchanges failed to load
  if (exchangesError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tg-theme-bg-color)] p-4">
        <ErrorMessage 
          title="Failed to Load Exchanges"
          message={exchangesError}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)]">
      {/* Header */}
      <div className="sticky top-0 bg-[var(--tg-theme-bg-color)] border-b border-[var(--tg-theme-secondary-bg-color)] z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Crypto Arbitrage</h1>
              {user && (
                <p className="text-sm text-[var(--tg-theme-hint-color)]">
                  Welcome, {user.first_name}
                </p>
              )}
            </div>
            <button 
              onClick={handleRefresh}
              disabled={dataLoading}
              className="px-3 py-2 bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] rounded-lg disabled:opacity-50"
            >
              {dataLoading ? '⟳' : '↻'}
            </button>
          </div>
          
          {lastUpdate && (
            <p className="text-xs text-[var(--tg-theme-hint-color)] mt-1">
              Last update: {new Date(lastUpdate).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pb-4">
        {/* Exchange Selector */}
        <div className="px-4 py-3 border-b border-[var(--tg-theme-secondary-bg-color)]">
          <ExchangeSelector 
            exchanges={exchanges}
            selectedExchanges={selectedExchanges}
            onToggle={handleExchangeToggle}
          />
        </div>

        {/* Arbitrage Data */}
        <div className="px-4 py-3">
          {selectedExchanges.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[var(--tg-theme-hint-color)]">
                Please select at least one exchange to view arbitrage opportunities
              </p>
            </div>
          ) : dataError ? (
            <ErrorMessage 
              title="Failed to Load Data"
              message={dataError}
              onRetry={handleRefresh}
            />
          ) : (
            <ArbitrageTable 
              data={arbitrageData}
              loading={dataLoading}
              onRowClick={(opportunity) => {
                hapticFeedback('impact', 'light');
                // Handle row click - maybe open exchange links
              }}
            />
          )}
        </div>
      </div>

      {/* Debug Info (only in development) */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded max-w-xs">
          <p>Telegram: {isTelegramWebApp ? 'Yes' : 'No'}</p>
          <p>User: {user?.first_name || 'None'}</p>
          <p>Exchanges: {selectedExchanges.length}/{exchanges.length}</p>
          <p>Opportunities: {arbitrageData.length}</p>
        </div>
      )}
    </div>
  );
};

export default App;
