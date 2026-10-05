const db = require('../db');
const webpush = require('web-push');

const { promotionActive } = require('./promotion');
function pushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}
async function deliverPush(notification, userId, sender = webpush.sendNotification) {
  if (!pushConfigured()) return 'in_app';
  const devices = db.prepare('SELECT * FROM push_subscription WHERE user_id = ?').all(userId);
  if (!devices.length) return 'in_app';
  const results = await Promise.all(devices.map(async device => {
    try {
      await sender({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
        JSON.stringify({ title: 'SmartDine offer nearby', body: notification.message, notificationId: notification.notif_id }),
        { TTL: 300, timeout: 5000, vapidDetails: { subject: process.env.VAPID_SUBJECT, publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY } });
      return true;
    } catch (error) {
      if ([404, 410].includes(error.statusCode)) db.prepare('DELETE FROM push_subscription WHERE subscription_id = ?').run(device.subscription_id);
      return false;
    }
  }));
  const status = results.every(Boolean) ? 'push_accepted' : results.some(Boolean) ? 'push_partial' : 'push_failed';
  db.prepare('UPDATE notification SET push_status = ? WHERE notif_id = ?').run(status, notification.notif_id);
  return status;
}
module.exports = { promotionActive, deliverPush, pushConfigured };
