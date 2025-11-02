/**
 * Binance Blockchain Network Adapter
 * Fetches network/blockchain information from Binance API
 */
export interface BinanceNetworkInfo {
    symbol: string;
    networks: {
        network: string;
        blockchain: string;
        contractAddress?: string;
        isDefault: boolean;
        depositEnabled: boolean;
        withdrawEnabled: boolean;
        withdrawFee: number;
        minWithdraw: number;
        confirmations: number;
        name: string;
    }[];
}
export declare class BinanceBlockchainAdapter {
    private exchange;
    private apiKey;
    private apiSecret;
    constructor(apiKey?: string, apiSecret?: string);
    /**
     * Fetch coin network information from Binance
     * Uses /sapi/v1/capital/config/getall endpoint
     */
    fetchCoinNetworks(): Promise<Map<string, BinanceNetworkInfo>>;
    /**
     * Map Binance network codes to standardized blockchain names
     */
    private mapNetworkToBlockchain;
    /**
     * Get network info for a specific coin
     */
    getCoinNetworks(symbol: string): Promise<BinanceNetworkInfo | null>;
}
//# sourceMappingURL=BinanceBlockchainAdapter.d.ts.map