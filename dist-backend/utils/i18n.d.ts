export declare class I18nManager {
    private static instance;
    private initialized;
    private constructor();
    static getInstance(): I18nManager;
    init(): Promise<void>;
    t(key: string, lng?: string, options?: any): string;
    changeLanguage(lng: string): Promise<any>;
    getAvailableLanguages(): string[];
    formatMessage(template: string, params: Record<string, any>): string;
}
export declare const i18n: I18nManager;
//# sourceMappingURL=i18n.d.ts.map