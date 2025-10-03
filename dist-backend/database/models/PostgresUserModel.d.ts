import { DatabaseManagerPostgres } from '../DatabasePostgres.js';
import { User } from '../../exchanges/types/index.js';
export declare class PostgresUserModel {
    private db;
    constructor(db: DatabaseManagerPostgres);
    createTable(): Promise<void>;
    findByTelegramId(telegramId: number): Promise<User | null>;
    create(user: User): Promise<void>;
    update(user: User): Promise<void>;
    updateLanguage(telegramId: number, language: 'en' | 'ru'): Promise<void>;
    updateNotifications(telegramId: number, notifications: boolean): Promise<void>;
    getAllActiveUsers(): Promise<User[]>;
}
//# sourceMappingURL=PostgresUserModel.d.ts.map