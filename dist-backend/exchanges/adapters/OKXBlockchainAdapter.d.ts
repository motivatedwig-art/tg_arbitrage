/**
 * OKX Blockchain Network Adapter
 * Fetches network/blockchain information from OKX API
 */
export interface OKXNetworkInfo {
    symbol: string;
    networks: {
        chain: string;
        blockchain: string;
        contractAddress?: string;
        canDeposit: boolean;
        canWithdraw: boolean;
        withdrawFee: number;
        minWithdraw: number;
        maxWithdraw?: number;
    }[];
}
export declare class OKXBlockchainAdapter {
    private exchange;
    private apiKey;
    private apiSecret;
    private passphrase;
    constructor(apiKey?: string, apiSecret?: string, passphrase?: string);
    /**
     * Fetch currency chain information from OKX
     * Uses /api/v5/asset/currencies endpoint
     */
    fetchCurrencyChains(): Promise<Map<string, OKXNetworkInfo>>;
    /**
     * Map OKX chain codes to standardized blockchain names
     */
    private mapChainToBlockchain;
    /**
     * Get network info for a specific currency
     */
    getCurrencyChains(symbol: string): Promise<OKXNetworkInfo | null>;
}
//# sourceMappingURL=OKXBlockchainAdapter.d.ts.map