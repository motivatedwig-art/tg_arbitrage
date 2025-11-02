interface CoinApiAssetMetadata {
    asset_id: string;
    name: string;
    type_is_crypto: number;
    data_start?: string;
    data_end?: string;
    data_quote_start?: string;
    data_quote_end?: string;
    data_orderbook_start?: string;
    data_orderbook_end?: string;
    data_trade_start?: string;
    data_trade_end?: string;
    data_symbols_count?: number;
    volume_1hrs_usd?: number;
    volume_1day_usd?: number;
    volume_1mth_usd?: number;
    price_usd?: number;
    id_icon?: string;
    platform?: {
        name?: string;
        symbol?: string;
        token_address?: string;
    };
}
export declare class CoinApiService {
    private static instance;
    private assetCache;
    private iconCache;
    private iconBase;
    private constructor();
    static getInstance(): CoinApiService;
    getAssetMetadata(symbol: string): Promise<CoinApiAssetMetadata | null>;
    getAssetIconUrl(asset: CoinApiAssetMetadata): string | null;
    getFallbackIconUrl(symbol: string): string;
    getPlatformTokenAddress(symbol: string): Promise<string | null>;
    getExplorerUrl(symbol: string): Promise<string | null>;
}
export {};
//# sourceMappingURL=CoinApiService.d.ts.map