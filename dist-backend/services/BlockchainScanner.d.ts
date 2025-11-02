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
    private exchangeManager;
    private networkCache;
    private contractToChain;
    private lastScanTime;
    constructor();
    /**
     * Scan all connected exchanges for network/blockchain information
     */
    scanAllExchanges(): Promise<Map<string, ExchangeNetworkInfo[]>>;
    /**
     * Scan a specific exchange for network information
     */
    private scanExchangeNetworks;
    /**
     * Extract network information from CCXT market object
     */
    private extractNetworkFromMarket;
    /**
     * Detect blockchain from contract address format
     */
    private detectChainFromContract;
    /**
     * Basic blockchain detection from symbol (fallback)
     */
    private detectBlockchainFromSymbol;
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