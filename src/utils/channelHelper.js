const logger = require('./logger');

async function verifyChannelAccess(bot) {
  try {
    // Verify bot's access to channel
    await bot.getChat(process.env.CHANNEL);
    
    // Try to send a test message
    const testMsg = await bot.sendMessage(process.env.CHANNEL, 'Bot access verification');
    await bot.deleteMessage(process.env.CHANNEL, testMsg.message_id);
    
    return true;
  } catch (error) {
    logger.error('Channel access verification failed:', error);
    return false;
  }
}

async function checkBotPermissions(bot) {
  try {
    const botUser = await bot.getMe();
    const chatMember = await bot.getChatMember(process.env.CHANNEL, botUser.id);
    
    const requiredPermissions = [
      'can_post_messages',
      'can_edit_messages',
      'can_delete_messages'
    ];
    
    const missingPermissions = requiredPermissions.filter(
      permission => !chatMember[permission]
    );
    
    if (missingPermissions.length > 0) {
      logger.error('Missing channel permissions:', missingPermissions);
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Permission check failed:', error);
    return false;
  }
}

module.exports = { verifyChannelAccess, checkBotPermissions };