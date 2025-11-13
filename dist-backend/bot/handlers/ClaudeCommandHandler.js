import { DatabaseManager } from '../../database/Database.js';
import { i18n } from '../../utils/i18n.js';
import { claudeAnalyzer } from '../../services/ClaudeAnalyzer.js';
export class ClaudeCommandHandler {
    constructor(bot) {
        this.bot = bot;
        this.db = DatabaseManager.getInstance();
    }
    registerCommands() {
        console.log('🤖 Registering Claude AI commands...');
        // /analyze command - Analyze specific opportunity
        this.bot.onText(/\/analyze(?:\s+(.+))?/, (msg, match) => {
            console.log('📝 /analyze command received');
            this.handleAnalyze(msg, match);
        });
        // /ai command - AI-powered top opportunities
        this.bot.onText(/\/ai/, (msg) => {
            console.log('📝 /ai command received');
            this.handleAI(msg);
        });
        console.log('✅ Claude AI commands registered successfully');
    }
    async getUserLanguage(telegramId) {
        try {
            const user = await this.db.getUserModel().findByTelegramId(telegramId);
            return user?.preferences.language || 'ru';
        }
        catch (error) {
            return 'ru';
        }
    }
    async ensureUser(msg) {
        const telegramId = msg.from.id;
        let user = await this.db.getUserModel().findByTelegramId(telegramId);
        if (!user) {
            const defaultPreferences = {
                language: (msg.from?.language_code === 'en' ? 'en' : 'ru'),
                notifications: true,
                minProfitThreshold: 0.5,
                preferredExchanges: [],
                alertThreshold: 2.0
            };
            user = {
                id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
                telegramId: telegramId,
                username: msg.from?.username,
                createdAt: Date.now(),
                preferences: defaultPreferences,
                isActive: true
            };
            await this.db.getUserModel().create(user);
        }
        return user;
    }
    async getTopOpportunities(limit = 3) {
        try {
            // Get opportunities from database
            const opportunities = await this.db.getArbitrageModel().getTopOpportunities(limit);
            if (!opportunities || opportunities.length === 0) {
                return [];
            }
            // Convert to Claude format
            return opportunities.map(opp => ({
                symbol: opp.symbol,
                chain: 'ethereum', // Default, should be enhanced with actual chain data
                spread_percentage: opp.profitPercentage,
                buy_exchange: opp.buyExchange,
                buy_price: opp.buyPrice,
                sell_exchange: opp.sellExchange,
                sell_price: opp.sellPrice,
                liquidity_usd: opp.volume || 50000, // Fallback liquidity
                volume_24h: opp.volume || 10000,
                gas_cost_usd: 2.0 // Estimated gas cost
            }));
        }
        catch (error) {
            console.error('Error fetching top opportunities:', error);
            return [];
        }
    }
    async handleAnalyze(msg, match) {
        try {
            const user = await this.ensureUser(msg);
            const lng = user.preferences.language;
            // Parse arguments
            const args = match?.[1]?.trim().split(/\s+/) || [];
            if (args.length < 2) {
                const usageMessage = `❌ ${i18n.t('commands.usage_analyze', lng)}\n\n` +
                    `Пример: \`/analyze ethereum USDC\`\n` +
                    `Пример: \`/analyze polygon USDT\``;
                await this.bot.sendMessage(msg.chat.id, usageMessage, {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [[
                                { text: '📊 Посмотреть топ возможностей', callback_data: 'show_ai_top' }
                            ]]
                    }
                });
                return;
            }
            const [chain, symbol] = args;
            // Get opportunity data (simplified - should integrate with real scanner)
            const opportunities = await this.getTopOpportunities(10);
            const opportunity = opportunities.find(opp => opp.symbol.toUpperCase() === symbol.toUpperCase());
            if (!opportunity) {
                await this.bot.sendMessage(msg.chat.id, `❌ Возможность ${symbol} на ${chain} не найдена`);
                return;
            }
            // Send basic info first
            const infoText = `🎯 <b>${opportunity.symbol}</b> на ${opportunity.chain}
📊 Спред: <b>${opportunity.spread_percentage.toFixed(2)}%</b>
💰 Покупка: ${opportunity.buy_exchange} ($${opportunity.buy_price.toFixed(4)})
💰 Продажа: ${opportunity.sell_exchange} ($${opportunity.sell_price.toFixed(4)})
💧 Ликвидность: $${opportunity.liquidity_usd.toLocaleString()}`;
            await this.bot.sendMessage(msg.chat.id, infoText, { parse_mode: 'HTML' });
            // Get AI analysis
            const analysis = await claudeAnalyzer.analyzeOpportunity(opportunity);
            // Send analysis
            const analysisText = `💡 <b>AI Анализ Claude:</b>\n${analysis}`;
            await this.bot.sendMessage(msg.chat.id, analysisText, { parse_mode: 'HTML' });
        }
        catch (error) {
            console.error('Error in handleAnalyze:', error);
            const lng = await this.getUserLanguage(msg.from.id);
            await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
        }
    }
    async handleAI(msg) {
        try {
            const user = await this.ensureUser(msg);
            const lng = user.preferences.language;
            // Get top opportunities
            const opportunities = await this.getTopOpportunities(3);
            if (!opportunities || opportunities.length === 0) {
                await this.bot.sendMessage(msg.chat.id, i18n.t('errors.no_opportunities', lng));
                return;
            }
            // Send initial message
            await this.bot.sendMessage(msg.chat.id, `🤖 <b>AI Анализ топ-3 возможностей</b>\n\nАнализирую с помощью Claude AI...`, { parse_mode: 'HTML' });
            // Analyze all opportunities in parallel
            const analyses = await claudeAnalyzer.batchAnalyze(opportunities);
            // Send each analysis
            for (const opportunity of opportunities) {
                const analysis = analyses.get(opportunity.symbol) || '❌ Анализ недоступен';
                const messageText = `🎯 <b>${opportunity.symbol}</b> на ${opportunity.chain}
📊 Спред: <b>${opportunity.spread_percentage.toFixed(2)}%</b>
💰 ${opportunity.buy_exchange} → ${opportunity.sell_exchange}
💧 Ликвидность: $${opportunity.liquidity_usd.toLocaleString()}

💡 <b>AI Анализ:</b>
${analysis}`;
                await this.bot.sendMessage(msg.chat.id, messageText, { parse_mode: 'HTML' });
                await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
            }
            // Send cost summary
            const costMetrics = claudeAnalyzer.getCostMetrics();
            const costText = `📊 <b>Статистика Claude AI:</b>
🤖 Анализов: ${costMetrics.total_requests}
💾 Кешированных: ${costMetrics.cached_requests}
💰 Примерная стоимость: $${costMetrics.estimated_cost.toFixed(4)}`;
            await this.bot.sendMessage(msg.chat.id, costText, { parse_mode: 'HTML' });
        }
        catch (error) {
            console.error('Error in handleAI:', error);
            const lng = await this.getUserLanguage(msg.from.id);
            await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
        }
    }
    // Method to get AI analysis for existing opportunities
    async getAIAnalysisForOpportunity(opportunity) {
        try {
            // Convert to Claude format
            const claudeOpportunity = {
                symbol: opportunity.symbol,
                chain: opportunity.chain || 'ethereum',
                spread_percentage: opportunity.profitPercentage,
                buy_exchange: opportunity.buyExchange,
                buy_price: opportunity.buyPrice,
                sell_exchange: opportunity.sellExchange,
                sell_price: opportunity.sellPrice,
                liquidity_usd: opportunity.volume || 50000,
                volume_24h: opportunity.volume || 10000,
                gas_cost_usd: 2.0
            };
            return await claudeAnalyzer.analyzeOpportunity(claudeOpportunity);
        }
        catch (error) {
            console.error('Error getting AI analysis:', error);
            return '❌ Ошибка AI анализа';
        }
    }
    // Method to get cost metrics
    getCostMetrics() {
        return claudeAnalyzer.getCostMetrics();
    }
    // Method to reset cost metrics
    resetCostMetrics() {
        claudeAnalyzer.resetCostMetrics();
    }
}
//# sourceMappingURL=ClaudeCommandHandler.js.map