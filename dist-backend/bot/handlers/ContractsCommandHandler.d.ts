/**
 * TypeScript handler for /contracts and /api_stats commands
 * Integrates with Python contract resolver via subprocess
 */
import TelegramBot from 'node-telegram-bot-api';
export declare class ContractsCommandHandler {
    private bot;
    private db;
    constructor(bot: TelegramBot);
    /** Interpreter name resolved by isAvailable(); used by every invocation. */
    private static interpreter;
    /**
     * Whether the Python side this handler depends on can actually run.
     *
     * The commands are only worth registering if they can succeed. The deploy
     * image installs Node alone (nixpacks.toml lists nodejs_20 and nothing runs
     * pip), so on Railway this is expected to be false and the commands stay
     * unregistered rather than failing in front of a user.
     */
    static isAvailable(): Promise<boolean>;
    registerCommands(): void;
    private getUserLanguage;
    private handleContractsCommand;
    private handleApiStatsCommand;
}
//# sourceMappingURL=ContractsCommandHandler.d.ts.map