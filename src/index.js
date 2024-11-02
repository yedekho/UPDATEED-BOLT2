require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { connectDB } = require('./config/db');
const { handleStart, handleHelp, handleLogs, handleUsers } = require('./handlers/commandHandler');
const { handleFile } = require('./handlers/fileHandler');
const { trackUser } = require('./handlers/userHandler');
const { verifyChannelAccess, checkBotPermissions } = require('./utils/channelHelper');
const logger = require('./utils/logger');

async function startBot() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Create bot instance
    const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

    // Verify channel access and permissions
    const hasAccess = await verifyChannelAccess(bot);
    const hasPermissions = await checkBotPermissions(bot);

    if (!hasAccess || !hasPermissions) {
      logger.error('Bot startup failed: Channel access or permissions missing');
      console.error(`
        Please ensure:
        1. Bot is added to the channel (${process.env.CHANNEL})
        2. Bot is an admin in the channel
        3. Bot has the following permissions:
           - Can post messages
           - Can edit messages
           - Can delete messages
      `);
      process.exit(1);
    }

    // Command handlers with regex for file sharing
    bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
      await trackUser(msg);
      await handleStart(bot, msg, match);
    });

    bot.onText(/\/help/, async (msg) => {
      await trackUser(msg);
      await handleHelp(bot, msg);
    });

    bot.onText(/\/logs/, async (msg) => {
      await trackUser(msg);
      await handleLogs(bot, msg);
    });

    bot.onText(/\/users/, async (msg) => {
      await trackUser(msg);
      await handleUsers(bot, msg);
    });

    // Handle callback queries
    bot.on('callback_query', async (query) => {
      if (query.data === 'help') {
        await handleHelp(bot, query.message);
      }
      await bot.answerCallbackQuery(query.id);
    });

    // File handler
    bot.on('message', async (msg) => {
      await trackUser(msg);
      if (msg.document || msg.audio || msg.video || msg.photo) {
        await handleFile(bot, msg);
      }
    });

    // Error handler
    bot.on('polling_error', (error) => {
      logger.error('Polling error:', error);
    });

    console.log('🚀 Bot started successfully');
    logger.info('Bot started successfully with channel access verified');
  } catch (error) {
    logger.error('Bot startup error:', error);
    process.exit(1);
  }
}

startBot();