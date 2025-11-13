import Anthropic from '@anthropic-ai/sdk';
export class ClaudeAnalyzer {
    constructor() {
        this.analysisCache = new Map();
        this.cacheTtl = 300; // 5 minutes
        // Cost tracking
        this.costMetrics = {
            total_requests: 0,
            cached_requests: 0,
            estimated_cost: 0,
            last_reset: Date.now()
        };
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            throw new Error('ANTHROPIC_API_KEY environment variable is required');
        }
        this.client = new Anthropic({
            apiKey: apiKey,
        });
        // Russian system prompt with cost optimization
        this.systemPrompt = `Ты - эксперт по криптовалютному арбитражу. Анализируешь возможности и объясняешь рыночные неэффективности.

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
        // Cost optimization settings
        this.config = {
            model: "claude-3-5-haiku-20241022", // $0.25 per 1M input tokens vs $3 for Sonnet
            max_tokens: 100, // Enough for 3-4 sentences
            temperature: 0, // Stable responses
        };
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
                system: this.systemPrompt,
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
            const inputCost = (150 / 1000000) * 0.25;
            const outputCost = (50 / 1000000) * 1.25;
            this.costMetrics.estimated_cost += inputCost + outputCost;
            return analysis;
        }
        catch (error) {
            console.error('Claude API error:', error);
            return `❌ Ошибка анализа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
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
}
// Export singleton instance
export const claudeAnalyzer = new ClaudeAnalyzer();
//# sourceMappingURL=ClaudeAnalyzer.js.map