/**
 * Bybit Blockchain Network Adapter
 * Fetches network/blockchain information from Bybit API
 */
export interface BybitNetworkInfo {
    symbol: string;
    networks: {
        chain: string;
        blockchain: string;
        contractAddress?: string;
        depositEnabled: boolean;
        withdrawEnabled: boolean;
        withdrawFee: number;
        minWithdraw: number;
        confirmations: number;
        chainType: string;
    }[];
}
export declare class BybitBlockchainAdapter {
    private exchange;
    private apiKey;
    private apiSecret;
    constructor(apiKey?: string, apiSecret?: string);
    /**
     * Fetch coin information from Bybit
     * Uses /v5/asset/coin/query-info endpoint
     */
    fetchCoinInfo(): Promise<Map<string, BybitNetworkInfo>>;
    /**
     * Normalize Bybit chain names to standardized blockchain names
     */
    private normalizeChainName;
    /**
     * Get network info for a specific coin
     */
    getCoinInfo(symbol: string): Promise<BybitNetworkInfo | null>;
}
//# sourceMappingURL=BybitBlockchainAdapter.d.ts.map