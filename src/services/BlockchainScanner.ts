/**
 * Blockchain Scanner Service
 * Scans exchanges to determine which blockchain each token belongs to
 */

import { ExchangeManager } from '../exchanges/ExchangeManager.js';
import { ExchangeAdapter } from '../exchanges/types/index.js';
import { BLOCKCHAIN_CONFIG } from '../config/blockchain.config.js';
import { normalizeChain } from '../utils/chainNormalizer.js';

/**
 * Field names carrying a token contract address in the raw payload, which
 * differs per exchange (KuCoin uses contractAddress, others vary). Checked in
 * order; the first plausible value wins.
 */
const CONTRACT_ADDRESS_FIELDS = [
  'contractAddress',
  'contract_address',
  'contract',
  'tokenContractAddress',
  'contractAddr',
  'address'
];

/**
 * Exchange network codes mapped to chain names.
 *
 * Exchanges label networks by token standard ("ERC20", "TRC20", "BEP20")
 * rather than by chain, and chainNormalizer does not know those spellings.
 * Without this table the two exchanges that serve fetchCurrencies without
 * credentials - KuCoin and Gate.io - would have every network dropped, which
 * is exactly the data available out of the box.
 */
const NETWORK_CODE_TO_CHAIN: Record<string, string> = {
  erc20: 'ethereum',
  eth: 'ethereum',
  ethereum: 'ethereum',
  trc20: 'tron',
  trx: 'tron',
  tron: 'tron',
  bep20: 'bsc',
  bep2: 'bsc',
  bsc: 'bsc',
  bnb: 'bsc',
  'bnb smart chain': 'bsc',
  matic: 'polygon',
  polygon: 'polygon',
  arbitrum: 'arbitrum',
  arbitrumone: 'arbitrum',
  arb: 'arbitrum',
  optimism: 'optimism',
  op: 'optimism',
  base: 'base',
  avaxc: 'avalanche',
  'avax-c': 'avalanche',
  avalanche: 'avalanche',
  cavax: 'avalanche',
  sol: 'solana',
  solana: 'solana',
  spl: 'solana',
  ftm: 'fantom',
  fantom: 'fantom',
  cro: 'cronos',
  cronos: 'cronos',
  zksync: 'zksync',
  zksyncera: 'zksync',
  linea: 'linea',
  scroll: 'scroll',
  celo: 'celo',
  btc: 'bitcoin',
  bitcoin: 'bitcoin'
};

/** Resolve an exchange network label to a chain name. */
function resolveChainFromNetworkCode(code: string | undefined | null): string | null {
  if (!code) {
    return null;
  }
  const key = code.toLowerCase().trim().replace(/[\s_-]+/g, '');
  return NETWORK_CODE_TO_CHAIN[key]
    ?? NETWORK_CODE_TO_CHAIN[code.toLowerCase().trim()]
    ?? normalizeChain(code);
}

/** Numeric chain IDs for the EVM networks this project reports. */
const EVM_CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  optimism: 10,
  cronos: 25,
  bsc: 56,
  polygon: 137,
  zksync: 324,
  base: 8453,
  arbitrum: 42161,
  avalanche: 43114,
  celo: 42220,
  linea: 59144,
  scroll: 534352,
  fantom: 250
};

export interface NetworkInfo {
  network: string;        // Exchange-specific network code (e.g., 'ETH', 'BSC', 'SOL')
  blockchain: string;     // Normalized blockchain name (e.g., 'ethereum', 'bsc')
  contractAddress?: string;
  chainId?: number;
  depositEnabled: boolean;
  withdrawEnabled: boolean;
  isDefault: boolean;
  withdrawFee: number;
  minWithdraw: number;
  confirmations: number;
  name?: string;          // Human-readable network name
}

export interface ExchangeNetworkInfo {
  symbol: string;
  networks: NetworkInfo[];
  mainNetwork?: string;   // Primary/native blockchain
  timestamp: Date;
  exchange: string;
  confidence: number;     // 0-100 confidence score
}

export class BlockchainScanner {
  private static instance: BlockchainScanner | null = null;

