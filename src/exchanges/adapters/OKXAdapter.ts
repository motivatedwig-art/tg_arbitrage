import ccxt from 'ccxt';
import { BaseExchangeAdapter } from './BaseExchangeAdapter.js';
import { ExchangeConfig } from '../types/index.js';

export class OKXAdapter extends BaseExchangeAdapter {
  constructor(config: ExchangeConfig) {
    super(config);
  }

  protected createExchange(): any {
    return new ccxt.okx({
      apiKey: this.config.apiKey,
      secret: this.config.apiSecret,
      password: this.config.passphrase,
      sandbox: this.config.sandbox || false,
      rateLimit: this.config.rateLimit || 100,
      enableRateLimit: this.config.enableRateLimit !== false
    });
  }
}
