/**
 * Comprehensive token-to-blockchain mapping database
 * This provides blockchain information for common tokens
 */
/**
 * Get blockchain for a token based on comprehensive database
 */
export function getTokenBlockchain(symbol) {
    const cleanSymbol = extractBaseSymbol(symbol);
    return tokenBlockchainDatabase[cleanSymbol] || null;
}
/**
 * Extract base symbol from trading pair (e.g., "BTC/USDT" -> "BTC")
 */
function extractBaseSymbol(symbol) {
    return symbol
        .replace(/[\/\-_]/g, '')
        .replace(/USDT$|USDC$|BTC$|ETH$|BNB$|USD$|EUR$/, '')
        .toUpperCase();
}
/**
 * Comprehensive token-to-blockchain database
 * Based on native chains and primary listings
 */
export const tokenBlockchainDatabase = {
    // === SOLANA ECOSYSTEM ===
    'SOL': 'solana',
    'BONK': 'solana',
    'JTO': 'solana',
    'PYTH': 'solana',
    'WIF': 'solana',
    'JUP': 'solana',
    'TNSR': 'solana',
    'MEME': 'solana',
    'BOME': 'solana',
    'KMNO': 'solana',
    'RAY': 'solana',
    'ORCA': 'solana',
    'PONKE': 'solana',
    'POPCAT': 'solana',
    'MYRO': 'solana',
    'WEN': 'solana',
    'MOBILE': 'solana',
    'HNT': 'solana',
    'RENDER': 'solana',
    'IO': 'solana',
    // === TRON ECOSYSTEM ===
    'TRX': 'tron',
    'BTT': 'tron',
    'JST': 'tron',
    'WIN': 'tron',
    'SUN': 'tron',
    'TRC': 'tron',
    'NFT': 'tron',
    // === BSC ECOSYSTEM ===
    'BNB': 'bsc',
    'CAKE': 'bsc',
    'BAKE': 'bsc',
    'XVS': 'bsc',
    'VAI': 'bsc',
    'ALPACA': 'bsc',
    'BANANA': 'bsc',
    'AUTO': 'bsc',
    'WBNB': 'bsc',
    // === POLYGON ECOSYSTEM ===
    'MATIC': 'polygon',
    'QUICK': 'polygon',
    'WMATIC': 'polygon',
    // === ARBITRUM ECOSYSTEM ===
    'ARB': 'arbitrum',
    'GMX': 'arbitrum',
    'MAGIC': 'arbitrum',
    'RDNT': 'arbitrum',
    // === OPTIMISM ECOSYSTEM ===
    'OP': 'optimism',
    'VELO': 'optimism',
    // === AVALANCHE ECOSYSTEM ===
    'AVAX': 'avalanche',
    'JOE': 'avalanche',
    'PNG': 'avalanche',
    'WAVAX': 'avalanche',
    // === TON ECOSYSTEM ===
    'TON': 'ton',
    'NOT': 'ton',
    'DOGS': 'ton',
    'HMSTR': 'ton',
    // === BASE ECOSYSTEM ===
    'BRETT': 'base',
    'DEGEN': 'base',
    'TOSHI': 'base',
    // === SUI ECOSYSTEM ===
    'SUI': 'sui',
    'CETUS': 'sui',
    // === APTOS ECOSYSTEM ===
    'APT': 'aptos',
    // === COSMOS ECOSYSTEM ===
    'ATOM': 'cosmos',
    'OSMO': 'cosmos',
    'SCRT': 'cosmos',
    // === NEAR ECOSYSTEM ===
    'NEAR': 'near',
    // === POLKADOT ECOSYSTEM ===
    'DOT': 'polkadot',
    'KSM': 'polkadot',
    // === CARDANO ECOSYSTEM ===
    'ADA': 'cardano',
    // === ETHEREUM ECOSYSTEM (ERC-20) ===
    'ETH': 'ethereum',
    'WETH': 'ethereum',
    'LINK': 'ethereum',
    'UNI': 'ethereum',
    'AAVE': 'ethereum',
    'MKR': 'ethereum',
    'SNX': 'ethereum',
    'CRV': 'ethereum',
    'COMP': 'ethereum',
    'SUSHI': 'ethereum',
    'YFI': 'ethereum',
    'BAL': 'ethereum',
    '1INCH': 'ethereum',
    'ENS': 'ethereum',
    'LDO': 'ethereum',
    'RPL': 'ethereum',
    'FXS': 'ethereum',
    'CVX': 'ethereum',
    'SHIB': 'ethereum',
    'PEPE': 'ethereum',
    'FLOKI': 'ethereum',
    'GALA': 'ethereum',
    'SAND': 'ethereum',
    'MANA': 'ethereum',
    'AXS': 'ethereum',
    'CHZ': 'ethereum',
    'ENJ': 'ethereum',
    'IMX': 'ethereum',
    'APE': 'ethereum',
    'BLUR': 'ethereum',
    'LRC': 'ethereum',
    'GRT': 'ethereum',
    'FET': 'ethereum',
    'AGIX': 'ethereum',
    'RNDR': 'ethereum',
    'THETA': 'ethereum',
    'FIL': 'ethereum',
    'STX': 'ethereum',
    'ICP': 'ethereum',
    'HBAR': 'ethereum',
    'QNT': 'ethereum',
    'VET': 'ethereum',
    'ALGO': 'ethereum',
    'EOS': 'ethereum',
    'XTZ': 'ethereum',
    'EGLD': 'ethereum',
    'FLOW': 'ethereum',
    'MINA': 'ethereum',
    'ROSE': 'ethereum',
    'ONE': 'ethereum',
    'CELO': 'ethereum',
    'ZIL': 'ethereum',
    'IOTA': 'ethereum',
    'XEC': 'ethereum',
    'KDA': 'ethereum',
    'WOO': 'ethereum',
    'MASK': 'ethereum',
    'AUDIO': 'ethereum',
    'DYDX': 'ethereum',
    'PERP': 'ethereum',
    'DODO': 'ethereum',
    'ALPHA': 'ethereum',
    'SXP': 'ethereum',
    'SPELL': 'ethereum',
    'LOOKS': 'ethereum',
    'ANT': 'ethereum',
    'BAT': 'ethereum',
    'ZRX': 'ethereum',
    'BNT': 'ethereum',
    'KNC': 'ethereum',
    'REN': 'ethereum',
    'BAND': 'ethereum',
    'OCEAN': 'ethereum',
    'RSR': 'ethereum',
    'OMG': 'ethereum',
    'STORJ': 'ethereum',
    'SKL': 'ethereum',
    'ANKR': 'ethereum',
    'CVC': 'ethereum',
    'REQ': 'ethereum',
    'POLY': 'ethereum',
    'CELR': 'ethereum',
    'CTSI': 'ethereum',
    'NU': 'ethereum',
    'KEEP': 'ethereum',
    'OXT': 'ethereum',
    'NMR': 'ethereum',
    'RLC': 'ethereum',
    'GHST': 'ethereum',
    'TRIBE': 'ethereum',
    'ALCX': 'ethereum',
    'BADGER': 'ethereum',
    'FARM': 'ethereum',
    'FRAX': 'ethereum',
    'OHM': 'ethereum',
    'RUNE': 'ethereum',
    'INJ': 'ethereum',
    'KAVA': 'ethereum',
    'LUNA': 'ethereum',
    'ANC': 'ethereum',
    'MIR': 'ethereum',
};
//# sourceMappingURL=TokenMetadataDatabase.js.map