  private exchangeManager: ExchangeManager;
  private networkCache: Map<string, ExchangeNetworkInfo[]> = new Map();
  private contractToChain: Map<string, string> = new Map();
  private lastScanTime: Date | null = null;
  /** In-flight scan, so concurrent callers share one pass over the exchanges. */
  private scanInFlight: Promise<unknown> | null = null;

  /** Withdrawal configurations change rarely; re-reading them hourly is plenty. */
  private static readonly CACHE_TTL_MS = 6 * 60 * 60 * 1000;

  constructor() {
    this.exchangeManager = ExchangeManager.getInstance();
  }

  public static getInstance(): BlockchainScanner {
    if (!BlockchainScanner.instance) {
      BlockchainScanner.instance = new BlockchainScanner();
    }
    return BlockchainScanner.instance;
  }

  /**
   * Make sure the cache holds a recent scan, running one if not.
   *
   * Concurrent callers await the same pass rather than each hammering every
   * exchange, and a failed scan is not cached as success.
   */
  public async ensureFresh(): Promise<void> {
    const age = this.lastScanTime ? Date.now() - this.lastScanTime.getTime() : Infinity;
    if (this.networkCache.size > 0 && age < BlockchainScanner.CACHE_TTL_MS) {
      return;
    }

    if (!this.scanInFlight) {
      this.scanInFlight = this.scanAllExchanges()
        .catch(error => {
          console.warn('⚠️ [BLOCKCHAIN-SCAN] Scan failed:', error instanceof Error ? error.message : error);
        })
        .finally(() => {
          this.scanInFlight = null;
        });
    }

    await this.scanInFlight;
  }

  /**
   * Resolve a symbol against exchange withdrawal data, scanning first if the
   * cache is cold or stale.
   */
  public async resolveSymbolFresh(symbol: string): Promise<ReturnType<BlockchainScanner['resolveSymbol']>> {
    await this.ensureFresh();
    return this.resolveSymbol(symbol);
  }

  /**
   * Scan all connected exchanges for network/blockchain information
   */
  async scanAllExchanges(): Promise<Map<string, ExchangeNetworkInfo[]>> {
    console.log('🔍 Starting blockchain scan across all exchanges...');
    const results = new Map<string, ExchangeNetworkInfo[]>();

    const adapters = this.exchangeManager['adapters'] as Map<string, ExchangeAdapter>;
    
    // Parallel scan all exchanges
    const scanPromises = Array.from(adapters.entries()).map(async ([exchangeName, adapter]) => {
      try {
        if (!adapter.isConnected()) {
          console.log(`   ⚠️ ${exchangeName} not connected, skipping...`);
          return null;
        }

        console.log(`   📡 Scanning ${exchangeName}...`);
        const networkInfo = await this.scanExchangeNetworks(exchangeName, adapter);
        
        if (networkInfo && networkInfo.length > 0) {
          results.set(exchangeName, networkInfo);
          // Keyed by exchange so resolveSymbol() can read it. The previous key
          // included Date.now(), so every write landed under a key nothing
          // would ever look up again.
          this.networkCache.set(exchangeName, networkInfo);
        }

        return networkInfo;
      } catch (error) {
        console.error(`   ❌ Failed to scan ${exchangeName}:`, error);
        return null;
      }
    });

    await Promise.allSettled(scanPromises);
    this.lastScanTime = new Date();

    // Build contract address to chain mapping
    this.buildContractMapping(results);

    console.log(`✅ Blockchain scan complete. Scanned ${results.size} exchanges`);
    return results;
  }

