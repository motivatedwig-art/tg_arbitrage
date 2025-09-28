import type { VercelRequest, VercelResponse } from '@vercel/node';
import TelegramBot from 'node-telegram-bot-api';

// Simple bot instance for webhook handling
let bot: TelegramBot;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Initialize bot if not already done
    if (!bot) {
      console.log('Initializing Telegram bot for webhook...');
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) {
        throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
      }
      
      // Create bot instance without polling
      bot = new TelegramBot(token, { polling: false });
      
      // Set up basic command handlers
      bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const webappUrl = process.env.WEBAPP_URL || 'https://crypto-arbitrage-tg.vercel.app';
        
        bot.sendMessage(chatId, `🚀 Welcome to Crypto Arbitrage Bot!\n\nClick the button below to open the arbitrage scanner:`, {
          reply_markup: {
            inline_keyboard: [[
              {
                text: '📊 Open Arbitrage Scanner',
                web_app: { url: webappUrl }
              }
            ]]
          }
        });
      });
      
      bot.onText(/\/help/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, `🤖 Crypto Arbitrage Bot Help\n\nCommands:\n/start - Start the bot\n/help - Show this help\n\nUse the web app to view real-time arbitrage opportunities across multiple exchanges.`);
      });
      
      console.log('Bot initialized successfully');
    }
    
    // Process the update
    const update = req.body;
    console.log('Received update:', JSON.stringify(update, null, 2));
    
    // Let the bot handle the update
    await bot.processUpdate(update);
    
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
}
