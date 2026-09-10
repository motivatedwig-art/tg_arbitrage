/**
 * Blockchain Scanner Service
 * Scans exchanges to determine which blockchain each token belongs to
 */
export interface NetworkInfo {
    network: string;
    blockchain: string;
    contractAddress?: string;
    chainId?: number;
    depositEnabled: boolean;
    withdrawEnabled: boolean;
    isDefault: boolean;
    withdrawFee: number;
    minWithdraw: number;
    confirmations: number;
    name?: string;
}
export interface ExchangeNetworkInfo {
    symbol: string;
    networks: NetworkInfo[];
    mainNetwork?: string;
    timestamp: Date;
    exchange: string;
    confidence: number;
}
export declare class BlockchainScanner {
    private static instance;
    private exchangeManager;
    private networkCache;
    private contractToChain;
    private lastScanTime;
    /** In-flight scan, so concurrent callers share one pass over the exchanges. */
    private scanInFlight;
    /** Withdrawal configurations change rarely; re-reading them hourly is plenty. */
    private static readonly CACHE_TTL_MS;
    constructor();
    static getInstance(): BlockchainScanner;
    /**
     * Make sure the cache holds a recent scan, running one if not.
     *
     * Concurrent callers await the same pass rather than each hammering every
     * exchange, and a failed scan is not cached as success.
     */
    ensureFresh(): Promise<void>;
    /**
     * Resolve a symbol against exchange withdrawal data, scanning first if the
     * cache is cold or stale.
     */
    resolveSymbolFresh(symbol: string): Promise<ReturnType<BlockchainScanner['resolveSymbol']>>;
    /**
     * Scan all connected exchanges for network/blockchain information
     */
    scanAllExchanges(): Promise<Map<string, ExchangeNetworkInfo[]>>;
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
    private scanExchangeNetworks;
    /**
     * Turn one ccxt currency's `networks` map into our NetworkInfo list.
     *
     * ccxt normalises the common fields but leaves the raw exchange payload in
     * `info`, which is where contract addresses live under a different name on
     * each venue - hence the candidate list rather than one field.
     */
    private parseCurrencyNetworks;
    /**
     * Pull a contract address out of a raw exchange network payload.
     *
     * Returns undefined unless the value actually looks like an address, so an
     * empty string or a placeholder does not get stored as if it were one.
     */
    private static extractContractAddress;
    /**
     * Look up what the exchanges said about one ticker symbol.
     *
     * Reads the last scan's results. Returns the network that a transfer would
     * actually use - deposit and withdrawal both open - preferring one that
     * names a contract address.
     */
    resolveSymbol(symbol: string): {
        blockchain: string;
        contractAddress?: string;
        chainId?: number;
        exchange: string;
    } | null;
    /**
     * Detect blockchain from contract address format
     */
    private detectChainFromContract;
    /**
     * Reconcile network data from multiple exchanges
     */
    reconcileNetworkData(allData: Map<string, ExchangeNetworkInfo[]>): Map<string, ExchangeNetworkInfo>;
    /**
     * Reconcile data for a single symbol across exchanges
     */
    private reconcileSymbolData;
    /**
     * Select the best network info from multiple sources
     */
    private selectBestNetwork;
    /**
     * Determine primary blockchain for a token
     */
    private determinePrimaryNetwork;
    /**
     * Calculate confidence score for blockchain detection
     */
    private calculateConfidence;
    /**
     * Build contract address to blockchain mapping
     */
    private buildContractMapping;
    /**
     * Get blockchain from contract address
     */
    getBlockchainFromContract(address: string): string | null;
    /**
     * Get last scan time
     */
    getLastScanTime(): Date | null;
}
//# sourceMappingURL=BlockchainScanner.d.ts.map