  /**
   * Scan a specific exchange for network information
   */
  /**
   * Read withdrawal networks for every currency an exchange lists.
   *
   * This replaces a placeholder that walked loadMarkets(). Markets describe
   * trading pairs and carry no chain or contract data at all, so the old code
   * could only ever return null - which it did, on every exchange.
   *
   * fetchCurrencies() is the endpoint that actually answers the question:
   * it returns, per currency, the networks the exchange will deposit and
   * withdraw on, and for token networks the contract address it uses. That is
   * the exchange stating which contract it will actually move - the same fact
   * an arbitrage transfer depends on.
   *
   * On Binance, OKX, Bybit and MEXC this endpoint requires API credentials;
   * ccxt returns undefined rather than throwing when they are absent. KuCoin
   * and Gate.io serve it publicly, so useful data arrives even with no keys
   * configured at all.
   */
  private async scanExchangeNetworks(
    exchange: string,
    adapter: ExchangeAdapter
  ): Promise<ExchangeNetworkInfo[] | null> {
    const ccxtExchange = (adapter as any).exchange;

    if (!ccxtExchange || typeof ccxtExchange.fetchCurrencies !== 'function') {
      console.log(`   ⚠️ ${exchange}: no ccxt instance available`);
      return null;
    }

    if (ccxtExchange.has && ccxtExchange.has['fetchCurrencies'] === false) {
      console.log(`   ⚠️ ${exchange}: does not support fetchCurrencies`);
      return null;
    }

    let currencies: Record<string, any> | undefined;
    try {
      currencies = await ccxtExchange.fetchCurrencies();
    } catch (error) {
      console.warn(`   ❌ ${exchange}: fetchCurrencies failed -`, error instanceof Error ? error.message : error);
      return null;
    }

    // ccxt returns undefined (not an error) when the endpoint needs keys the
    // exchange was not given. Say so plainly - it is the actionable case.
    if (!currencies || Object.keys(currencies).length === 0) {
      const authenticated = Boolean(ccxtExchange.apiKey && ccxtExchange.secret);
      console.log(
        authenticated
          ? `   ⚠️ ${exchange}: fetchCurrencies returned nothing`
          : `   ⚠️ ${exchange}: fetchCurrencies needs API credentials - set ${exchange.toUpperCase()}_API_KEY/_API_SECRET to include it`
      );
      return null;
    }

    const results: ExchangeNetworkInfo[] = [];
    let withContract = 0;

    for (const [code, currency] of Object.entries(currencies)) {
      const networks = this.parseCurrencyNetworks(currency);
      if (networks.length === 0) {
        continue;
      }

      withContract += networks.filter(n => n.contractAddress).length;

      const primary = networks.find(n => n.isDefault) || networks[0];
      results.push({
        symbol: code,
        networks,
        mainNetwork: primary.blockchain,
        timestamp: new Date(),
        exchange,
        // Straight from the exchange's own withdrawal configuration.
        confidence: 95
      });
    }

    console.log(`   ✅ ${exchange}: ${results.length} currencies, ${withContract} network entries carry a contract address`);
    return results.length > 0 ? results : null;
  }

  /**
   * Turn one ccxt currency's `networks` map into our NetworkInfo list.
   *
   * ccxt normalises the common fields but leaves the raw exchange payload in
   * `info`, which is where contract addresses live under a different name on
   * each venue - hence the candidate list rather than one field.
   */
  private parseCurrencyNetworks(currency: any): NetworkInfo[] {
    const networksMap = currency?.networks;
    if (!networksMap || typeof networksMap !== 'object') {
      return [];
    }

    const parsed: NetworkInfo[] = [];

    for (const [networkCode, raw] of Object.entries<any>(networksMap)) {
      const blockchain = resolveChainFromNetworkCode(networkCode)
        || resolveChainFromNetworkCode(raw?.network)
        || resolveChainFromNetworkCode(raw?.id)
        || resolveChainFromNetworkCode(raw?.info?.chain)
        || resolveChainFromNetworkCode(raw?.info?.chainId);

      if (!blockchain) {
        continue;
      }

      const contractAddress = BlockchainScanner.extractContractAddress(raw?.info);

      parsed.push({
        network: networkCode,
        blockchain,
        contractAddress,
        chainId: EVM_CHAIN_IDS[blockchain],
        depositEnabled: raw?.deposit !== false,
        withdrawEnabled: raw?.withdraw !== false,
        isDefault: false,
        withdrawFee: Number(raw?.fee) || 0,
        minWithdraw: Number(raw?.limits?.withdraw?.min) || 0,
        confirmations: Number(raw?.info?.confirms ?? raw?.info?.minConfirm) || 0,
        name: raw?.info?.name || networkCode
      });
    }

    // Prefer a network that can actually move funds and names a contract.
    const preferred = parsed.find(n => n.depositEnabled && n.withdrawEnabled && n.contractAddress)
      || parsed.find(n => n.depositEnabled && n.withdrawEnabled)
      || parsed[0];
    if (preferred) {
      preferred.isDefault = true;
    }

    return parsed;
  }

