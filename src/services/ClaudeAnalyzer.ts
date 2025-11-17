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
  private client: Anthropic;
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
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.client = new Anthropic({
      apiKey: apiKey,
    });

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
    // Check cache first
    const cachedAnalysis = this.getCachedAnalysis(opportunity);
    if (cachedAnalysis) {
      return cachedAnalysis;
    }

    // Format compact data for analysis
    const prompt = `Token: ${opportunity.symbol} (${opportunity.chain})
Спред: ${opportunity.spread_percentage.toFixed(2)}%
${opportunity.buy_exchange}: $${opportunity.buy_price.toFixed(4)} → ${opportunity.sell_exchange}: $${opportunity.sell_price.toFixed(4)}
Ликвидность: $${opportunity.liquidity_usd.toLocaleString()}
Gas: $${opportunity.gas_cost_usd.toFixed(2)}`;

    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.max_tokens,
        temperature: this.config.temperature,
        system: this.analysisPrompt,
        messages: [{ role: "user", content: prompt }]
      });

      const analysis = response.content[0].type === 'text' ? response.content[0].text : 'Ошибка анализа';

      // Cache the result
      const cacheKey = `${opportunity.chain}:${opportunity.symbol}`;
      this.analysisCache.set(cacheKey, {
        analysis,
        timestamp: Date.now()
      });

      // Record cost metrics
      this.costMetrics.total_requests++;
      // Rough cost estimation: ~150 input tokens + 50 output tokens
      const inputCost = (150 / 1_000_000) * 0.25;
      const outputCost = (50 / 1_000_000) * 1.25;
      this.costMetrics.estimated_cost += inputCost + outputCost;

      return analysis;

    } catch (error) {
      console.error('Claude API error:', error);
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
    const cacheKey = `contract:${tokenSymbol.toUpperCase()}`;
    const cached = this.analysisCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < (this.cacheTtl * 1000)) {
      this.costMetrics.cached_requests++;
      return JSON.parse(cached.analysis) as ContractDataResponse;
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

    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.max_tokens,
        temperature: this.config.temperature,
        system: this.contractPrompt,
        messages: [{ role: "user", content: prompt }]
      });

      const raw = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
      const parsed = this.parseContractData(raw);

      this.analysisCache.set(cacheKey, {
        analysis: JSON.stringify(parsed),
        timestamp: Date.now()
      });

      this.costMetrics.total_requests++;
      const inputCost = (200 / 1_000_000) * 0.25;
      const outputCost = (80 / 1_000_000) * 1.25;
      this.costMetrics.estimated_cost += inputCost + outputCost;

      return parsed;
    } catch (error) {
      console.error('Claude contract extraction error:', error);
      return {
        contract_address: null,
        chain_id: null,
        chain_name: null,
        is_verified: null,
        decimals: null
      };
    }
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
      return {
        contract_address: null,
        chain_id: null,
        chain_name: null,
        is_verified: null,
        decimals: null
      };
    }
  }
}

// Export singleton instance
export const claudeAnalyzer = new ClaudeAnalyzer();
