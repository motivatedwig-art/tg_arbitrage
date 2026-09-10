import Anthropic from '@anthropic-ai/sdk';
import { config as appConfig } from '../config/environment.js';
/**
 * Published per-million-token prices, used only for the cost estimate in the
 * logs. Matched by prefix so dated snapshots resolve to their base model.
 * Longest prefix wins, so more specific entries take precedence.
 */
const MODEL_PRICING = [
    { prefix: 'claude-fable-5', input: 10.0, output: 50.0 },
    { prefix: 'claude-mythos-5', input: 10.0, output: 50.0 },
    { prefix: 'claude-opus-5', input: 5.0, output: 25.0 },
    { prefix: 'claude-opus-4', input: 5.0, output: 25.0 },
    { prefix: 'claude-sonnet-5', input: 2.0, output: 10.0 },
    { prefix: 'claude-sonnet-4', input: 3.0, output: 15.0 },
    { prefix: 'claude-haiku-4', input: 1.0, output: 5.0 },
    { prefix: 'claude-3-5-haiku', input: 0.8, output: 4.0 },
    { prefix: 'claude-3-haiku', input: 0.25, output: 1.25 }
];
/**
 * Schema handed to the API via output_config.format, which constrains the
 * model's output so it cannot come back as prose, a fenced code block, or a
 * half-finished object. The prompt-only approach this replaces produced all
 * three, and every one of them failed JSON.parse and was reported as
 * "no contract data found".
 */