  /**
   * Pull a contract address out of a raw exchange network payload.
   *
   * Returns undefined unless the value actually looks like an address, so an
   * empty string or a placeholder does not get stored as if it were one.
   */
  private static extractContractAddress(info: any): string | undefined {
    if (!info || typeof info !== 'object') {
      return undefined;
    }

    for (const field of CONTRACT_ADDRESS_FIELDS) {
      const value = info[field];
      if (typeof value !== 'string') {
        continue;
      }

      const trimmed = value.trim();
      if (trimmed.length < 20 || trimmed.length > 120) {
        continue; // too short or too long to be a token address
      }
      if (/^(null|none|n\/a|-)$/i.test(trimmed)) {
        continue;
      }
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        continue; // explorer link, not the address itself
      }

      return trimmed;
    }

    return undefined;
  }

  /**
   * Look up what the exchanges said about one ticker symbol.
   *
   * Reads the last scan's results. Returns the network that a transfer would
   * actually use - deposit and withdrawal both open - preferring one that
   * names a contract address.
   */
  public resolveSymbol(symbol: string): { blockchain: string; contractAddress?: string; chainId?: number; exchange: string } | null {
    const base = (symbol || '').split('/')[0].trim().toUpperCase();
    if (!base) {
      return null;
    }

    let fallback: { blockchain: string; contractAddress?: string; chainId?: number; exchange: string } | null = null;

    for (const [exchange, entries] of this.networkCache.entries()) {
      for (const entry of entries) {
        if (entry.symbol.toUpperCase() !== base) {
          continue;
        }

        for (const network of entry.networks) {
          if (!network.depositEnabled || !network.withdrawEnabled) {
            continue;
          }

          const candidate = {
            blockchain: network.blockchain,
            contractAddress: network.contractAddress,
            chainId: network.chainId,
            exchange
          };

          // An answer carrying a contract address wins outright.
          if (network.contractAddress) {
            return candidate;
          }
          fallback = fallback || candidate;
        }
      }
    }

    return fallback;
  }
  /**
   * Detect blockchain from contract address format
   */
  private detectChainFromContract(address: string): string | null {
    if (!address || address.length === 0) {
      return null;
    }

    // Ethereum-compatible (0x prefixed, 40 hex chars)
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
      // Could be ETH, BSC, Polygon, etc.
      // Will need additional context
      return null; // Ambiguous - needs context
    }
    
    // Solana (base58, 32-44 chars)
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      return 'solana';
    }
    
    // Tron (base58, starts with T)
    if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) {
      return 'tron';
    }

    return null;
  }

  /**
   * Reconcile network data from multiple exchanges
   */
  reconcileNetworkData(
    allData: Map<string, ExchangeNetworkInfo[]>
  ): Map<string, ExchangeNetworkInfo> {
    const reconciled = new Map<string, ExchangeNetworkInfo>();

    // Group by symbol
    const symbolGroups = new Map<string, ExchangeNetworkInfo[]>();
    
    for (const exchangeData of allData.values()) {
      for (const info of exchangeData) {
        if (!symbolGroups.has(info.symbol)) {
          symbolGroups.set(info.symbol, []);
        }
        symbolGroups.get(info.symbol)!.push(info);
      }
    }

    // Reconcile each symbol
    for (const [symbol, exchangeInfos] of symbolGroups.entries()) {
      const reconciledInfo = this.reconcileSymbolData(symbol, exchangeInfos);
      if (reconciledInfo) {
        reconciled.set(symbol, reconciledInfo);
      }
    }

    return reconciled;
  }

  /**
   * Reconcile data for a single symbol across exchanges
   */
  private reconcileSymbolData(
    symbol: string,
    exchangeInfos: ExchangeNetworkInfo[]
  ): ExchangeNetworkInfo | null {
    if (exchangeInfos.length === 0) {
      return null;
    }

    // Collect all networks from all exchanges
    const networkMap = new Map<string, NetworkInfo[]>();
    
    for (const info of exchangeInfos) {
      for (const network of info.networks) {
        const blockchain = network.blockchain;
        if (!networkMap.has(blockchain)) {
          networkMap.set(blockchain, []);
        }
        networkMap.get(blockchain)!.push(network);
      }
    }

    // Aggregate networks
    const aggregatedNetworks: NetworkInfo[] = [];
    
    for (const networks of networkMap.values()) {
      // Use the most common network info
      const bestNetwork = this.selectBestNetwork(networks);
      aggregatedNetworks.push(bestNetwork);
    }

    // Determine primary network
    const primaryNetwork = this.determinePrimaryNetwork(aggregatedNetworks, exchangeInfos);

    // Calculate confidence score
    const confidence = this.calculateConfidence(exchangeInfos, aggregatedNetworks);

    return {
      symbol,
      networks: aggregatedNetworks,
      mainNetwork: primaryNetwork,
      timestamp: new Date(),
      exchange: 'multi', // Multiple exchanges
      confidence
    };
  }

  /**
   * Select the best network info from multiple sources
   */
  private selectBestNetwork(networks: NetworkInfo[]): NetworkInfo {
    // Prefer networks that are default, have lower fees, and more confirmations
    const scored = networks.map(network => ({
      network,
      score: (network.isDefault ? 10 : 0) + 
             (10 / (network.withdrawFee + 1)) + 
             (network.confirmations / 10)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0].network;
  }

  /**
   * Determine primary blockchain for a token
   */
  private determinePrimaryNetwork(
    networks: NetworkInfo[],
    exchangeInfos: ExchangeNetworkInfo[]
  ): string {
    // Check known tokens first
    const symbol = exchangeInfos[0].symbol.toUpperCase();
    if (BLOCKCHAIN_CONFIG.knownTokens[symbol]) {
      return BLOCKCHAIN_CONFIG.knownTokens[symbol].primary;
    }

    // Score networks based on various factors
    const scores = new Map<string, number>();

    for (const network of networks) {
      const blockchain = network.blockchain;
      let score = scores.get(blockchain) || 0;

      // Default network gets higher score
      if (network.isDefault) score += 50;

      // More confirmations = more established
      score += Math.min(network.confirmations, 20);

      // Lower fees = more active
      score += 10 / (network.withdrawFee + 1);

      // Active on both deposit and withdraw
      if (network.depositEnabled && network.withdrawEnabled) score += 20;

      scores.set(blockchain, score);
    }

    // Add priority bonus
    BLOCKCHAIN_CONFIG.chainPriority.forEach((chain, index) => {
      if (scores.has(chain)) {
        scores.set(chain, (scores.get(chain) || 0) + (BLOCKCHAIN_CONFIG.chainPriority.length - index));
      }
    });

    // Return highest scoring blockchain
    const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : networks[0]?.blockchain || 'ethereum';
  }

  /**
   * Calculate confidence score for blockchain detection
   */
  private calculateConfidence(
    exchangeInfos: ExchangeNetworkInfo[],
    networks: NetworkInfo[]
  ): number {
    let score = 0;

    // More exchanges agreeing increases confidence
    score += Math.min(exchangeInfos.length * 15, 60);

    // More networks found increases confidence
    score += Math.min(networks.length * 5, 20);

    // Check if known token
    const symbol = exchangeInfos[0].symbol.toUpperCase();
    if (BLOCKCHAIN_CONFIG.knownTokens[symbol]) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Build contract address to blockchain mapping
   */
  private buildContractMapping(
    exchangeData: Map<string, ExchangeNetworkInfo[]>
  ): void {
    for (const exchangeInfos of exchangeData.values()) {
      for (const info of exchangeInfos) {
        for (const network of info.networks) {
          if (network.contractAddress) {
            const detected = this.detectChainFromContract(network.contractAddress);
            if (detected) {
              this.contractToChain.set(network.contractAddress.toLowerCase(), detected);
            } else {
              // Use the network's blockchain if contract detection failed
              this.contractToChain.set(
                network.contractAddress.toLowerCase(),
                network.blockchain
              );
            }
          }
        }
      }
    }
  }

  /**
   * Get blockchain from contract address
   */
  getBlockchainFromContract(address: string): string | null {
    return this.contractToChain.get(address.toLowerCase()) || null;
  }

  /**
   * Get last scan time
   */
  getLastScanTime(): Date | null {
    return this.lastScanTime;
  }
}

