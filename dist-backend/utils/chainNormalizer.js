/**
 * Chain normalization utility
 * Normalizes chain names to a consistent format
 */
export const SUPPORTED_CHAINS = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'base', 'solana', 'avalanche', 'tron'];
/**
 * Normalize chain name to standard format
 */
export function normalizeChain(chain) {
    if (!chain)
        return null;
    const normalized = chain.toLowerCase().trim();
    // Map common aliases to standard names
    const chainMap = {
        'eth': 'ethereum',
        'ether': 'ethereum',
        'mainnet': 'ethereum',
        'bnb': 'bsc',
        'binance': 'bsc',
        'binance-smart-chain': 'bsc',
        'matic': 'polygon',
        'arb': 'arbitrum',
        'arbitrum-one': 'arbitrum',
        'op': 'optimism',
        'optimistic-ethereum': 'optimism',
        'sol': 'solana',
        'avax': 'avalanche',
        'trx': 'tron',
        'ton': 'ton',
        'apt': 'aptos',
        'sui': 'sui',
        'near': 'near',
        'atom': 'cosmos',
        'dot': 'polkadot',
        'ada': 'cardano',
        'btc': 'bitcoin',
        'xrp': 'ripple',
        'xlm': 'stellar',
        'doge': 'dogecoin',
        'ltc': 'litecoin'
    };
    // Check if it's a known alias
    if (chainMap[normalized]) {
        return chainMap[normalized];
    }
    // Check if it's already a supported chain
    if (SUPPORTED_CHAINS.includes(normalized)) {
        return normalized;
    }
    // Return null for unknown chains
    return null;
}
/**
 * Check if a chain is supported
 */
export function isSupportedChain(chain) {
    const normalized = normalizeChain(chain);
    return normalized !== null && SUPPORTED_CHAINS.includes(normalized);
}
/**
 * Get chain display name
 */
export function getChainDisplayName(chain) {
    const normalized = normalizeChain(chain);
    if (!normalized)
        return 'Unknown';
    const displayNames = {
        'ethereum': 'Ethereum',
        'bsc': 'BSC',
        'polygon': 'Polygon',
        'arbitrum': 'Arbitrum',
        'optimism': 'Optimism',
        'base': 'Base',
        'solana': 'Solana',
        'avalanche': 'Avalanche',
        'tron': 'Tron'
    };
    return displayNames[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
//# sourceMappingURL=chainNormalizer.js.map