const { getDB } = require('../config/db');
const logger = require('../utils/logger');

async function trackUser(msg) {
  const db = getDB();
  const userId = msg.from.id;
  
  try {
    await db.collection('users').updateOne(
      { userId: userId },
      {
        $set: {
          username: msg.from.username,
          firstName: msg.from.first_name,
          lastName: msg.from.last_name,
          lastActive: new Date()
        },
        $setOnInsert: {
          joinDate: new Date()
        }
      },
      { upsert: true }
    );
  } catch (error) {
    logger.error('Error tracking user:', error);
  }
}

module.exports = { trackUser };