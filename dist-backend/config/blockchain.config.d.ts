/**
 * Blockchain detection configuration
 */
export interface KnownTokenConfig {
    primary: string;
    supported: string[];
}
export declare const BLOCKCHAIN_CONFIG: {
    scanning: {
        enabled: boolean;
        interval: number;
        exchanges: string[];
        confidenceThreshold: number;
        cacheDuration: number;
    };
    knownTokens: {
        USDT: KnownTokenConfig;
        USDC: KnownTokenConfig;
        BTC: KnownTokenConfig;
        ETH: KnownTokenConfig;
    };
    chainPriority: string[];
    exchangeNetworkMapping: {
        binance: {
            ETH: string;
            ERC20: string;
            BSC: string;
            BEP20: string;
            BEP2: string;
            POLYGON: string;
            MATIC: string;
            AVAX: string;
            AVAXC: string;
            AVALANCHE: string;
            ARB: string;
            ARBITRUM: string;
            OP: string;
            OPTIMISM: string;
            SOL: string;
            SOLANA: string;
            TRX: string;
            TRC20: string;
            TRON: string;
            FTM: string;
            FANTOM: string;
            BASE: string;
            SUI: string;
            APT: string;
            APTOS: string;
            TON: string;
            NEAR: string;
        };
        okx: {
            ETH: string;
            ERC20: string;
            BSC: string;
            BEP20: string;
            POLYGON: string;
            MATIC: string;
            AVAX: string;
            ARB: string;
            OP: string;
            SOL: string;
            TRX: string;
            TRC20: string;
        };
        bybit: {
            ETH: string;
            ERC20: string;
            BSC: string;
            BEP20: string;
            POLYGON: string;
            MATIC: string;
            AVAX: string;
            ARB: string;
            OP: string;
            SOL: string;
            TRX: string;
        };
    };
};
//# sourceMappingURL=blockchain.config.d.ts.map