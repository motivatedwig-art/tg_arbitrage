import { ArbitrageOpportunity } from '../exchanges/types/index.js';
import { ContractDataRecord } from '../database/types.js';
/** Where a piece of contract metadata came from. Drives how much we trust it. */
type ContractDataSource = 'exchange' | 'dexscreener' | 'claude' | 'none';
/**
 * ContractDataService - contract metadata enrichment
 *
 * Source priority, highest trust first:
 *
 * 1. Exchange withdrawal configuration (ccxt fetchCurrencies). The venue
 *    states the chain and contract address it will actually move funds on -
 *    which is precisely what an arbitrage transfer depends on. Available
 *    without credentials on KuCoin and Gate.io; Binance, OKX, Bybit and MEXC
 *    serve this endpoint only to authenticated callers.
 * 2. DexScreener - a real index lookup. Returns an address that exists on a
 *    chain, and the answer is reproducible.
 * 3. Claude - recall only. No web_search or web_fetch tool is attached to
 *    these requests, so the model cannot consult Etherscan or any other
 *    explorer; it can only remember or guess. Used when both real sources come
 *    up empty, and its output is never recorded as verified.
 *
 * This order was previously inverted: DexScreener was disabled by default, the
 * exchange scanner was a placeholder that returned nothing, and the model was
 * described as the primary source. Because a wrong contract address costs a
 * user real funds, an unknown address is preferred to a confident guess.
 */
export declare class ContractDataService {
    private static instance;
    private db;
    private readonly enabled;
    private readonly batchSize;
    private readonly rateLimitDelay;
    private constructor();
    static getInstance(): ContractDataService;
    processBatch(opportunities: ArbitrageOpportunity[]): Promise<void>;
    ensureContractDataBySymbol(symbol: string): Promise<{
        opportunity: ArbitrageOpportunity | null;
        record: ContractDataRecord | null;
    }>;
    private extractAndEnrichOpportunity;
    private extractAndStoreContractData;
    private opportunityToRecord;
    /**
     * Resolve contract metadata, preferring a source that can actually be checked.
     *
     * Order matters. DexScreener queries a real index and returns an address that
     * exists on a chain. A language model has no network access here - no
     * web_search or web_fetch tool is attached - so it can only recall or invent
     * one, and an invented contract address is worse than no address at all.
     * Claude therefore runs only when DexScreener has nothing.
     */
    resolveContractData(opportunity: ArbitrageOpportunity): Promise<{
        record: ContractDataRecord;
        source: ContractDataSource;
        failed: boolean;
    }>;
    private buildDescription;
    private delay;
}
export {};
//# sourceMappingURL=ContractDataService.d.ts.map