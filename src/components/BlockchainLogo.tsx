import React from 'react';
import clsx from 'clsx';

interface BlockchainLogoProps {
  blockchain: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

// Blockchain configuration with emojis and display names
const BLOCKCHAIN_CONFIG: { [key: string]: { name: string; emoji: string; color: string } } = {
  'ethereum': { name: 'Ethereum', emoji: '⟠', color: '#627EEA' },
  'solana': { name: 'Solana', emoji: '◎', color: '#14F195' },
  'bsc': { name: 'BSC', emoji: '🔶', color: '#F3BA2F' },
  'polygon': { name: 'Polygon', emoji: '⬡', color: '#8247E5' },
  'arbitrum': { name: 'Arbitrum', emoji: '🔵', color: '#28A0F0' },
  'optimism': { name: 'Optimism', emoji: '🔴', color: '#FF0420' },
  'avalanche': { name: 'Avalanche', emoji: '🔺', color: '#E84142' },
  'tron': { name: 'Tron', emoji: '⚡', color: '#FF060A' },
  'fantom': { name: 'Fantom', emoji: '👻', color: '#1969FF' },
  'base': { name: 'Base', emoji: '🔵', color: '#0052FF' },
  'ton': { name: 'TON', emoji: '💎', color: '#0088CC' },
  'sui': { name: 'Sui', emoji: '🌊', color: '#4DA2FF' },
  'aptos': { name: 'Aptos', emoji: '🅰️', color: '#00D4AA' },
  'cosmos': { name: 'Cosmos', emoji: '⚛️', color: '#2E3148' },
  'near': { name: 'NEAR', emoji: '🌈', color: '#00C08B' },
  'cronos': { name: 'Cronos', emoji: '🦁', color: '#002D74' },
  'harmony': { name: 'Harmony', emoji: '🎵', color: '#00ADE8' },
  'moonbeam': { name: 'Moonbeam', emoji: '🌙', color: '#53CBC9' },
  'moonriver': { name: 'Moonriver', emoji: '🌕', color: '#F2B705' },
  'bitcoin': { name: 'Bitcoin', emoji: '₿', color: '#F7931A' },
  'ripple': { name: 'Ripple', emoji: '🌊', color: '#23292F' },
  'stellar': { name: 'Stellar', emoji: '⭐', color: '#000000' },
  'dogecoin': { name: 'Dogecoin', emoji: '🐕', color: '#C3A634' },
  'litecoin': { name: 'Litecoin', emoji: 'Ł', color: '#345D9D' },
};

const getBlockchainConfig = (blockchain: string) => {
  return BLOCKCHAIN_CONFIG[blockchain.toLowerCase()] || {
    name: blockchain.charAt(0).toUpperCase() + blockchain.slice(1),
    emoji: '🔗',
    color: '#6B7280'
  };
};

const sizeClasses = {
  sm: 'text-lg w-6 h-6',
  md: 'text-2xl w-8 h-8',
  lg: 'text-4xl w-12 h-12'
};

export const BlockchainLogo: React.FC<BlockchainLogoProps> = ({
  blockchain,
  size = 'md',
  showName = false
}) => {
  const config = getBlockchainConfig(blockchain);

  return (
    <div className="flex items-center gap-2">
      <div
        className={clsx(
          'flex items-center justify-center rounded-full',
          'font-bold transition-transform hover:scale-110',
          sizeClasses[size]
        )}
        style={{
          background: `linear-gradient(135deg, ${config.color}22, ${config.color}11)`,
          border: `2px solid ${config.color}44`,
          color: config.color
        }}
        title={config.name}
      >
        <span className="drop-shadow-sm">{config.emoji}</span>
      </div>
      {showName && (
        <span
          className="font-semibold text-sm"
          style={{ color: config.color }}
        >
          {config.name}
        </span>
      )}
    </div>
  );
};

