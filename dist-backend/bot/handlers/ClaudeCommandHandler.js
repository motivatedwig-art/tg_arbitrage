import { DatabaseManager } from '../../database/Database.js';
import { i18n } from '../../utils/i18n.js';
import { ContractDataService } from '../../services/ContractDataService.js';
export class ClaudeCommandHandler {
    constructor(bot) {
        this.bot = bot;
        this.db = DatabaseManager.getInstance();
        this.contractService = ContractDataService.getInstance();
    }
    registerCommands() {
        console.log('🤖 Registering Claude AI contract commands...');
        this.bot.onText(/\/contract(?:\s+(.+))?/, (msg, match) => {
            console.log('📝 /contract command received');
            this.handleContractLookup(msg, match);
        });
        console.log('✅ Claude AI contract commands registered successfully');
    }
    async handleContractLookup(msg, match) {
        const symbol = match?.[1]?.trim()?.toUpperCase();
        const lng = await this.getUserLanguage(msg.from.id);
        if (!symbol) {
            await this.bot.sendMessage(msg.chat.id, `❌ ${lng === 'en' ? 'Please specify a token symbol. Example: /contract ETH' : 'Пожалуйста, укажите символ токена. Пример: /contract ETH'}`);
            return;
        }
        try {
            const { opportunity, record } = await this.contractService.ensureContractDataBySymbol(symbol);
            if (!opportunity) {
                await this.bot.sendMessage(msg.chat.id, `⚠️ Данные по ${symbol} пока отсутствуют в базе. Подождите следующего сканирования.`);
                return;
            }
            if (!record || (!record.contractAddress && !record.chainId && !record.chainName)) {
                await this.bot.sendMessage(msg.chat.id, `❌ Не удалось получить контрактные данные для ${symbol}. Попробуйте позже.`);
                return;
            }
            const response = `📋 <b>Данные токена ${symbol}</b>
📍 Контракт: ${record.contractAddress || 'Не найден'}
🔗 Сеть: ${record.chainName || opportunity.blockchain || 'Неизвестна'}${record.chainId ? ` (ID: ${record.chainId})` : ''}
✅ Проверен: ${record.isVerified === true ? 'Да' : record.isVerified === false ? 'Нет' : 'Неизвестно'}
🔢 Decimals: ${record.decimals ?? '—'}
💾 Источник: Claude API (сохранено в базе)`;
            await this.bot.sendMessage(msg.chat.id, response, { parse_mode: 'HTML' });
        }
        catch (error) {
            console.error('Error handling /contract command:', error);
            await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
        }
    }
    async getUserLanguage(telegramId) {
        try {
            const user = await this.db.getUserModel().findByTelegramId(telegramId);
            return user?.preferences.language || 'ru';
        }
        catch {
            return 'ru';
        }
    }
}
//# sourceMappingURL=ClaudeCommandHandler.js.map