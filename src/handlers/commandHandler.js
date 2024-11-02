const { getDB } = require('../config/db');
const logger = require('../utils/logger');
const fs = require('fs').promises;

async function handleStart(bot, msg, match) {
  const chatId = msg.chat.id;
  
  // Check if it's a file share link
  if (match && match[1] && match[1].startsWith('file_')) {
    const fileMessageId = match[1].replace('file_', '');
    const { handleFileShare } = require('./fileHandler');
    await handleFileShare(bot, msg, fileMessageId);
    return;
  }

  // Regular start command
  const message = `
🎉 *Welcome to File Store Bot!*

I'm your personal file storage assistant. Send me any file and I'll generate a shareable link instantly!

*Features:*
📤 Store any type of file
🔗 Get instant sharing links
📨 Quick file retrieval
🔐 Secure storage

*Available Commands:*
/help - Show all commands 📚
/logs - View bot logs (admin only) 📊
/users - Show bot users (admin only) 👥

_Simply send me any file to get started!_ 🚀
  `;
  
  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '📚 Help', callback_data: 'help' },
        { text: '📢 Channel', url: `https://t.me/${process.env.CHANNEL}` }
      ]]
    }
  });
}

async function handleHelp(bot, msg) {
  const chatId = msg.chat.id;
  const message = `
📚 *Available Commands:*

/start - Start the bot 🎯
/help - Show this help message ℹ️
/logs - View bot logs (admin only) 📊
/users - Show bot users (admin only) 👥

*How to use:*
1️⃣ Send any file to the bot
2️⃣ Get an instant sharing link
3️⃣ Share the link with anyone
4️⃣ Recipients get the file instantly!

*Supported File Types:*
📄 Documents
🎵 Audio files
🎬 Video files
📸 Images
...and more!

_Need help? Contact the admin_ 👨‍💻
  `;
  
  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown'
  });
}

async function handleLogs(bot, msg) {
  const chatId = msg.chat.id;
  if (msg.from.id.toString() !== process.env.ADMIN_ID) {
    await bot.sendMessage(chatId, '⛔ This command is only available to admin');
    return;
  }

  try {
    const logs = await fs.readFile('combined.log', 'utf8');
    const buffer = Buffer.from(logs, 'utf8');
    await bot.sendMessage(chatId, '📊 *Generating logs report...*', {
      parse_mode: 'Markdown'
    });
    await bot.sendDocument(chatId, buffer, {
      caption: '📋 Here are the bot logs'
    }, {
      filename: 'bot_logs.txt',
      contentType: 'text/plain'
    });
  } catch (error) {
    logger.error('Error sending logs:', error);
    await bot.sendMessage(chatId, '❌ Error retrieving logs');
  }
}

async function handleUsers(bot, msg) {
  const chatId = msg.chat.id;
  if (msg.from.id.toString() !== process.env.ADMIN_ID) {
    await bot.sendMessage(chatId, '⛔ This command is only available to admin');
    return;
  }

  try {
    const db = getDB();
    const users = await db.collection('users').find({}).toArray();
    const userList = users.map(user => 
      `👤 User Details:\nID: ${user.userId}\nUsername: @${user.username || 'N/A'}\nName: ${user.firstName} ${user.lastName || ''}\nJoined: ${user.joinDate.toLocaleDateString()}\n`
    ).join('\n');

    await bot.sendMessage(chatId, '📊 *Generating users report...*', {
      parse_mode: 'Markdown'
    });

    const buffer = Buffer.from(userList, 'utf8');
    await bot.sendDocument(chatId, buffer, {
      caption: `📋 Total Users: ${users.length}`
    }, {
      filename: 'users_list.txt',
      contentType: 'text/plain'
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    await bot.sendMessage(chatId, '❌ Error retrieving users list');
  }
}

module.exports = {
  handleStart,
  handleHelp,
  handleLogs,
  handleUsers
};