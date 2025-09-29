import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class I18nManager {
  private static instance: I18nManager;
  private initialized = false;

  private constructor() {}

  public static getInstance(): I18nManager {
    if (!I18nManager.instance) {
      I18nManager.instance = new I18nManager();
    }
    return I18nManager.instance;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    await i18next
      .use(Backend)
      .init({
        lng: 'en',
        fallbackLng: 'en',
        debug: process.env.NODE_ENV === 'development',
        backend: {
          loadPath: path.join(__dirname, '../../locales/{{lng}}.json'),
        },
        interpolation: {
          escapeValue: false,
        },
        supportedLngs: ['en', 'ru'],
      });

    this.initialized = true;
  }

  public t(key: string, lng: string = 'en', options?: any): string {
    return i18next.t(key, { lng, ...options }) as string;
  }

  public changeLanguage(lng: string): Promise<any> {
    return i18next.changeLanguage(lng);
  }

  public getAvailableLanguages(): string[] {
    return ['en', 'ru'];
  }

  public formatMessage(template: string, params: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }
}

export const i18n = I18nManager.getInstance();
