import React from 'react';
import { ArbitrageOpportunity } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface ArbitrageTableProps {
  data: ArbitrageOpportunity[];
  loading: boolean;
  onRowClick?: (opportunity: ArbitrageOpportunity) => void;
}

export const ArbitrageTable: React.FC<ArbitrageTableProps> = ({
  data,
  loading,
  onRowClick
}) => {
  if (loading) {
    return <LoadingSpinner message="Loading opportunities..." />;
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-6 opacity-75">📊</div>
        <p className="text-[var(--tg-theme-text-color)] text-lg font-medium mb-2">
          No arbitrage opportunities found
        </p>
        <p className="text-sm text-[var(--tg-theme-hint-color)] mb-4 max-w-xs mx-auto">
          Try selecting different exchanges or check back later for new opportunities
        </p>
        <div className="text-xs text-[var(--tg-theme-hint-color)] opacity-75 mt-6">
          💡 Markets are actively monitored - opportunities appear when price differences exist
        </div>
      </div>
    );
  }

  const getProfitabilityColor = (profitability: string) => {
    switch (profitability) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
      default: return 'text-[var(--tg-theme-hint-color)]';
    }
  };

  const getProfitabilityBg = (profitability: string) => {
    switch (profitability) {
      case 'high': return 'bg-green-100 dark:bg-green-900';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900';
      case 'low': return 'bg-red-100 dark:bg-red-900';
      default: return 'bg-[var(--tg-theme-secondary-bg-color)]';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-[var(--tg-theme-text-color)]">
          📈 Arbitrage Opportunities
        </h3>
        <span className="px-3 py-1 bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] rounded-full text-sm font-medium">
          {data.length} found
        </span>
      </div>

      <div className="space-y-3">
        {data.map((opportunity, index) => (
          <div
            key={`${opportunity.pair.symbol}-${index}`}
            onClick={() => onRowClick?.(opportunity)}
            className="bg-[var(--tg-theme-secondary-bg-color)] rounded-lg p-4 cursor-pointer hover:opacity-90 transition-opacity"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg">💰</span>
                <span className="font-semibold text-[var(--tg-theme-text-color)]">
                  {opportunity.pair.displaySymbol}
                </span>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getProfitabilityBg(opportunity.profitability)} ${getProfitabilityColor(opportunity.profitability)}`}>
                {opportunity.profitability.toUpperCase()}
              </div>
            </div>

            {/* Spread Info */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-xs text-[var(--tg-theme-hint-color)]">Spread</div>
                <div className="font-semibold text-[var(--tg-theme-text-color)]">
                  {opportunity.spreadPercentage.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--tg-theme-hint-color)]">Amount</div>
                <div className="font-semibold text-[var(--tg-theme-text-color)]">
                  ${opportunity.spreadAmount.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Exchange Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-[var(--tg-theme-hint-color)] mb-1">Buy at</div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{opportunity.bestBuy.exchangeName}</span>
                  <span className="font-semibold text-[var(--tg-theme-text-color)]">
                    ${opportunity.bestBuy.price.toFixed(4)}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--tg-theme-hint-color)] mb-1">Sell at</div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{opportunity.bestSell.exchangeName}</span>
                  <span className="font-semibold text-[var(--tg-theme-text-color)]">
                    ${opportunity.bestSell.price.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            {/* Volume Info */}
            {opportunity.bestBuy.volume > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--tg-theme-bg-color)]">
                <div className="text-xs text-[var(--tg-theme-hint-color)]">
                  Volume: {opportunity.bestBuy.volume.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

