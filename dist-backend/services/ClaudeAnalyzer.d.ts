interface ArbitrageOpportunity {
    symbol: string;
    chain: string;
    spread_percentage: number;
    buy_exchange: string;
    buy_price: number;
    sell_exchange: string;
    sell_price: number;
    liquidity_usd: number;
    volume_24h: number;
    gas_cost_usd: number;
}
/** Why a lookup could not be completed, as opposed to completing and finding nothing. */
export interface ContractDataError {
    kind: 'auth' | 'permission' | 'model_not_found' | 'rate_limit' | 'bad_request' | 'server' | 'timeout' | 'connection' | 'truncated' | 'refused' | 'unreadable' | 'disabled' | 'unknown';
    detail: string;
    /** True when trying the same request again later could succeed. */
    retryable: boolean;
}
interface ContractDataResponse {
    contract_address: string | null;
    chain_id: number | null;
    chain_name: string | null;
    is_verified: boolean | null;
    decimals: number | null;
    /**
     * Present only when the lookup failed. All-null fields with no `error` means
     * the lookup succeeded and genuinely found nothing - a real answer that can
     * be cached and stored. All-null fields WITH an `error` means we learned
     * nothing, and callers must not record that as "already extracted".
     */
    error?: ContractDataError;
}
interface CostMetrics {
    total_requests: number;
    cached_requests: number;
    estimated_cost: number;
    last_reset: number;
}
export declare class ClaudeAnalyzer {
    private client;
    private missingKeyWarningLogged;
    private analysisPrompt;
    private contractPrompt;
    private config;
    private analysisCache;
    private cacheTtl;
    private pricing;
    private structuredOutputsEnabled;
    private costMetrics;
    constructor();
    /**
     * Look up per-million-token pricing for the configured model.
     * Falls back to the Haiku tier and says so, rather than silently reporting
     * costs computed from a price that belongs to a different model.
     */
    private static resolvePricing;
    /**
     * Resolve the API key at call time rather than at construction time, so that
     * a key exported after this module was first imported is still picked up.
     */
    private resolveApiKey;
    /**
     * True when AI enrichment can actually run. Callers should check this and
     * fall back to a non-AI path instead of relying on the request failing.
     */
    isEnabled(): boolean;
    /**
     * Lazily construct the SDK client. Returns null - never throws - when no key
     * is configured, so a missing key degrades AI enrichment instead of taking
     * down whatever imported this module.
     */
    private getClient;
    private createAnalysisPrompt;
    private getCachedAnalysis;
    analyzeOpportunity(opportunity: ArbitrageOpportunity): Promise<string>;
    batchAnalyze(opportunities: ArbitrageOpportunity[]): Promise<Map<string, string>>;
    getCostMetrics(): CostMetrics;
    resetCostMetrics(): void;
    clearCache(): void;
    extractContractData(tokenSymbol: string, tokenDescription: string): Promise<ContractDataResponse>;
    /**
     * The "we could not determine anything" result. Callers treat every field
     * being null as "no contract data", which is the safe outcome.
     */
    private emptyContractData;
    /**
     * Classify an SDK error into something a caller can act on.
     *
     * Both call sites previously used a single broad catch, so a bad API key, a
     * 429, a network blip and a genuinely absent token all produced the same
     * all-null result. That made "we are rate limited" indistinguishable from
     * "this token has no contract", both in the logs and in the database.
     *
     * Ordered most-specific first: the timeout and 5xx classes are subclasses of
     * APIConnectionError and APIError respectively.
     */
    private static describeApiError;
    /**
     * Issue the contract-extraction request with a JSON schema attached, so the
     * API constrains the output shape instead of relying on the prompt alone.
     *
     * Structured outputs are not available on every model or account. If the API
     * rejects output_config, this falls back to a plain request for the rest of
     * the process lifetime - the prompt still asks for JSON and the parser still
     * handles fences and surrounding prose, so the fallback path is functional,
     * just less strongly guaranteed.
     */
    private createContractMessage;
    /**
     * Distinguish "this account/model does not support output_config" from a
     * genuine request error, so a real bug is not silently downgraded.
     */
    private static isStructuredOutputRejection;
    /**
     * Concatenate every text block in the response.
     *
     * Reading content[0] blindly (as this class used to) breaks as soon as the
     * response leads with a non-text block, and drops content when the model
     * emits more than one text block.
     */
    private static extractTextContent;
    /**
     * Decide whether a response finished cleanly.
     *
     * A truncated or refused response is HTTP 200 with a normal body, so without
     * this check it looked like a successful call that happened to contain
     * unparseable content - the failure mode that made every symptom here look
     * like "the token has no contract data".
     */
    private static describeIncompleteStop;
    /**
     * Pull the first complete JSON object out of a model response.
     *
     * Handles the two shapes that used to break JSON.parse outright: a
     * ```json fenced block, and a bare object with explanatory prose around it.
     * Brace counting is string- and escape-aware so a '}' inside a value does
     * not terminate the scan early. Returns null when no complete object is
     * present - notably when the response was truncated mid-object.
     */
    private static extractJsonObject;
    /** Reject schema placeholders and empty strings that are not real values. */
    private static cleanString;
    /** Accept a number or a numeric string; reject anything else. */
    private static cleanNumber;
    /** Accept a real boolean or the strings "true"/"false"; reject anything else. */
    private static cleanBoolean;
    /**
     * Parse a contract-data response.
     *
     * Returns null when the response could not be read at all, as distinct from
     * a successfully-read response that simply found nothing (all fields null).
     * Callers need that distinction: the first must not be cached or trusted,
     * the second is a legitimate answer.
     */
    private parseContractData;
}
export declare const claudeAnalyzer: ClaudeAnalyzer;
export {};
//# sourceMappingURL=ClaudeAnalyzer.d.ts.map