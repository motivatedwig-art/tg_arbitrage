import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class I18nManager {
    constructor() {
        this.initialized = false;
    }
    static getInstance() {
        if (!I18nManager.instance) {
            I18nManager.instance = new I18nManager();
        }
        return I18nManager.instance;
    }
    async init() {
        if (this.initialized)
            return;
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
    t(key, lng = 'en', options) {
        return i18next.t(key, { lng, ...options });
    }
    changeLanguage(lng) {
        return i18next.changeLanguage(lng);
    }
    getAvailableLanguages() {
        return ['en', 'ru'];
    }
    formatMessage(template, params) {
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            return params[key] !== undefined ? String(params[key]) : match;
        });
    }
}
export const i18n = I18nManager.getInstance();
//# sourceMappingURL=i18n.js.map