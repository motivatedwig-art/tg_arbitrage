import ccxt from 'ccxt';
import { BaseExchangeAdapter } from './BaseExchangeAdapter.js';
import { ExchangeConfig } from '../types/index.js';

export class BybitAdapter extends BaseExchangeAdapter {
  constructor(config: ExchangeConfig) {
    super(config);
  }

  protected createExchange(): any {
    return new ccxt.bybit({
      apiKey: this.config.apiKey,
      secret: this.config.apiSecret,
      sandbox: this.config.sandbox || false,
      rateLimit: this.config.rateLimit || 120,
      enableRateLimit: this.config.enableRateLimit !== false,
      options: {
        defaultType: 'spot' // Use spot trading
      }
    });
  }
}