const CONTRACT_DATA_SCHEMA = {
    type: 'object',
    properties: {
        contract_address: {
            type: ['string', 'null'],
            description: 'On-chain token contract address, or null if not known'
        },
        chain_id: {
            type: ['integer', 'null'],
            description: 'EVM chain ID (1 Ethereum, 56 BSC, 137 Polygon), or null'
        },
        chain_name: {
            type: ['string', 'null'],
            description: 'Human-readable network name, or null'
        },
        is_verified: {
            type: ['boolean', 'null'],
            description: 'Whether the contract source is verified on the explorer'
        },
        decimals: {
            type: ['integer', 'null'],
            description: 'Token decimals, or null if not known'
        }
    },
    required: ['contract_address', 'chain_id', 'chain_name', 'is_verified', 'decimals'],
    additionalProperties: false
};
// Values that mean "the model echoed the schema instead of answering".
// The previous prompt asked for `"chain_id": "number|null"`, which invited
// exactly this, and the placeholders were then stored as if they were data.
const PLACEHOLDER_VALUES = new Set([
    'string', 'number', 'boolean', 'null', 'none', 'n/a', 'na', 'unknown',
    'string|null', 'number|null', 'boolean|null', '0x...', '0x', '-', ''
]);
export class ClaudeAnalyzer {
    constructor() {
        // Created on first use, not in the constructor. This module exports a
        // singleton, so throwing during construction aborted the import of every
        // module that depends on it - which meant a missing ANTHROPIC_API_KEY took
        // down the entire bot instead of just disabling AI enrichment.
        this.client = null;
        this.missingKeyWarningLogged = false;
        this.analysisCache = new Map();
        // Cleared permanently if the API rejects output_config, so we stop paying a
        // failed request on every extraction.
        this.structuredOutputsEnabled = true;
        // Cost tracking
        this.costMetrics = {
            total_requests: 0,
            cached_requests: 0,
            estimated_cost: 0,
            last_reset: Date.now()
        };
        // Prompt for legacy opportunity analysis
        this.analysisPrompt = `Ты - эксперт по криптовалютному арбитражу. Анализируешь возможности и объясняешь рыночные неэффективности.

ПРАВИЛА:
1. Отвечай ТОЛЬКО на русском языке
2. Максимум 3-4 предложения
3. Только факты и цифры, без воды
4. Структура: ПРИЧИНА → РИСКИ → ДЕЙСТВИЕ
5. Используй эмодзи для визуализации: ✅❌⚠️🔥⏰💰
6. Никогда не используй вводные фразы типа "Давайте рассмотрим" или "Это интересная возможность"
7. Не повторяй данные из запроса - только анализ

ФОКУС АНАЛИЗА:
- Почему существует спред (ликвидность/новости/технические причины)
- Главный риск исполнения
- Реалистичность opportunity (да/нет + причина)`;
        // Prompt for contract metadata extraction
        this.contractPrompt = `Ты - эксперт по блокчейн данным. Твоя задача - извлекать точные данные о контрактах и сетях из описания токенов.

ПРАВИЛА:
1. Отвечай ТОЛЬКО в формате JSON
2. Извлекай ТОЛЬКО следующие данные:
   - contract_address: адрес контракта (0x...)
   - chain_id: ID сети (1 для Ethereum, 56 для BSC, 137 для Polygon и т.д.)
   - chain_name: название сети (Ethereum, Binance Smart Chain, Polygon)
   - is_verified: boolean, проверен ли контракт
   - decimals: количество decimals токена

3. Если данные не найдены, возвращай null для каждого поля
4. НИКАКОГО анализа или комментариев - только данные
5. Используй официальные источники: Etherscan, BscScan, Polygonscan`;
        // Request settings shared across prompts. These come from the environment
        // (CLAUDE_MODEL / CLAUDE_MAX_TOKENS / CLAUDE_CACHE_TTL) rather than being
        // hardcoded here - previously the config fields existed but were never
        // read, so setting those variables had no effect on the request at all.
        this.config = {
            model: appConfig.claudeModel,
            max_tokens: appConfig.claudeMaxTokens,
            temperature: 0, // Deterministic responses - extraction must not vary
        };
        this.cacheTtl = appConfig.claudeCacheTtl;
        this.pricing = ClaudeAnalyzer.resolvePricing(this.config.model);
        console.log(`🔧 [CLAUDE-ANALYZER] model=${this.config.model} max_tokens=${this.config.max_tokens} cache_ttl=${this.cacheTtl}s`);
    }
    /**
     * Look up per-million-token pricing for the configured model.
     * Falls back to the Haiku tier and says so, rather than silently reporting
     * costs computed from a price that belongs to a different model.
     */
    static resolvePricing(model) {
        const match = MODEL_PRICING
            .filter(entry => model.startsWith(entry.prefix))
            .sort((a, b) => b.prefix.length - a.prefix.length)[0];
        if (match) {
            return { input: match.input, output: match.output };
        }
        console.warn(`⚠️ [CLAUDE-ANALYZER] No pricing entry for model "${model}" - cost estimates will be approximate.`);
        return { input: 1.0, output: 5.0 };
    }
    /**
     * Resolve the API key at call time rather than at construction time, so that
     * a key exported after this module was first imported is still picked up.
     */
    resolveApiKey() {
        return (process.env.ANTHROPIC_API_KEY || '').trim();
    }
    /**
     * True when AI enrichment can actually run. Callers should check this and
     * fall back to a non-AI path instead of relying on the request failing.
     */
    isEnabled() {
        return this.resolveApiKey() !== '';
    }
    /**
     * Lazily construct the SDK client. Returns null - never throws - when no key
     * is configured, so a missing key degrades AI enrichment instead of taking
     * down whatever imported this module.
     */
    getClient() {
        if (this.client) {
            return this.client;
        }
        const apiKey = this.resolveApiKey();
        if (!apiKey) {
            if (!this.missingKeyWarningLogged) {
                console.warn('⚠️ [CLAUDE-ANALYZER] ANTHROPIC_API_KEY is not set - AI enrichment is disabled.');
                console.warn('   Set ANTHROPIC_API_KEY to enable opportunity analysis and contract extraction.');
                this.missingKeyWarningLogged = true;
            }
            return null;
        }
        this.client = new Anthropic({ apiKey });
        return this.client;
    }
    createAnalysisPrompt(opportunity) {
        return `Token: ${opportunity.symbol}
Chain: ${opportunity.chain}
Спред: ${opportunity.spread_percentage.toFixed(2)}%
Купить: ${opportunity.buy_exchange} $${opportunity.buy_price.toFixed(4)}
Продать: ${opportunity.sell_exchange} $${opportunity.sell_price.toFixed(4)}
Ликвидность: $${opportunity.liquidity_usd.toLocaleString()}
Объем 24ч: $${opportunity.volume_24h.toLocaleString()}
Gas (если DEX): $${opportunity.gas_cost_usd.toFixed(2)}
Анализ:`;
    }
    getCachedAnalysis(opportunity) {
        const cacheKey = `${opportunity.chain}:${opportunity.symbol}`;
        const cached = this.analysisCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < (this.cacheTtl * 1000)) {
            this.costMetrics.cached_requests++;
            return cached.analysis + " 📌[кеш]";
        }
        return null;
    }
    async analyzeOpportunity(opportunity) {
        const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const cacheKey = `${opportunity.chain}:${opportunity.symbol}`;
        // Check cache first
        const cachedAnalysis = this.getCachedAnalysis(opportunity);
        if (cachedAnalysis) {
            console.log(`📦 [CLAUDE-ANALYZER][${requestId}] Cache hit for ${opportunity.symbol} (${opportunity.chain})`);
            return cachedAnalysis;
        }
        // Cached results are still served above; only live calls need a client.
        const client = this.getClient();
        if (!client) {
            return '⚠️ AI-анализ недоступен: не задан ANTHROPIC_API_KEY';
        }
        // Format compact data for analysis
        const prompt = `Token: ${opportunity.symbol} (${opportunity.chain})
Спред: ${opportunity.spread_percentage.toFixed(2)}%
${opportunity.buy_exchange}: $${opportunity.buy_price.toFixed(4)} → ${opportunity.sell_exchange}: $${opportunity.sell_price.toFixed(4)}
Ликвидность: $${opportunity.liquidity_usd.toLocaleString()}
Gas: $${opportunity.gas_cost_usd.toFixed(2)}`;
        console.log(`🤖 [CLAUDE-ANALYZER][${requestId}] Analyzing opportunity for ${opportunity.symbol}`);
        console.log(`   Request: model=${this.config.model}, max_tokens=${this.config.max_tokens}, temp=${this.config.temperature}`);
        console.log(`   Prompt: ${prompt.substring(0, 100)}...`);
        try {
            const startTime = Date.now();
            const response = await client.messages.create({
                model: this.config.model,
                max_tokens: this.config.max_tokens,
                temperature: this.config.temperature,
                system: this.analysisPrompt,
                messages: [{ role: "user", content: prompt }]
            });
            const duration = Date.now() - startTime;
            const analysis = ClaudeAnalyzer.extractTextContent(response.content);
            // A refusal or an empty body is not a usable analysis; do not cache it.
            const incomplete = ClaudeAnalyzer.describeIncompleteStop(response.stop_reason);
            if (incomplete && response.stop_reason !== 'max_tokens') {
                console.error(`❌ [CLAUDE-ANALYZER][${requestId}] Incomplete analysis for ${opportunity.symbol}: ${incomplete}`);
                return `⚠️ Анализ недоступен: ${incomplete}`;
            }
            if (!analysis) {
                console.error(`❌ [CLAUDE-ANALYZER][${requestId}] Empty analysis body for ${opportunity.symbol} (stop_reason=${response.stop_reason})`);
                return '⚠️ Анализ недоступен: пустой ответ модели';
            }
            // A max_tokens cut-off still leaves usable prose, so it is kept - but say so.
            if (response.stop_reason === 'max_tokens') {
                console.warn(`⚠️ [CLAUDE-ANALYZER][${requestId}] Analysis truncated at max_tokens=${this.config.max_tokens} - raise CLAUDE_MAX_TOKENS`);
            }
            // Log response details
            console.log(`✅ [CLAUDE-ANALYZER][${requestId}] Analysis completed in ${duration}ms`);
            console.log(`   Response: ${analysis.substring(0, 150)}${analysis.length > 150 ? '...' : ''}`);
            console.log(`   Usage: input_tokens=${response.usage?.input_tokens || 0}, output_tokens=${response.usage?.output_tokens || 0}`);
            // Cache the result
            this.analysisCache.set(cacheKey, {
                analysis,
                timestamp: Date.now()
            });
            // Record cost metrics with actual token counts
            this.costMetrics.total_requests++;
            const inputTokens = response.usage?.input_tokens || 150;
            const outputTokens = response.usage?.output_tokens || 50;
            const inputCost = (inputTokens / 1000000) * this.pricing.input;
            const outputCost = (outputTokens / 1000000) * this.pricing.output;
            this.costMetrics.estimated_cost += inputCost + outputCost;
            console.log(`💰 [CLAUDE-ANALYZER][${requestId}] Cost: $${(inputCost + outputCost).toFixed(6)} (total: $${this.costMetrics.estimated_cost.toFixed(4)})`);
            return analysis;
        }
        catch (error) {
            const classified = ClaudeAnalyzer.describeApiError(error, this.config.model);
            console.error(`❌ [CLAUDE-ANALYZER][${requestId}] API error for ${opportunity.symbol}`);
            console.error(`   Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
            console.error(`   Classified as: ${classified.kind} (retryable=${classified.retryable})`);
            console.error(`   ${classified.detail}`);
            // Not cached - a transient failure must not suppress analysis for the TTL.
            return `❌ Ошибка анализа (${classified.kind}): ${classified.detail}`;
        }
    }
    async batchAnalyze(opportunities) {
        const results = new Map();
        // Process up to 5 opportunities in parallel
        const promises = opportunities.slice(0, 5).map(async (opp) => {
            const analysis = await this.analyzeOpportunity(opp);
            results.set(opp.symbol, analysis);
        });
        await Promise.all(promises);
        return results;
    }
    getCostMetrics() {
        return { ...this.costMetrics };
    }
    resetCostMetrics() {
        this.costMetrics = {
            total_requests: 0,
            cached_requests: 0,
            estimated_cost: 0,
            last_reset: Date.now()
        };
    }
    clearCache() {
        this.analysisCache.clear();
    }
    async extractContractData(tokenSymbol, tokenDescription) {
        const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const cacheKey = `contract:${tokenSymbol.toUpperCase()}`;
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🤖 [CLAUDE-CONTRACT][${requestId}] EXTRACTING CONTRACT DATA`);
        console.log(`   Token: ${tokenSymbol}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        // Check cache first
        const cached = this.analysisCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < (this.cacheTtl * 1000)) {
            this.costMetrics.cached_requests++;
            console.log(`📦 [CLAUDE-CONTRACT][${requestId}] ✅ CACHE HIT for ${tokenSymbol}`);
            console.log(`   Returning cached data without API call`);
            const cachedData = JSON.parse(cached.analysis);
            console.log(`   Cached data:`, JSON.stringify(cachedData, null, 2));
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('');
            return cachedData;
        }
        // Cached results are still served above; only live calls need a client.
        const client = this.getClient();
        if (!client) {
            console.warn(`⚠️ [CLAUDE-CONTRACT][${requestId}] Skipped for ${tokenSymbol} - AI enrichment disabled (no ANTHROPIC_API_KEY)`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('');
            return this.emptyContractData({
                kind: 'disabled',
                detail: 'ANTHROPIC_API_KEY is not set - AI enrichment is disabled',
                retryable: false
            });
        }
        // The field list is expressed as concrete example VALUES, not as type
        // names. The previous wording ("chain_id": "number|null") asked for a type
        // name in the value position and the model sometimes returned exactly that.
        const prompt = `Извлеки данные контракта для токена: ${tokenSymbol}
Описание: ${tokenDescription}

Верни ТОЛЬКО JSON-объект с этими пятью полями. Пример корректного ответа:
{
  "contract_address": "0xdac17f958d2ee523a2206206994597c13d831ec7",
  "chain_id": 1,
  "chain_name": "Ethereum",
  "is_verified": true,
  "decimals": 6
}

Если какое-то значение неизвестно - поставь null именно для этого поля.
Не выдумывай адрес контракта: неверный адрес хуже, чем null.`;
        console.log(`🌐 [CLAUDE-CONTRACT][${requestId}] ⚡ CALLING ANTHROPIC API`);
        console.log(`   Model: ${this.config.model}`);
        console.log(`   Max Tokens: ${this.config.max_tokens}`);
        console.log(`   Temperature: ${this.config.temperature}`);
        console.log(`   Full Description:`);
        console.log(`   ${tokenDescription.split('\n').join('\n   ')}`);
        console.log(`   Full Prompt:`);
        console.log(`   ${prompt.substring(0, 300)}...`);
        try {
            const startTime = Date.now();
            console.log(`⏳ [CLAUDE-CONTRACT][${requestId}] Waiting for API response...`);
            const response = await this.createContractMessage(client, prompt, requestId);
            const duration = Date.now() - startTime;
            // A truncated or refused response arrives as a normal 200. Detect it here
            // rather than letting it fall through as "no contract data found".
            const incomplete = ClaudeAnalyzer.describeIncompleteStop(response.stop_reason);
            if (incomplete) {
                console.error(`❌ [CLAUDE-CONTRACT][${requestId}] Incomplete response for ${tokenSymbol}: ${incomplete}`);
                console.error(`   stop_reason=${response.stop_reason}, output_tokens=${response.usage?.output_tokens ?? 0}, max_tokens=${this.config.max_tokens}`);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('');
                // Not cached: this is a failure to obtain data, not a finding of "none".
                return this.emptyContractData({
                    kind: response.stop_reason === 'refusal' ? 'refused' : 'truncated',
                    detail: incomplete,
                    retryable: response.stop_reason !== 'refusal'
                });
            }
            const raw = ClaudeAnalyzer.extractTextContent(response.content);
            const parsed = this.parseContractData(raw);
            if (parsed === null) {
                console.error(`❌ [CLAUDE-CONTRACT][${requestId}] Could not read a JSON object from the response for ${tokenSymbol}`);
                console.error(`   Raw response: ${JSON.stringify(raw)}`);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('');
                // Not cached, for the same reason as above.
                return this.emptyContractData({
                    kind: 'unreadable',
                    detail: 'Response did not contain a readable JSON object',
                    retryable: true
                });
            }
            // Log extraction results with detailed formatting
            console.log(`✅ [CLAUDE-CONTRACT][${requestId}] 🎉 EXTRACTION COMPLETED SUCCESSFULLY`);
            console.log(`   ⏱️  Duration: ${duration}ms`);
            console.log(`   📊 Token Usage:`);
            console.log(`      Input Tokens:  ${response.usage?.input_tokens || 0}`);
            console.log(`      Output Tokens: ${response.usage?.output_tokens || 0}`);
            console.log(`   📝 Raw Claude Response:`);
            console.log(`      ${raw}`);
            console.log(`   ✨ Parsed Contract Data:`);
            console.log(`      Contract Address: ${parsed.contract_address || 'NOT FOUND'}`);
            console.log(`      Chain ID:         ${parsed.chain_id !== null ? parsed.chain_id : 'NOT FOUND'}`);
            console.log(`      Chain Name:       ${parsed.chain_name || 'NOT FOUND'}`);
            console.log(`      Is Verified:      ${parsed.is_verified !== null ? parsed.is_verified : 'NOT FOUND'}`);
            console.log(`      Decimals:         ${parsed.decimals !== null ? parsed.decimals : 'NOT FOUND'}`);
            // Cache the result
            this.analysisCache.set(cacheKey, {
                analysis: JSON.stringify(parsed),
                timestamp: Date.now()
            });
            console.log(`💾 [CLAUDE-CONTRACT][${requestId}] Result cached for ${this.cacheTtl}s`);
            // Record cost metrics with actual token counts
            this.costMetrics.total_requests++;
            const inputTokens = response.usage?.input_tokens || 200;
            const outputTokens = response.usage?.output_tokens || 80;
            const inputCost = (inputTokens / 1000000) * this.pricing.input;
            const outputCost = (outputTokens / 1000000) * this.pricing.output;
            this.costMetrics.estimated_cost += inputCost + outputCost;
            console.log(`💰 [CLAUDE-CONTRACT][${requestId}] COST BREAKDOWN:`);
            console.log(`   Input Cost:  $${inputCost.toFixed(6)} (${inputTokens} tokens @ $${this.pricing.input}/1M)`);
            console.log(`   Output Cost: $${outputCost.toFixed(6)} (${outputTokens} tokens @ $${this.pricing.output}/1M)`);
            console.log(`   This Call:   $${(inputCost + outputCost).toFixed(6)}`);
            console.log(`   Total Cost:  $${this.costMetrics.estimated_cost.toFixed(6)} (${this.costMetrics.total_requests} requests, ${this.costMetrics.cached_requests} cached)`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('');
            return parsed;
        }
        catch (error) {
            console.log('');
            console.error(`❌ [CLAUDE-CONTRACT][${requestId}] ⚠️  EXTRACTION FAILED`);
            console.error(`   Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
            console.error(`   Error Message: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error && error.stack) {
                console.error(`   Stack Trace: ${error.stack.split('\n').slice(0, 3).join('\n   ')}`);
            }
            const classified = ClaudeAnalyzer.describeApiError(error, this.config.model);
            console.error(`   Classified as: ${classified.kind} (retryable=${classified.retryable})`);
            console.error(`   ${classified.detail}`);
            console.error(`   Returning NULL values for all fields`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('');
            return this.emptyContractData(classified);
        }
    }
    /**
     * The "we could not determine anything" result. Callers treat every field
     * being null as "no contract data", which is the safe outcome.
     */
    emptyContractData(error) {
        return {
            contract_address: null,
            chain_id: null,
            chain_name: null,
            is_verified: null,
            decimals: null,
            ...(error ? { error } : {})
        };
    }
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
    static describeApiError(error, model) {
        if (error instanceof Anthropic.AuthenticationError) {
            return { kind: 'auth', detail: 'ANTHROPIC_API_KEY is invalid, revoked, or lacks credit (401)', retryable: false };
        }
        if (error instanceof Anthropic.PermissionDeniedError) {
            return { kind: 'permission', detail: `API key is not permitted to use model "${model}" (403)`, retryable: false };
        }
        if (error instanceof Anthropic.NotFoundError) {
            return { kind: 'model_not_found', detail: `Model "${model}" does not exist (404) - check CLAUDE_MODEL`, retryable: false };
        }
        if (error instanceof Anthropic.RateLimitError) {
            const retryAfter = error.headers?.get('retry-after');
            return {
                kind: 'rate_limit',
                detail: `Rate limited (429)${retryAfter ? ` - retry after ${retryAfter}s` : ''}`,
                retryable: true
            };
        }
        if (error instanceof Anthropic.BadRequestError) {
            return { kind: 'bad_request', detail: `Request rejected (400): ${error.message}`, retryable: false };
        }
        if (error instanceof Anthropic.InternalServerError) {
            return { kind: 'server', detail: `Anthropic server error (${error.status})`, retryable: true };
        }
        if (error instanceof Anthropic.APIConnectionTimeoutError) {
            return { kind: 'timeout', detail: 'Request to the Anthropic API timed out', retryable: true };
        }
        if (error instanceof Anthropic.APIConnectionError) {
            return { kind: 'connection', detail: 'Could not reach the Anthropic API - check network or egress rules', retryable: true };
        }
        if (error instanceof Anthropic.APIError) {
            const status = error.status;
            return {
                kind: 'unknown',
                detail: `Anthropic API error${status ? ` (${status})` : ''}: ${error.message}`,
                // Anything at or above 500 that is not already matched is worth retrying.
                retryable: typeof status === 'number' && status >= 500
            };
        }
        return {
            kind: 'unknown',
            detail: error instanceof Error ? error.message : String(error),
            retryable: false
        };
    }
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
    async createContractMessage(client, prompt, requestId) {
        const baseParams = {
            model: this.config.model,
            max_tokens: this.config.max_tokens,
            temperature: this.config.temperature,
            system: this.contractPrompt,
            messages: [{ role: 'user', content: prompt }]
        };
        if (!this.structuredOutputsEnabled) {
            return client.messages.create(baseParams);
        }
        try {
            return await client.messages.create({
                ...baseParams,
                output_config: {
                    format: { type: 'json_schema', schema: CONTRACT_DATA_SCHEMA }
                }
            });
        }
        catch (error) {
            if (!ClaudeAnalyzer.isStructuredOutputRejection(error)) {
                throw error;
            }
            this.structuredOutputsEnabled = false;
            console.warn(`⚠️ [CLAUDE-CONTRACT][${requestId}] Structured outputs rejected for model "${this.config.model}" - falling back to prompt-only JSON for the rest of this process.`);
            console.warn(`   Reason: ${error instanceof Error ? error.message : String(error)}`);
            return client.messages.create(baseParams);
        }
    }
    /**
     * Distinguish "this account/model does not support output_config" from a
     * genuine request error, so a real bug is not silently downgraded.
     */
    static isStructuredOutputRejection(error) {
        if (!(error instanceof Anthropic.APIError) || error.status !== 400) {
            return false;
        }
        const message = (error.message || '').toLowerCase();
        return message.includes('output_config')
            || message.includes('output format')
            || message.includes('json_schema')
            || message.includes('structured output');
    }
    /**
     * Concatenate every text block in the response.
     *
     * Reading content[0] blindly (as this class used to) breaks as soon as the
     * response leads with a non-text block, and drops content when the model
     * emits more than one text block.
     */
    static extractTextContent(content) {
        return (content || [])
            .filter(block => block.type === 'text' && typeof block.text === 'string')
            .map(block => block.text)
            .join('')
            .trim();
    }
    /**
     * Decide whether a response finished cleanly.
     *
     * A truncated or refused response is HTTP 200 with a normal body, so without
     * this check it looked like a successful call that happened to contain
     * unparseable content - the failure mode that made every symptom here look
     * like "the token has no contract data".
     */
    static describeIncompleteStop(stopReason) {
        switch (stopReason) {
            case 'max_tokens':
                return 'response hit the max_tokens limit and was cut off - raise CLAUDE_MAX_TOKENS';
            case 'refusal':
                return 'the model declined to answer this request';
            case 'model_context_window_exceeded':
                return 'the request exceeded the model context window';
            case 'pause_turn':
                return 'the model paused the turn before finishing';
            default:
                return null;
        }
    }
    /**
     * Pull the first complete JSON object out of a model response.
     *
     * Handles the two shapes that used to break JSON.parse outright: a
     * ```json fenced block, and a bare object with explanatory prose around it.
     * Brace counting is string- and escape-aware so a '}' inside a value does
     * not terminate the scan early. Returns null when no complete object is
     * present - notably when the response was truncated mid-object.
     */
    static extractJsonObject(raw) {
        if (!raw) {
            return null;
        }
        // Drop markdown fences (```json ... ``` or ``` ... ```)
        const withoutFences = raw.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1');
        const start = withoutFences.indexOf('{');
        if (start === -1) {
            return null;
        }
        // If a '[' opens before the first '{', the model returned an array. Rather
        // than silently picking its first element - which would mean guessing which
        // chain a token is on - treat that as unreadable and let the caller report
        // no data. Guessing a contract address wrong is worse than returning none.
        const arrayStart = withoutFences.indexOf('[');
        if (arrayStart !== -1 && arrayStart < start) {
            return null;
        }
        let depth = 0;
        let inString = false;
        let escaped = false;
        for (let i = start; i < withoutFences.length; i++) {
            const char = withoutFences[i];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === '"') {
                inString = !inString;
                continue;
            }
            if (inString) {
                continue;
            }
            if (char === '{') {
                depth++;
            }
            else if (char === '}') {
                depth--;
                if (depth === 0) {
                    return withoutFences.slice(start, i + 1);
                }
            }
        }
        // Unbalanced braces - the object never closed (truncated response).
        return null;
    }
    /** Reject schema placeholders and empty strings that are not real values. */
    static cleanString(value) {
        if (typeof value !== 'string') {
            return null;
        }
        const trimmed = value.trim();
        if (PLACEHOLDER_VALUES.has(trimmed.toLowerCase())) {
            return null;
        }
        return trimmed === '' ? null : trimmed;
    }
    /** Accept a number or a numeric string; reject anything else. */
    static cleanNumber(value) {
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : null;
        }
        const asString = ClaudeAnalyzer.cleanString(value);
        if (asString === null) {
            return null;
        }
        const parsed = Number(asString);
        return Number.isFinite(parsed) ? parsed : null;
    }
    /** Accept a real boolean or the strings "true"/"false"; reject anything else. */
    static cleanBoolean(value) {
        if (typeof value === 'boolean') {
            return value;
        }
        const asString = ClaudeAnalyzer.cleanString(value);
        if (asString === null) {
            return null;
        }
        if (asString.toLowerCase() === 'true')
            return true;
        if (asString.toLowerCase() === 'false')
            return false;
        return null;
    }
    /**
     * Parse a contract-data response.
     *
     * Returns null when the response could not be read at all, as distinct from
     * a successfully-read response that simply found nothing (all fields null).
     * Callers need that distinction: the first must not be cached or trusted,
     * the second is a legitimate answer.
     */
    parseContractData(raw) {
        const json = ClaudeAnalyzer.extractJsonObject(raw);
        if (json === null) {
            console.warn('⚠️ [CLAUDE-ANALYZER] No complete JSON object in Claude response:', JSON.stringify(raw));
            return null;
        }
        let parsed;
        try {
            parsed = JSON.parse(json);
        }
        catch (error) {
            console.warn('⚠️ [CLAUDE-ANALYZER] Failed to parse Claude contract data response:', JSON.stringify(json));
            return null;
        }
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            console.warn('⚠️ [CLAUDE-ANALYZER] Claude contract response was not a JSON object:', JSON.stringify(json));
            return null;
        }
        return {
            contract_address: ClaudeAnalyzer.cleanString(parsed.contract_address),
            chain_id: ClaudeAnalyzer.cleanNumber(parsed.chain_id),
            chain_name: ClaudeAnalyzer.cleanString(parsed.chain_name),
            is_verified: ClaudeAnalyzer.cleanBoolean(parsed.is_verified),
            decimals: ClaudeAnalyzer.cleanNumber(parsed.decimals)
        };
    }
}
// Export singleton instance
export const claudeAnalyzer = new ClaudeAnalyzer();
//# sourceMappingURL=ClaudeAnalyzer.js.map