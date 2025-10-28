/**
 * Comprehensive token-to-blockchain mapping database
 * This provides blockchain information for common tokens
 */

export interface TokenBlockchainMapping {
  [token: string]: string;
}

/**
 * Get blockchain for a token based on comprehensive database
 */
export function getTokenBlockchain(symbol: string): string | null {
  const cleanSymbol = extractBaseSymbol(symbol);
  return tokenBlockchainDatabase[cleanSymbol] || null;
}

/**
 * Extract base symbol from trading pair (e.g., "BTC/USDT" -> "BTC")
 */
function extractBaseSymbol(symbol: string): string {
  return symbol
    .replace(/[\/\-_]/g, '')
    .replace(/USDT$|USDC$|BTC$|ETH$|BNB$|USD$|EUR$/, '')
    .toUpperCase();
}

/**
 * Comprehensive token-to-blockchain database
 * Based on native chains and primary listings
 */
export const tokenBlockchainDatabase: TokenBlockchainMapping = {
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
  
  // === MORE ETHEREUM ERC-20 TOKENS ===
  'DAI': 'ethereum',
  'USDC': 'ethereum',
  'USDT': 'ethereum',
  'WBTC': 'ethereum',
  'TUSD': 'ethereum',
  'PAX': 'ethereum',
  'BUSD': 'ethereum',
  'GUSD': 'ethereum',
  'HUSD': 'ethereum',
  'EURS': 'ethereum',
  'STETH': 'ethereum',
  'RETH': 'ethereum',
  'CBETH': 'ethereum',
  'FRXETH': 'ethereum',
  'LUSD': 'ethereum',
  'RAI': 'ethereum',
  'sUSD': 'ethereum',
  'UST': 'ethereum',
  'USDP': 'ethereum',
  'DPI': 'ethereum',
  'MVI': 'ethereum',
  'BED': 'ethereum',
  'DATA': 'ethereum',
  'METIS': 'ethereum',
  'BOBA': 'ethereum',
  'LPT': 'ethereum',
  'GLM': 'ethereum',
  'AMP': 'ethereum',
  'MPL': 'ethereum',
  'UMA': 'ethereum',
  'BOND': 'ethereum',
  'API3': 'ethereum',
  'TRU': 'ethereum',
  'FORTH': 'ethereum',
  'CLV': 'ethereum',
  'POLS': 'ethereum',
  'MDX': 'ethereum',
  'SFP': 'ethereum',
  'LINA': 'ethereum',
  'PHA': 'ethereum',
  'TVK': 'ethereum',
  'REEF': 'ethereum',
  'SUPER': 'ethereum',
  'ILV': 'ethereum',
  'ERN': 'ethereum',
  'PUNDIX': 'ethereum',
  'TLM': 'ethereum',
  'ALICE': 'ethereum',
  'DEGO': 'ethereum',
  'OGN': 'ethereum',
  'PROM': 'ethereum',
  'CFX': 'ethereum',
  'TWT': 'ethereum',
  'LOKA': 'ethereum',
  'HIGH': 'ethereum',
  'VOXEL': 'ethereum',
  'BICO': 'ethereum',
  'JASMY': 'ethereum',
  'DAR': 'ethereum',
  'BNX': 'ethereum',
  'RBN': 'ethereum',
  'MC': 'ethereum',
  'PEOPLE': 'ethereum',
  'ACH': 'ethereum',
  'C98': 'ethereum',
  'RARE': 'ethereum',
  'FIDA': 'solana',  // Changed: FIDA is a Solana token
  'WHALE': 'ethereum',
  'GAME': 'ethereum',
  'PYR': 'ethereum',
  'NFTX': 'ethereum',
  'GODS': 'ethereum',
  'TITAN': 'ethereum',
  'VGX': 'ethereum',
  'PAXG': 'ethereum',
  
  // === MORE SOLANA SPL TOKENS ===
  'STEP': 'solana',
  'MEDIA': 'solana',
  'ROPE': 'solana',
  'MER': 'solana',
  'COPE': 'solana',
  'ALEPH': 'solana',
  'TULIP': 'solana',
  'SNY': 'solana',
  'SLRS': 'solana',
  'SAMO': 'solana',
  'ATLAS': 'solana',
  'POLIS': 'solana',
  'FOXY': 'solana',
  'SBR': 'solana',
  'PORT': 'solana',
  'MNGO': 'solana',
  'SRM': 'solana',
  'KIN': 'solana',
  'MAPS': 'solana',
  'OXY': 'solana',
  'SLND': 'solana',
  'DFL': 'solana',
  'GST': 'solana',
  'GMT': 'solana',
  
  // === MORE BSC BEP-20 TOKENS ===
  'SAFEMOON': 'bsc',
  // BTT removed (duplicate with TRON)
  // TWT removed (duplicate)
  // SFP removed (duplicate)
  // TKO removed (duplicate)
  // LINA removed (duplicate)
  // SXP removed (duplicate)
  // ALICE removed (duplicate)
  // TLM removed (duplicate)
  // DODO removed (duplicate)
  // DEGO removed (duplicate)
  'BURGER': 'bsc',
  'SPARTA': 'bsc',
  'WATCH': 'bsc',
  'NAR': 'bsc',
  'NYA': 'bsc',
  'CTK': 'bsc',
  // INJ removed (duplicate)
  'BELT': 'bsc',
  'BOR': 'bsc',
  'FUEL': 'bsc',
  'EGG': 'bsc',
  'JUV': 'bsc',
  'PSG': 'bsc',
  
  // === MORE POLYGON TOKENS (removed duplicates) ===
  'DQUICK': 'polygon',
  
  // === FANTOM ECOSYSTEM ===
  'FTM': 'fantom',
  'BOO': 'fantom',
  'SPIRIT': 'fantom',
  'TOMB': 'fantom',
  'TAROT': 'fantom',
  'SCREAM': 'fantom',
  'GEIST': 'fantom',
  // SPELL removed (duplicate)
  'MIM': 'fantom',
  'ICE': 'fantom',
  'TREEB': 'fantom',
  
  // === MORE ARBITRUM TOKENS ===
  'DPX': 'arbitrum',
  'JONES': 'arbitrum',
  'VSTA': 'arbitrum',
  'SPA': 'arbitrum',
  'UMAMI': 'arbitrum',
  'PLS': 'arbitrum',
  
  // === MORE AVALANCHE TOKENS ===
  'XAVA': 'avalanche',
  'SNOB': 'avalanche',
  'PEFI': 'avalanche',
  'YAK': 'avalanche',
  'QI': 'avalanche',
  'ELE': 'avalanche',
  'TEDDY': 'avalanche',
  'VSO': 'avalanche',
  'CRAFT': 'avalanche',
  
  // === HARMONY ECOSYSTEM (removed duplicate ONE) ===
  'VIPER': 'harmony',
  'COINK': 'harmony',
  'JEWEL': 'harmony',
  
  // === CRONOS ECOSYSTEM ===
  'CRO': 'cronos',
  'VVS': 'cronos',
  'TONIC': 'cronos',
  'MMF': 'cronos',
  
  // === MOONBEAM / MOONRIVER (removed duplicates) ===
  'STELLA': 'moonbeam',
  'ROME': 'moonriver',
  
  // === ADDITIONAL MAJOR TOKENS ===
  'XRP': 'ripple',
  'XLM': 'stellar',
  'DOGE': 'dogecoin',
  'LTC': 'litecoin',
  'BCH': 'bitcoin-cash',
  'ETC': 'ethereum-classic',
  'XMR': 'monero',
  'ZEC': 'zcash',
  'DASH': 'dash',
  'WAVES': 'waves',
  'NEO': 'neo',
  'ONT': 'ontology',
  'QTUM': 'qtum',
  'ICX': 'icon',
  'BTC': 'bitcoin',
};

