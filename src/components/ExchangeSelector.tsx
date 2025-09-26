import React from 'react';
import { Exchange } from '../types';

interface ExchangeSelectorProps {
  exchanges: Exchange[];
  selectedExchanges: string[];
  onToggle: (exchangeId: string, selected: boolean) => void;
}

export const ExchangeSelector: React.FC<ExchangeSelectorProps> = ({
  exchanges,
  selectedExchanges,
  onToggle
}) => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-[var(--tg-theme-text-color)]">
        Select Exchanges ({selectedExchanges.length}/{exchanges.length})
      </h3>
      
      <div className="grid grid-cols-2 gap-2">
        {exchanges.map((exchange) => {
          const isSelected = selectedExchanges.includes(exchange.id);
          
          return (
            <button
              key={exchange.id}
              onClick={() => onToggle(exchange.id, !isSelected)}
              className={`
                flex items-center space-x-2 p-3 rounded-lg border transition-all
                ${isSelected 
                  ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] border-[var(--tg-theme-button-color)]' 
                  : 'bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] border-[var(--tg-theme-secondary-bg-color)] hover:border-[var(--tg-theme-button-color)]'
                }
              `}
            >
              <span className="text-lg">{exchange.logo}</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium truncate">
                  {exchange.displayName}
                </div>
                {exchange.status && (
                  <div className={`text-xs ${
                    exchange.status === 'active' ? 'text-green-400' : 
                    exchange.status === 'error' ? 'text-red-400' : 
                    'text-[var(--tg-theme-hint-color)]'
                  }`}>
                    {exchange.status}
                  </div>
                )}
              </div>
              {isSelected && (
                <div className="text-sm">✓</div>
              )}
            </button>
          );
        })}
      </div>
      
      {selectedExchanges.length === 0 && (
        <p className="text-sm text-[var(--tg-theme-hint-color)] text-center py-2">
          Select at least one exchange to view arbitrage opportunities
        </p>
      )}
    </div>
  );
};

