/**
 * TypeScript handler for /contracts and /api_stats commands
 * Integrates with Python contract resolver via subprocess
 */
import TelegramBot from 'node-telegram-bot-api';
import { exec } from 'child_process';
import { existsSync } from 'fs';
import { promisify } from 'util';
import { DatabaseManager } from '../../database/Database.js';
import { i18n } from '../../utils/i18n.js';

const execAsync = promisify(exec);

/** Python entry point this handler shells out to, relative to the repo root. */
const PYTHON_BRIDGE = 'app/integration_bridge.py';

export class ContractsCommandHandler {
  private bot: TelegramBot;
  private db: DatabaseManager;

  constructor(bot: TelegramBot) {
    this.bot = bot;
    this.db = DatabaseManager.getInstance();
  }

  /** Interpreter name resolved by isAvailable(); used by every invocation. */
  private static interpreter: string = 'python3';

  /**
   * Whether the Python side this handler depends on can actually run.
   *
   * The commands are only worth registering if they can succeed. The deploy
   * image installs Node alone (nixpacks.toml lists nodejs_20 and nothing runs
   * pip), so on Railway this is expected to be false and the commands stay
   * unregistered rather than failing in front of a user.
   */
  public static async isAvailable(): Promise<boolean> {
    if (!existsSync(PYTHON_BRIDGE)) {
      console.log(`ℹ️  Contract commands disabled: ${PYTHON_BRIDGE} not found`);
      return false;
    }

    for (const interpreter of ['python3', 'python']) {
      try {
        await execAsync(`${interpreter} --version`, { timeout: 5000 });
        ContractsCommandHandler.interpreter = interpreter;
        console.log(`✅ Contract commands enabled (${interpreter} available)`);
        return true;
      } catch {
        // Try the next interpreter name.
      }
    }

    console.log('ℹ️  Contract commands disabled: no Python interpreter on PATH');
    return false;
  }

  public registerCommands(): void {
    console.log('🔧 Registering contract commands...');

    // /contracts command: /contracts USDT/ETH [blockchain]
    this.bot.onText(/\/contracts (.+)/, async (msg, match) => {
      console.log('📝 /contracts command received');
      await this.handleContractsCommand(msg, match[1]);
    });

    // /api_stats command: /api_stats [hours]
    this.bot.onText(/\/api_stats(?:\s+(\d+))?/, async (msg, match) => {
      console.log('📝 /api_stats command received');
      const hours = match[1] ? parseInt(match[1], 10) : 24;
      await this.handleApiStatsCommand(msg, hours);
    });

    console.log('✅ Contract commands registered');
  }

  private async getUserLanguage(telegramId: number): Promise<string> {
    try {
      const user = await this.db.getUserModel().findByTelegramId(telegramId);
      return user?.preferences.language || 'ru';
    } catch (error) {
      return 'ru';
    }
  }

  private async handleContractsCommand(
    msg: TelegramBot.Message,
    args: string
  ): Promise<void> {
    try {
      const lng = await this.getUserLanguage(msg.from!.id);

      // Parse arguments: "USDT/ETH ethereum" or just "USDT/ETH"
      const parts = args.trim().split(/\s+/);
      const pair = parts[0];
      const blockchain = parts[1] || 'ethereum';

      // Validate pair format
      if (!pair.includes('/')) {
        await this.bot.sendMessage(
          msg.chat.id,
          lng === 'ru'
            ? '❌ Неверный формат пары. Используйте: BASE/QUOTE (например, USDT/ETH)'
            : '❌ Invalid pair format. Use: BASE/QUOTE (e.g., USDT/ETH)'
        );
        return;
      }

      // Send "processing" message
      const processingMsg = await this.bot.sendMessage(
        msg.chat.id,
        lng === 'ru' ? '🔍 Поиск контрактов...' : '🔍 Searching contracts...'
      );

      // Call Python bridge
      const command = `${ContractsCommandHandler.interpreter} ${PYTHON_BRIDGE} contracts "${pair}" ${blockchain} ${lng}`;

      try {
        const { stdout, stderr } = await execAsync(command, {
          timeout: 10000, // 10 second timeout
          maxBuffer: 1024 * 1024, // 1MB buffer
        });

        if (stderr && !stderr.includes('Warning')) {
          console.error('Python bridge stderr:', stderr);
        }

        const result = JSON.parse(stdout);

        // Delete processing message
        await this.bot.deleteMessage(msg.chat.id, processingMsg.message_id);

        if (result.success) {
          await this.bot.sendMessage(msg.chat.id, result.message, {
            parse_mode: 'HTML',
          });
        } else {
          await this.bot.sendMessage(
            msg.chat.id,
            result.error ||
              (lng === 'ru'
                ? '❌ Ошибка получения контрактов'
                : '❌ Error fetching contracts')
          );
        }
      } catch (error: any) {
        // Delete processing message
        try {
          await this.bot.deleteMessage(msg.chat.id, processingMsg.message_id);
        } catch (e) {
          // Ignore if message already deleted
        }

        console.error('Error calling Python bridge:', error);
        await this.bot.sendMessage(
          msg.chat.id,
          lng === 'ru'
            ? '❌ Ошибка подключения к сервису контрактов'
            : '❌ Error connecting to contract service'
        );
      }
    } catch (error) {
      console.error('Error in handleContractsCommand:', error);
      const lng = await this.getUserLanguage(msg.from!.id);
      await this.bot.sendMessage(
        msg.chat.id,
        i18n.t('errors.generic', lng)
      );
    }
  }

  private async handleApiStatsCommand(
    msg: TelegramBot.Message,
    hours: number
  ): Promise<void> {
    try {
      const lng = await this.getUserLanguage(msg.from!.id);

      // Send "processing" message
      const processingMsg = await this.bot.sendMessage(
        msg.chat.id,
        lng === 'ru' ? '📊 Загрузка статистики...' : '📊 Loading statistics...'
      );

      // Call Python bridge
      const command = `${ContractsCommandHandler.interpreter} ${PYTHON_BRIDGE} api_stats ${hours} ${lng}`;

      try {
        const { stdout, stderr } = await execAsync(command, {
          timeout: 10000,
          maxBuffer: 1024 * 1024,
        });

        if (stderr && !stderr.includes('Warning')) {
          console.error('Python bridge stderr:', stderr);
        }

        const result = JSON.parse(stdout);

        // Delete processing message
        await this.bot.deleteMessage(msg.chat.id, processingMsg.message_id);

        if (result.success) {
          await this.bot.sendMessage(msg.chat.id, result.message, {
            parse_mode: 'HTML',
          });
        } else {
          await this.bot.sendMessage(
            msg.chat.id,
            result.error ||
              (lng === 'ru'
                ? '❌ Ошибка получения статистики'
                : '❌ Error fetching statistics')
          );
        }
      } catch (error: any) {
        // Delete processing message
        try {
          await this.bot.deleteMessage(msg.chat.id, processingMsg.message_id);
        } catch (e) {
          // Ignore if message already deleted
        }

        console.error('Error calling Python bridge:', error);
        await this.bot.sendMessage(
          msg.chat.id,
          lng === 'ru'
            ? '❌ Ошибка подключения к сервису статистики'
            : '❌ Error connecting to statistics service'
        );
      }
    } catch (error) {
      console.error('Error in handleApiStatsCommand:', error);
      const lng = await this.getUserLanguage(msg.from!.id);
      await this.bot.sendMessage(
        msg.chat.id,
        i18n.t('errors.generic', lng)
      );
    }
  }
}

