const { getDB } = require('../config/db');
const logger = require('../utils/logger');

async function handleFile(bot, msg) {
  const chatId = msg.chat.id;
  const file = msg.document || msg.audio || msg.video || msg.photo?.[0];
  
  if (!file) {
    await bot.sendMessage(chatId, '❌ Please send a valid file');
    return;
  }

  try {
    // Send processing message
    const processingMsg = await bot.sendMessage(chatId, '🔄 Processing your file...');

    // Verify channel access
    try {
      await bot.getChat(process.env.CHANNEL);
    } catch (error) {
      logger.error('Channel access error:', error);
      await bot.sendMessage(chatId, '❌ Sorry, there was an error accessing the storage channel. Please contact the admin.');
      return;
    }

    // Forward file to storage channel
    const forwarded = await bot.forwardMessage(
      process.env.CHANNEL,
      chatId,
      msg.message_id
    );

    // Generate bot-specific shareable link
    const botUsername = (await bot.getMe()).username;
    const fileLink = `https://t.me/${botUsername}?start=file_${forwarded.message_id}`;
    
    // Store in database
    const db = getDB();
    await db.collection('files').insertOne({
      fileId: file.file_id,
      userId: msg.from.id,
      messageId: forwarded.message_id,
      fileName: file.file_name || 'Unnamed file',
      fileSize: file.file_size,
      mimeType: file.mime_type,
      link: fileLink,
      channelMessageId: forwarded.message_id,
      timestamp: new Date()
    });

    // Delete processing message
    await bot.deleteMessage(chatId, processingMsg.message_id);

    // Send success message with formatted text
    const successMessage = `
🎉 *File stored successfully!*

📁 *File Name:* ${file.file_name || 'Unnamed file'}
📊 *Size:* ${formatFileSize(file.file_size)}
🔗 *Share Link:* [Click Here](${fileLink})

_Click the link to instantly receive the file_ 📨
    `;

    await bot.sendMessage(chatId, successMessage, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [[
          { text: '📎 Share Link', url: fileLink }
        ]]
      }
    });

  } catch (error) {
    logger.error('Error handling file:', error);
    await bot.sendMessage(chatId, '❌ Error processing your file. Please try again.');
  }
}

async function handleFileShare(bot, msg, fileMessageId) {
  const chatId = msg.chat.id;
  
  try {
    const db = getDB();
    const fileDoc = await db.collection('files').findOne({ channelMessageId: parseInt(fileMessageId) });
    
    if (!fileDoc) {
      await bot.sendMessage(chatId, '❌ Sorry, this file is no longer available.');
      return;
    }

    // Send processing message
    const processingMsg = await bot.sendMessage(chatId, '🔄 Fetching your file...');

    // Forward the file from channel to user
    await bot.forwardMessage(chatId, process.env.CHANNEL, fileDoc.channelMessageId);

    // Delete processing message
    await bot.deleteMessage(chatId, processingMsg.message_id);

    // Send success message
    await bot.sendMessage(chatId, '✅ Here\'s your file!\n\n_Feel free to send me more files to store and share!_ 🚀', {
      parse_mode: 'Markdown'
    });

  } catch (error) {
    logger.error('Error handling file share:', error);
    await bot.sendMessage(chatId, '❌ Error retrieving the file. Please try again.');
  }
}

function formatFileSize(bytes) {
  if (!bytes) return 'Unknown size';
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

module.exports = { handleFile, handleFileShare };