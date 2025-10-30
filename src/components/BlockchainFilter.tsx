import React from 'react';
import clsx from 'clsx';
import { BlockchainLogo } from './BlockchainLogo';

interface BlockchainFilterProps {
  availableChains: string[];
  selectedChains: Set<string>;
  onSelectionChange: (chains: Set<string>) => void;
  opportunityCounts: Record<string, number>;
}

export const BlockchainFilter: React.FC<BlockchainFilterProps> = ({
  availableChains,
  selectedChains,
  onSelectionChange,
  opportunityCounts
}) => {
  // Filter out blockchains with zero opportunities
  const chainsWithOpportunities = availableChains.filter(
    chain => (opportunityCounts[chain] || 0) > 0
  );

  if (chainsWithOpportunities.length === 0) {
    return null;
  }

  const handleToggle = (chain: string) => {
    const newSelected = new Set(selectedChains);
    if (newSelected.has(chain)) {
      newSelected.delete(chain);
    } else {
      newSelected.add(chain);
    }
    onSelectionChange(newSelected);
  };

  const handleSelectAll = () => {
    onSelectionChange(new Set(chainsWithOpportunities));
  };

  const handleDeselectAll = () => {
    onSelectionChange(new Set());
  };

  const isAllSelected = selectedChains.size === chainsWithOpportunities.length;
  const isNoneSelected = selectedChains.size === 0;

  return (
    <div className="mb-6 p-4 rounded-xl bg-[var(--tg-theme-secondary-bg-color)] border border-[var(--tg-theme-hint-color)]/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--tg-theme-text-color)] flex items-center gap-2">
          <span>🔍</span>
          Filter by Blockchain
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            disabled={isAllSelected}
            className={clsx(
              'text-xs px-3 py-1 rounded-full transition-all',
              isAllSelected
                ? 'bg-[var(--tg-theme-hint-color)]/20 text-[var(--tg-theme-hint-color)] cursor-not-allowed'
                : 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] hover:opacity-80'
            )}
          >
            Select All
          </button>
          <button
            onClick={handleDeselectAll}
            disabled={isNoneSelected}
            className={clsx(
              'text-xs px-3 py-1 rounded-full transition-all',
              isNoneSelected
                ? 'bg-[var(--tg-theme-hint-color)]/20 text-[var(--tg-theme-hint-color)] cursor-not-allowed'
                : 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] hover:opacity-80'
            )}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Blockchain Chips */}
      <div className="flex flex-wrap gap-2">
        {chainsWithOpportunities.map(chain => {
          const isSelected = selectedChains.has(chain);
          const count = opportunityCounts[chain] || 0;

          return (
            <button
              key={chain}
              onClick={() => handleToggle(chain)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                'border-2 text-sm font-medium',
                isSelected
                  ? 'border-[var(--tg-theme-button-color)] bg-[var(--tg-theme-button-color)]/10 text-[var(--tg-theme-text-color)]'
                  : 'border-[var(--tg-theme-hint-color)]/30 bg-transparent text-[var(--tg-theme-hint-color)] hover:border-[var(--tg-theme-hint-color)]'
              )}
            >
              <BlockchainLogo blockchain={chain} size="sm" />
              <span className="capitalize">{chain}</span>
              <span
                className={clsx(
                  'ml-1 px-2 py-0.5 rounded-full text-xs font-bold',
                  isSelected
                    ? 'bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]'
                    : 'bg-[var(--tg-theme-hint-color)]/20 text-[var(--tg-theme-hint-color)]'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Info text */}
      {selectedChains.size > 0 && selectedChains.size < chainsWithOpportunities.length && (
        <div className="mt-3 text-xs text-[var(--tg-theme-hint-color)] text-center">
          Showing {selectedChains.size} of {chainsWithOpportunities.length} blockchains
        </div>
      )}
    </div>
  );
};


