import Anthropic from '@anthropic-ai/sdk';

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

interface ContractDataResponse {
  contract_address: string | null;
  chain_id: number | null;
  chain_name: string | null;
  is_verified: boolean | null;
  decimals: number | null;
}

interface CostMetrics {
  total_requests: number;
  cached_requests: number;
  estimated_cost: number;
  last_reset: number;
}

export class ClaudeAnalyzer {
  // Created on first use, not in the constructor. This module exports a
  // singleton, so throwing during construction aborted the import of every
  // module that depends on it - which meant a missing ANTHROPIC_API_KEY took
  // down the entire bot instead of just disabling AI enrichment.
  private client: Anthropic | null = null;
  private missingKeyWarningLogged: boolean = false;
  private analysisPrompt: string;
  private contractPrompt: string;
  private config: {
    model: string;
    max_tokens: number;
    temperature: number;
  };
  private analysisCache: Map<string, { analysis: string; timestamp: number }> = new Map();
  private cacheTtl: number = 300; // 5 minutes

  // Cost tracking
  private costMetrics: CostMetrics = {
    total_requests: 0,
    cached_requests: 0,
    estimated_cost: 0,
    last_reset: Date.now()
  };

  constructor() {
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

    // Cost optimization settings shared across prompts
    this.config = {
      model: "claude-3-5-haiku-20241022",
      max_tokens: 200, // More tokens for JSON response
      temperature: 0,   // Deterministic responses
    };
  }

  /**
   * Resolve the API key at call time rather than at construction time, so that
   * a key exported after this module was first imported is still picked up.
   */
  private resolveApiKey(): string {
    return (process.env.ANTHROPIC_API_KEY || '').trim();
  }

  /**
   * True when AI enrichment can actually run. Callers should check this and
   * fall back to a non-AI path instead of relying on the request failing.
   */
  public isEnabled(): boolean {
    return this.resolveApiKey() !== '';
  }

  /**
   * Lazily construct the SDK client. Returns null - never throws - when no key
   * is configured, so a missing key degrades AI enrichment instead of taking
   * down whatever imported this module.
   */
  private getClient(): Anthropic | null {
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

  private createAnalysisPrompt(opportunity: ArbitrageOpportunity): string {
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

  private getCachedAnalysis(opportunity: ArbitrageOpportunity): string | null {
    const cacheKey = `${opportunity.chain}:${opportunity.symbol}`;
    const cached = this.analysisCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < (this.cacheTtl * 1000)) {
      this.costMetrics.cached_requests++;
      return cached.analysis + " 📌[кеш]";
    }

    return null;
  }

  async analyzeOpportunity(opportunity: ArbitrageOpportunity): Promise<string> {
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

      const analysis = response.content[0].type === 'text' ? response.content[0].text : 'Ошибка анализа';

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
      const inputCost = (inputTokens / 1_000_000) * 0.25;
      const outputCost = (outputTokens / 1_000_000) * 1.25;
      this.costMetrics.estimated_cost += inputCost + outputCost;

      console.log(`💰 [CLAUDE-ANALYZER][${requestId}] Cost: $${(inputCost + outputCost).toFixed(6)} (total: $${this.costMetrics.estimated_cost.toFixed(4)})`);

      return analysis;

    } catch (error) {
      console.error(`❌ [CLAUDE-ANALYZER][${requestId}] API error for ${opportunity.symbol}:`, error);
      console.error(`   Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.error(`   Error message: ${error instanceof Error ? error.message : String(error)}`);
      return `❌ Ошибка анализа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
    }
  }

  async batchAnalyze(opportunities: ArbitrageOpportunity[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    // Process up to 5 opportunities in parallel
    const promises = opportunities.slice(0, 5).map(async (opp) => {
      const analysis = await this.analyzeOpportunity(opp);
      results.set(opp.symbol, analysis);
    });

    await Promise.all(promises);
    return results;
  }

  getCostMetrics(): CostMetrics {
    return { ...this.costMetrics };
  }

  resetCostMetrics(): void {
    this.costMetrics = {
      total_requests: 0,
      cached_requests: 0,
      estimated_cost: 0,
      last_reset: Date.now()
    };
  }

  clearCache(): void {
    this.analysisCache.clear();
  }

  async extractContractData(tokenSymbol: string, tokenDescription: string): Promise<ContractDataResponse> {
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
      const cachedData = JSON.parse(cached.analysis) as ContractDataResponse;
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
      return this.emptyContractData();
    }

    const prompt = `Извлеки данные контракта для токена: ${tokenSymbol}
Описание: ${tokenDescription}

Верни ТОЛЬКО JSON в формате:
{
  "contract_address": "string|null",
  "chain_id": "number|null",
  "chain_name": "string|null",
  "is_verified": "boolean|null",
  "decimals": "number|null"
}`;

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

      const response = await client.messages.create({
        model: this.config.model,
        max_tokens: this.config.max_tokens,
        temperature: this.config.temperature,
        system: this.contractPrompt,
        messages: [{ role: "user", content: prompt }]
      });
      const duration = Date.now() - startTime;

      const raw = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
      const parsed = this.parseContractData(raw);

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
      const inputCost = (inputTokens / 1_000_000) * 0.25;
      const outputCost = (outputTokens / 1_000_000) * 1.25;
      this.costMetrics.estimated_cost += inputCost + outputCost;

      console.log(`💰 [CLAUDE-CONTRACT][${requestId}] COST BREAKDOWN:`);
      console.log(`   Input Cost:  $${inputCost.toFixed(6)} (${inputTokens} tokens @ $0.25/1M)`);
      console.log(`   Output Cost: $${outputCost.toFixed(6)} (${outputTokens} tokens @ $1.25/1M)`);
      console.log(`   This Call:   $${(inputCost + outputCost).toFixed(6)}`);
      console.log(`   Total Cost:  $${this.costMetrics.estimated_cost.toFixed(6)} (${this.costMetrics.total_requests} requests, ${this.costMetrics.cached_requests} cached)`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');

      return parsed;
    } catch (error) {
      console.log('');
      console.error(`❌ [CLAUDE-CONTRACT][${requestId}] ⚠️  EXTRACTION FAILED`);
      console.error(`   Error Type: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.error(`   Error Message: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        console.error(`   Stack Trace: ${error.stack.split('\n').slice(0, 3).join('\n   ')}`);
      }
      console.error(`   Returning NULL values for all fields`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');

      return this.emptyContractData();
    }
  }

  /**
   * The "we could not determine anything" result. Callers treat every field
   * being null as "no contract data", which is the safe outcome.
   */
  private emptyContractData(): ContractDataResponse {
    return {
      contract_address: null,
      chain_id: null,
      chain_name: null,
      is_verified: null,
      decimals: null
    };
  }

  private parseContractData(raw: string): ContractDataResponse {
    try {
      const parsed = JSON.parse(raw);
      return {
        contract_address: parsed.contract_address ?? null,
        chain_id: parsed.chain_id ?? null,
        chain_name: parsed.chain_name ?? null,
        is_verified: parsed.is_verified ?? null,
        decimals: parsed.decimals ?? null
      };
    } catch (error) {
      console.warn('Failed to parse Claude contract data response:', raw);
      return this.emptyContractData();
    }
  }
}

// Export singleton instance
export const claudeAnalyzer = new ClaudeAnalyzer();
