import React from 'react';
import { ArbitrageOpportunity } from '../types';

interface CollapsedPreviewProps {
  blockchain: string;
  opportunities: ArbitrageOpportunity[];
  onExpand: () => void;
}

export const CollapsedPreview: React.FC<CollapsedPreviewProps> = ({
  opportunities,
  onExpand
}) => {
  if (opportunities.length === 0) {
    return null;
  }

  // Get top 3 opportunities sorted by profit
  const topOpportunities = [...opportunities]
    .sort((a, b) => b.spreadPercentage - a.spreadPercentage)
    .slice(0, 3);

  // Calculate stats
  const totalVolume = opportunities.reduce((sum, opp) => sum + (opp.bestBuy.volume || 0), 0);
  const avgProfit = opportunities.reduce((sum, opp) => sum + opp.spreadPercentage, 0) / opportunities.length;

  return (
    <div
      onClick={onExpand}
      className="px-4 py-3 cursor-pointer hover:bg-[var(--tg-theme-secondary-bg-color)] rounded-lg transition-colors mt-2 ml-4"
      style={{
        background: 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.02))',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}
    >
      {/* Top Opportunities Preview */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs text-[var(--tg-theme-hint-color)]">💰 Top:</span>
        {topOpportunities.map((opp, index) => (
          <span
            key={index}
            className="text-xs font-medium"
            style={{
              color: opp.spreadPercentage >= 2 ? '#22c55e' : opp.spreadPercentage >= 1 ? '#eab308' : '#9ca3af'
            }}
          >
            {opp.pair.symbol} {opp.spreadPercentage.toFixed(2)}%
            {index < topOpportunities.length - 1 && (
              <span className="text-[var(--tg-theme-hint-color)] mx-1">|</span>
            )}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-[var(--tg-theme-hint-color)]">
        {totalVolume > 0 && (
          <span>📊 Volume: ${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        )}
        <span>📈 Avg: {avgProfit.toFixed(2)}%</span>
      </div>
    </div>
  );
};


