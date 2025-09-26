import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CryptoArbitrageBot } from '../src/bot/TelegramBot.js';

let bot: CryptoArbitrageBot;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Initialize bot if not already done
    if (!bot) {
      console.log('Initializing Telegram bot...');
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) {
        throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
      }
      bot = new CryptoArbitrageBot(token);
      await bot.start();
    }
    
    // Process update
    await bot.getBot().processUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}
