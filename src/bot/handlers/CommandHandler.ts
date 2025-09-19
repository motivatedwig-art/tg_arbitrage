import TelegramBot from 'node-telegram-bot-api';
import { DatabaseManager } from '../../database/Database.js';
import { User, UserPreferences } from '../../exchanges/types/index.js';
import { i18n } from '../../utils/i18n.js';
import { KeyboardManager } from '../keyboards/index.js';
import { v4 as uuidv4 } from 'uuid';

export class CommandHandler {
  private bot: TelegramBot;
  private db: DatabaseManager;

  constructor(bot: TelegramBot) {
    this.bot = bot;
    this.db = DatabaseManager.getInstance();
  }

  public registerCommands(): void {
    console.log('🔧 Registering bot commands...');
    this.bot.onText(/\/start/, (msg) => {
      console.log('📝 /start command received');
      this.handleStart(msg);
    });
    this.bot.onText(/\/help/, (msg) => {
      console.log('📝 /help command received');
      this.handleHelp(msg);
    });
    this.bot.onText(/\/status/, (msg) => {
      console.log('📝 /status command received');
      this.handleStatus(msg);
    });
    this.bot.onText(/\/settings/, (msg) => {
      console.log('📝 /settings command received');
      this.handleSettings(msg);
    });
    this.bot.onText(/\/language/, (msg) => {
      console.log('📝 /language command received');
      this.handleLanguage(msg);
    });
    this.bot.onText(/\/top/, (msg) => {
      console.log('📝 /top command received');
      this.handleTop(msg);
    });
    this.bot.onText(/\/subscribe/, (msg) => {
      console.log('📝 /subscribe command received');
      this.handleSubscribe(msg);
    });
    this.bot.onText(/\/webapp/, (msg) => {
      console.log('📝 /webapp command received');
      this.handleWebApp(msg);
    });
    this.bot.onText(/\/stats/, (msg) => {
      console.log('📝 /stats command received');
      this.handleStats(msg);
    });
    console.log('✅ Bot commands registered successfully');
  }

  private async getUserLanguage(telegramId: number): Promise<string> {
    try {
      const user = await this.db.getUserModel().findByTelegramId(telegramId);
      return user?.preferences.language || 'en';
    } catch (error) {
      return 'en';
    }
  }

