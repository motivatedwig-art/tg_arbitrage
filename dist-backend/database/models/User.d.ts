import { Database } from 'sqlite3';
import { User } from '../../exchanges/types';
export declare class UserModel {
    private db;
    constructor(db: Database);
    createTable(): Promise<void>;
    findByTelegramId(telegramId: number): Promise<User | null>;
    create(user: User): Promise<void>;
    update(user: User): Promise<void>;
    updateLanguage(telegramId: number, language: 'en' | 'ru'): Promise<void>;
    updateNotifications(telegramId: number, notifications: boolean): Promise<void>;
    getAllActiveUsers(): Promise<User[]>;
}
//# sourceMappingURL=User.d.ts.map