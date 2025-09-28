export interface Exchange {
    id: string;
    name: string;
    displayName: string;
    logo: string;
    isSelected: boolean;
    baseUrl: string;
    pairUrlPattern: string;
}
export interface CryptoPair {
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
    displaySymbol: string;
}
export interface ExchangePrice {
    exchangeId: string;
    exchangeName: string;
    price: number;
    volume: number;
    url: string;
    lastUpdated: string;
}
export interface ArbitrageOpportunity {
    pair: CryptoPair;
    prices: ExchangePrice[];
    bestBuy: ExchangePrice;
    bestSell: ExchangePrice;
    spreadPercentage: number;
    spreadAmount: number;
    profitability: 'high' | 'medium' | 'low';
}
export interface ApiResponse {
    opportunities: ArbitrageOpportunity[];
    lastUpdate: string;
    nextUpdate: string;
    meta?: OpportunitiesMeta;
}
export interface ExchangeMeta {
    id: string;
    name: string;
    logo?: string | null;
    pairUrlPattern?: string | null;
}
export interface OpportunitiesMeta {
    exchanges: ExchangeMeta[];
    requestedSymbols: string[];
    returnedSymbols: string[];
    opportunityCount: number;
    generatedAt: string;
}
export interface TelegramWebApp {
    ready: () => void;
    expand: () => void;
    close: () => void;
    MainButton: {
        text: string;
        show: () => void;
        hide: () => void;
        onClick: (callback: () => void) => void;
    };
    themeParams: {
        bg_color: string;
        text_color: string;
        hint_color: string;
        link_color: string;
        button_color: string;
        button_text_color: string;
    };
    initDataUnsafe?: {
        user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
        };
    };
}
declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
    }
}
//# sourceMappingURL=index.d.ts.map