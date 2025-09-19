import ccxt from 'ccxt';
import { BaseExchangeAdapter } from './BaseExchangeAdapter.js';
import { ExchangeConfig } from '../types/index.js';

export class KucoinAdapter extends BaseExchangeAdapter {
  constructor(config: ExchangeConfig) {
    super(config);
  }

  protected createExchange(): any {
    return new ccxt.kucoin({
      apiKey: this.config.apiKey,
      secret: this.config.apiSecret,
      password: this.config.passphrase,
      sandbox: this.config.sandbox || false,
      rateLimit: this.config.rateLimit || 334, // KuCoin has specific rate limits
      enableRateLimit: this.config.enableRateLimit !== false,
      options: {
        defaultType: 'spot'
      }
    });
  }
}