  private async ensureUser(msg: TelegramBot.Message): Promise<User> {
    const telegramId = msg.from!.id;
    let user = await this.db.getUserModel().findByTelegramId(telegramId);
    
    if (!user) {
      const defaultPreferences: UserPreferences = {
        language: msg.from?.language_code === 'ru' ? 'ru' : 'en',
        notifications: true,
        minProfitThreshold: 0.5,
        preferredExchanges: [],
        alertThreshold: 2.0
      };

      user = {
        id: uuidv4(),
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

  private async handleStart(msg: TelegramBot.Message): Promise<void> {
    try {
      const user = await this.ensureUser(msg);
      const lng = user.preferences.language;
      
      const welcomeMessage = i18n.t('commands.start', lng);
      const keyboard = KeyboardManager.getMainMenuKeyboard(lng);

      await this.bot.sendMessage(msg.chat.id, welcomeMessage, {
        reply_markup: keyboard,
        parse_mode: 'HTML'
      });
    } catch (error) {
      console.error('Error in handleStart:', error);
      await this.bot.sendMessage(msg.chat.id, 'An error occurred. Please try again.');
    }
  }

  private async handleHelp(msg: TelegramBot.Message): Promise<void> {
    try {
      const lng = await this.getUserLanguage(msg.from!.id);
      const helpMessage = i18n.t('commands.help', lng);

      await this.bot.sendMessage(msg.chat.id, helpMessage, {
        parse_mode: 'HTML'
      });
    } catch (error) {
      console.error('Error in handleHelp:', error);
      await this.bot.sendMessage(msg.chat.id, 'An error occurred. Please try again.');
    }
  }

  private async handleStatus(msg: TelegramBot.Message): Promise<void> {
    try {
      const lng = await this.getUserLanguage(msg.from!.id);
      
      // Get system status
      const statusMessage = `${i18n.t('commands.status', lng)}\n\n` +
        `${i18n.t('status.exchanges_status', lng)}\n` +
        `🟢 Binance: ${i18n.t('status.online', lng)}\n` +
        `🟢 OKX: ${i18n.t('status.online', lng)}\n` +
        `🟢 Bybit: ${i18n.t('status.online', lng)}\n` +
        `🟡 BitGet: ${i18n.t('status.online', lng)}\n` +
        `🟢 MEXC: ${i18n.t('status.online', lng)}\n` +
        `🟢 BingX: ${i18n.t('status.online', lng)}\n` +
        `🟢 Gate.io: ${i18n.t('status.online', lng)}\n` +
        `🟢 KuCoin: ${i18n.t('status.online', lng)}\n\n` +
        `${i18n.t('status.last_update', lng)} ${new Date().toLocaleString()}\n` +
        `${i18n.t('status.opportunities_found', lng)} 0`;

      await this.bot.sendMessage(msg.chat.id, statusMessage);
    } catch (error) {
      console.error('Error in handleStatus:', error);
      await this.bot.sendMessage(msg.chat.id, 'An error occurred. Please try again.');
    }
  }

  private async handleSettings(msg: TelegramBot.Message): Promise<void> {
    try {
      const lng = await this.getUserLanguage(msg.from!.id);
      const settingsMessage = i18n.t('commands.settings', lng);
      const keyboard = KeyboardManager.getSettingsKeyboard(lng);

      await this.bot.sendMessage(msg.chat.id, settingsMessage, {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error in handleSettings:', error);
      await this.bot.sendMessage(msg.chat.id, 'An error occurred. Please try again.');
    }
  }

  private async handleLanguage(msg: TelegramBot.Message): Promise<void> {
    try {
      const lng = await this.getUserLanguage(msg.from!.id);
      const keyboard = KeyboardManager.getLanguageKeyboard(lng);

      await this.bot.sendMessage(msg.chat.id, i18n.t('buttons.language', lng), {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error in handleLanguage:', error);
      await this.bot.sendMessage(msg.chat.id, 'An error occurred. Please try again.');
    }
  }

  private async handleTop(msg: TelegramBot.Message): Promise<void> {
    try {
      const lng = await this.getUserLanguage(msg.from!.id);
      
      // Get top opportunities from database
      const opportunities = await this.db.getArbitrageModel().getTopOpportunities(10);
      
      if (opportunities.length === 0) {
        await this.bot.sendMessage(msg.chat.id, i18n.t('table.no_opportunities', lng));
        return;
      }

      let message = `${i18n.t('commands.top_opportunities', lng)}\n\n`;
      
      opportunities.forEach((opp, index) => {
        message += `${index + 1}. ${opp.symbol}\n`;
        message += `   📈 ${opp.profitPercentage.toFixed(2)}% profit\n`;
        message += `   💰 Buy: ${opp.buyExchange} ($${opp.buyPrice.toFixed(4)})\n`;
        message += `   💸 Sell: ${opp.sellExchange} ($${opp.sellPrice.toFixed(4)})\n`;
        message += `   📊 Volume: ${opp.volume.toFixed(2)}\n\n`;
      });

      await this.bot.sendMessage(msg.chat.id, message, {
        parse_mode: 'HTML'
      });
    } catch (error) {
      console.error('Error in handleTop:', error);
      await this.bot.sendMessage(msg.chat.id, 'An error occurred. Please try again.');
    }
  }

  private async handleSubscribe(msg: TelegramBot.Message): Promise<void> {
    try {
      const user = await this.ensureUser(msg);
      const lng = user.preferences.language;
      
      // Toggle notifications
      const newNotificationStatus = !user.preferences.notifications;
      await this.db.getUserModel().updateNotifications(msg.from!.id, newNotificationStatus);
      
      const message = newNotificationStatus 
        ? i18n.t('commands.subscribe_enabled', lng)
        : i18n.t('commands.subscribe_disabled', lng);

      await this.bot.sendMessage(msg.chat.id, message);
    } catch (error) {
      console.error('Error in handleSubscribe:', error);
      await this.bot.sendMessage(msg.chat.id, 'An error occurred. Please try again.');
    }
  }

  private async handleWebApp(msg: TelegramBot.Message): Promise<void> {
    try {
      const lng = await this.getUserLanguage(msg.from!.id);
      const keyboard = KeyboardManager.getWebAppKeyboard(lng);

      await this.bot.sendMessage(msg.chat.id, i18n.t('commands.webapp', lng), {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error in handleWebApp:', error);
      await this.bot.sendMessage(msg.chat.id, 'An error occurred. Please try again.');
    }
  }

  private async handleStats(msg: TelegramBot.Message): Promise<void> {
    try {
      const lng = await this.getUserLanguage(msg.from!.id);
      
      // Get statistics from database
      const stats = await this.db.getArbitrageModel().getStatistics();
      
      const statsMessage = `${i18n.t('commands.stats', lng)}\n\n` +
        `📊 Total opportunities (24h): ${stats.total}\n` +
        `📈 Average profit: ${stats.avgProfit.toFixed(2)}%\n` +
        `🚀 Maximum profit: ${stats.maxProfit.toFixed(2)}%`;

      await this.bot.sendMessage(msg.chat.id, statsMessage);
    } catch (error) {
      console.error('Error in handleStats:', error);
      await this.bot.sendMessage(msg.chat.id, 'An error occurred. Please try again.');
    }
  }
}
