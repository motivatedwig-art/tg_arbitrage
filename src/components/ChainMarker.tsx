import React from 'react';
import styled from 'styled-components';

interface ChainMarkerProps {
  blockchain: string;
  showWarning?: boolean;
}

const ChainMarkerContainer = styled.div<{ blockchain: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid ${props => getChainColor(props.blockchain)};
  background: ${props => getChainColor(props.blockchain)}15;
  color: ${props => getChainColor(props.blockchain)};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const WarningBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  background: #ff444415;
  color: #ff4444;
  border: 1px solid #ff4444;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  animation: pulse 2s infinite;
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }
`;

const ChainIcon = styled.span`
  font-size: 14px;
`;

function getChainColor(blockchain: string): string {
  switch (blockchain.toLowerCase()) {
    case 'ethereum':
    case 'erc-20':
      return '#627eea';
    case 'bsc':
    case 'bep-20':
      return '#f3ba2f';
    case 'polygon':
    case 'matic':
      return '#8247e5';
    case 'solana':
    case 'sol':
      return '#9945ff';
    case 'tron':
    case 'trc-20':
      return '#ff060a';
    case 'arbitrum':
      return '#28a0f0';
    case 'optimism':
      return '#ff0420';
    case 'avalanche':
    case 'avax':
      return '#e84142';
    case 'fantom':
      return '#1969ff';
    default:
      return '#666666';
  }
}

function getChainIcon(blockchain: string): string {
  switch (blockchain.toLowerCase()) {
    case 'ethereum':
    case 'erc-20':
      return '⟠';
    case 'bsc':
    case 'bep-20':
      return '🟡';
    case 'polygon':
    case 'matic':
      return '🟣';
    case 'solana':
    case 'sol':
      return '🟠';
    case 'tron':
    case 'trc-20':
      return '🔴';
    case 'arbitrum':
      return '🔵';
    case 'optimism':
      return '🟢';
    case 'avalanche':
    case 'avax':
      return '🔶';
    case 'fantom':
      return '🔷';
    default:
      return '⛓️';
  }
}

function getChainDisplayName(blockchain: string): string {
  switch (blockchain.toLowerCase()) {
    case 'ethereum':
      return 'ERC-20';
    case 'bsc':
      return 'BEP-20';
    case 'polygon':
      return 'POLYGON';
    case 'solana':
      return 'SOLANA';
    case 'tron':
      return 'TRC-20';
    case 'arbitrum':
      return 'ARBITRUM';
    case 'optimism':
      return 'OPTIMISM';
    case 'avalanche':
      return 'AVALANCHE';
    case 'fantom':
      return 'FANTOM';
    default:
      return blockchain.toUpperCase();
  }
}

export const ChainMarker: React.FC<ChainMarkerProps> = ({ blockchain, showWarning }) => {
  if (!blockchain) return null;

  const isEthereum = blockchain.toLowerCase() === 'ethereum' || blockchain.toLowerCase() === 'erc-20';

  if (showWarning && isEthereum) {
    return (
      <WarningBadge>
        <ChainIcon>{getChainIcon(blockchain)}</ChainIcon>
        {getChainDisplayName(blockchain)}
        <span>⚠️</span>
      </WarningBadge>
    );
  }

  return (
    <ChainMarkerContainer blockchain={blockchain}>
      <ChainIcon>{getChainIcon(blockchain)}</ChainIcon>
      {getChainDisplayName(blockchain)}
    </ChainMarkerContainer>
  );
};

export default ChainMarker;
