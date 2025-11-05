import React, { useState, useMemo } from 'react';
import { ArbitrageOpportunity } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { BlockchainLogo } from './BlockchainLogo';
import { CollapsedPreview } from './CollapsedPreview';
import { getProfitBadgeColors, getProfitRowStyles } from '../utils/profitColors';

interface BlockchainGroupedTableProps {
  data: { [blockchain: string]: ArbitrageOpportunity[] };
  loading: boolean;
  onRowClick?: (opportunity: ArbitrageOpportunity) => void;
}

// Blockchain configuration with names, emojis, and colors
const BLOCKCHAIN_CONFIG: { [key: string]: { name: string; emoji: string; color: string; bg: string } } = {
  'ethereum': { name: 'Ethereum', emoji: '⟠', color: 'text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900' },
  'solana': { name: 'Solana', emoji: '◎', color: 'text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900' },
  'bsc': { name: 'BSC', emoji: '🔶', color: 'text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900' },
  'polygon': { name: 'Polygon', emoji: '⬡', color: 'text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900' },
  'arbitrum': { name: 'Arbitrum', emoji: '🔵', color: 'text-sky-400', bg: 'bg-sky-100 dark:bg-sky-900' },
  'optimism': { name: 'Optimism', emoji: '🔴', color: 'text-red-400', bg: 'bg-red-100 dark:bg-red-900' },
  'avalanche': { name: 'Avalanche', emoji: '🔺', color: 'text-red-400', bg: 'bg-red-100 dark:bg-red-900' },
  'tron': { name: 'Tron', emoji: '⚡', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900' },
  'fantom': { name: 'Fantom', emoji: '👻', color: 'text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900' },
  'base': { name: 'Base', emoji: '🔵', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900' },
  'ton': { name: 'TON', emoji: '💎', color: 'text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900' },
  'sui': { name: 'Sui', emoji: '🌊', color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900' },
  'aptos': { name: 'Aptos', emoji: '🅰️', color: 'text-teal-400', bg: 'bg-teal-100 dark:bg-teal-900' },
  'cosmos': { name: 'Cosmos', emoji: '⚛️', color: 'text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900' },
  'near': { name: 'NEAR', emoji: '🌈', color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-900' },
  'cronos': { name: 'Cronos', emoji: '🦁', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900' },
  'harmony': { name: 'Harmony', emoji: '🎵', color: 'text-green-400', bg: 'bg-green-100 dark:bg-green-900' },
  'moonbeam': { name: 'Moonbeam', emoji: '🌙', color: 'text-teal-300', bg: 'bg-teal-100 dark:bg-teal-900' },
  'moonriver': { name: 'Moonriver', emoji: '🌕', color: 'text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900' },
  'bitcoin': { name: 'Bitcoin', emoji: '₿', color: 'text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900' },
  'ripple': { name: 'Ripple', emoji: '🌊', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900' },
  'stellar': { name: 'Stellar', emoji: '⭐', color: 'text-gray-300', bg: 'bg-gray-100 dark:bg-gray-900' },
  'dogecoin': { name: 'Dogecoin', emoji: '🐕', color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900' },
  'litecoin': { name: 'Litecoin', emoji: 'Ł', color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-900' },
};

const getBlockchainConfig = (blockchain: string) => {
  return BLOCKCHAIN_CONFIG[blockchain.toLowerCase()] || {
    name: blockchain.charAt(0).toUpperCase() + blockchain.slice(1),
    emoji: '🔗',
    color: 'text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-900'
  };
};

export const BlockchainGroupedTable: React.FC<BlockchainGroupedTableProps> = ({
  data,
  loading,
  onRowClick
}) => {
  const [expandedBlockchains, setExpandedBlockchains] = useState<Set<string>>(new Set(Object.keys(data)));

  // Sort blockchains by average profitability (highest first)
  // Show ALL blockchains even if they have no opportunities (for professional UI)
  const sortedBlockchains = useMemo(() => {
    return Object.entries(data)
      .map(([blockchain, opportunities]) => {
        // Calculate average profit for this blockchain (default to 0 if no opportunities)
        const avgProfit = opportunities.length > 0 
          ? opportunities.reduce((sum, opp) => sum + opp.spreadPercentage, 0) / opportunities.length 
          : 0;
        // Calculate max profit for this blockchain (default to 0 if no opportunities)
        const maxProfit = opportunities.length > 0 
          ? Math.max(...opportunities.map(opp => opp.spreadPercentage))
          : 0;
        
        return {
          blockchain,
          opportunities,
          avgProfit,
          maxProfit,
          count: opportunities.length
        };
      })
      .sort((a, b) => {
        // First, prioritize blockchains with opportunities
        if (a.count === 0 && b.count > 0) return 1;
        if (a.count > 0 && b.count === 0) return -1;
        // Then sort by average profit (descending)
        if (Math.abs(a.avgProfit - b.avgProfit) > 0.1) {
          return b.avgProfit - a.avgProfit;
        }
        // Finally, sort by opportunity count (descending)
        return b.count - a.count;
      });
  }, [data]);

  if (loading) {
    return <LoadingSpinner message="Loading opportunities..." />;
  }

  if (sortedBlockchains.length === 0) {
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

  const toggleBlockchain = (blockchain: string) => {
    const newExpanded = new Set(expandedBlockchains);
    if (newExpanded.has(blockchain)) {
      newExpanded.delete(blockchain);
    } else {
      newExpanded.add(blockchain);
    }
    setExpandedBlockchains(newExpanded);
  };

  const totalOpportunities = sortedBlockchains.reduce((sum, bc) => sum + bc.count, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-[var(--tg-theme-text-color)]">
          🌐 Opportunities by Blockchain
        </h3>
        <span className="px-3 py-1 bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] rounded-full text-sm font-medium">
          {totalOpportunities} in {sortedBlockchains.length} chains
        </span>
      </div>

      {/* Blockchain Sections */}
      {sortedBlockchains.map(({ blockchain, opportunities, avgProfit, maxProfit }) => {
        const config = getBlockchainConfig(blockchain);
        const isExpanded = expandedBlockchains.has(blockchain);
        
        // Sort opportunities by profit (descending)
        const sortedOpportunities = [...opportunities].sort((a, b) => 
          b.spreadPercentage - a.spreadPercentage
        );

        return (
          <div key={blockchain} className="mb-6">
            {/* Blockchain Header */}
            <button
              onClick={() => toggleBlockchain(blockchain)}
              className="w-full flex items-center justify-between p-4 bg-[var(--tg-theme-secondary-bg-color)] rounded-lg mb-3 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <div className="flex items-center space-x-3">
                <BlockchainLogo blockchain={blockchain} size="md" />
                <div className="text-left">
                  <h4 className={`font-bold ${config.color} text-lg`}>
                    {config.name}
                  </h4>
                  <p className="text-xs text-[var(--tg-theme-hint-color)]">
                    {opportunities.length > 0 ? (
                      <>
                        {opportunities.length} {opportunities.length === 1 ? 'opportunity' : 'opportunities'}
                        {' • '}
                        Avg: {avgProfit.toFixed(2)}% • Max: {maxProfit.toFixed(2)}%
                      </>
                    ) : (
                      <span className="opacity-75">No opportunities yet • Monitoring this blockchain</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span 
                  className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: getProfitBadgeColors(avgProfit).bg,
                    color: getProfitBadgeColors(avgProfit).text
                  }}
                >
                  {avgProfit.toFixed(1)}%
                </span>
                <span className="text-[var(--tg-theme-hint-color)]">
                  {isExpanded ? '▼' : '▶'}
                </span>
              </div>
            </button>

            {/* Collapsed Preview */}
            {!isExpanded && (
              <CollapsedPreview
                blockchain={blockchain}
                opportunities={sortedOpportunities}
                onExpand={() => toggleBlockchain(blockchain)}
              />
            )}

            {/* Opportunities List */}
            {isExpanded && (
              <div className="space-y-3 ml-4">
                {sortedOpportunities.length === 0 ? (
                  <div className="rounded-lg p-6 text-center bg-[var(--tg-theme-secondary-bg-color)] opacity-75">
                    <p className="text-sm text-[var(--tg-theme-hint-color)]">
                      No arbitrage opportunities found for {config.name} at the moment.
                    </p>
                    <p className="text-xs text-[var(--tg-theme-hint-color)] mt-2">
                      Monitoring this blockchain for new opportunities...
                    </p>
                  </div>
                ) : (
                  sortedOpportunities.map((opp, index) => {
                  const profitStyles = getProfitRowStyles(opp.spreadPercentage);
                  const badgeColors = getProfitBadgeColors(opp.spreadPercentage);
                  
                  return (
                  <div
                    key={`${blockchain}-${opp.pair.symbol}-${index}`}
                    onClick={() => onRowClick?.(opp)}
                    className={`rounded-lg p-4 cursor-pointer hover:opacity-90 transition-all ${profitStyles.className}`}
                    style={{
                      ...profitStyles.style,
                      border: `1px solid ${profitStyles.style.borderLeft?.split(' ')[3]}`
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">💰</span>
                        <span className="font-semibold text-[var(--tg-theme-text-color)]">
                          {opp.pair.symbol}
                        </span>
                      </div>
                      <div 
                        className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: badgeColors.bg,
                          color: badgeColors.text
                        }}
                      >
                        {opp.spreadPercentage.toFixed(2)}% profit
                      </div>
                    </div>

                    {/* Exchange Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-[var(--tg-theme-hint-color)] mb-1">Buy at</div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[var(--tg-theme-text-color)]">
                            {opp.bestBuy.exchangeName}
                          </span>
                          <span className="font-semibold text-green-400">
                            ${opp.bestBuy.price.toFixed(4)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--tg-theme-hint-color)] mb-1">Sell at</div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[var(--tg-theme-text-color)]">
                            {opp.bestSell.exchangeName}
                          </span>
                          <span className="font-semibold text-blue-400">
                            ${opp.bestSell.price.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Volume Info */}
                    {opp.bestBuy.volume > 0 && (
                      <div className="mt-3 pt-3 border-t border-[var(--tg-theme-secondary-bg-color)]">
                        <div className="text-xs text-[var(--tg-theme-hint-color)]">
                          Volume: ${opp.bestBuy.volume.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};


