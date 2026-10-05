import { $, api, guard, escape, toast, busy } from './common.js';
const user = await guard();
async function registration() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('This browser does not support push alerts. In-app offers are still available.');
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}
if (user) {
  $('#account-profile').innerHTML = '<dt>Name</dt><dd>' + escape(user.username) + '</dd><dt>Email</dt><dd>' + escape(user.email) + '</dd><dt>Role</dt><dd>' + escape(user.role) + '</dd>';
  try { $('#notification-preference').checked = Boolean((await api('/privacy/settings')).notifications_enabled); } catch (error) { toast(error.message, true); }
  if (user.role !== 'customer') { $('#enable-push').hidden = true; $('#disable-push').hidden = true; $('#notification-preference').disabled = true; $('#push-status').textContent = 'Promotional offers are available for customer accounts.'; }
  else $('#push-status').textContent = 'Browser permission: ' + ('Notification' in window ? Notification.permission : 'unsupported') + '. In-app offers do not need browser permission.';
  $('#notification-preference').addEventListener('change', async () => {
    const input = $('#notification-preference'); input.disabled = true;
    try {
      await api('/privacy/settings', { method: 'PATCH', body: { notifications_enabled: input.checked } });
      if (!input.checked && 'serviceWorker' in navigator) {
        try { const reg = await navigator.serviceWorker.getRegistration(); await (await reg?.pushManager?.getSubscription())?.unsubscribe(); }
        catch { /* The server already removed subscriptions and saved the preference. */ }
      }
      toast('Notification preference saved.');
    }
    catch (error) { input.checked = !input.checked; toast(error.message, true); }
    finally { input.disabled = false; }
  });
  $('#enable-push').addEventListener('click', () => busy($('#enable-push'), async () => {
    if (!$('#notification-preference').checked) throw new Error('Enable nearby promotional offers first.');
    const reg = await registration(); const config = await api('/push/config');
    if (!config.enabled) throw new Error('Browser push is not configured. In-app offers are available.');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { $('#push-status').textContent = 'Browser alerts were not enabled. In-app offers remain available.'; return; }
    const key = Uint8Array.from(atob(config.publicKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const subscription = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    await api('/push/subscribe', { method: 'POST', body: subscription.toJSON() });
    $('#push-status').textContent = 'Browser alerts enabled for this device.'; toast('Browser alerts enabled.');
  }));
  $('#disable-push').addEventListener('click', () => busy($('#disable-push'), async () => {
    const reg = await navigator.serviceWorker?.getRegistration();
    const subscription = await reg?.pushManager?.getSubscription();
    if (subscription) { await api('/push/subscribe', { method: 'DELETE', body: { endpoint: subscription.endpoint } }); await subscription.unsubscribe(); }
    $('#push-status').textContent = 'Browser alerts disabled. In-app offers remain available.';
  }));
  $('#export-data').addEventListener('click', () => busy($('#export-data'), async () => {
    const data = await api('/privacy/export'); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'smartdine-my-data.json'; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000); toast('Your data export is ready. Check your browser downloads.');
  }));
  $('#clear-history').addEventListener('click', () => $('#history-dialog').showModal());
  $('#confirm-clear').addEventListener('click', () => busy($('#confirm-clear'), async () => { await api('/privacy/history', { method: 'DELETE', body: {} }); $('#history-dialog').close(); toast('Recommendation and offer history cleared.'); }));
  $('#delete-account-form').addEventListener('submit', event => {
    event.preventDefault(); busy(event.submitter, async () => {
      await api('/privacy/account', { method: 'DELETE', body: { password: $('#delete-password').value, confirmation: $('#delete-confirmation').value }, redirectOn401: false });
      if ('serviceWorker' in navigator) {
        try { const reg = await navigator.serviceWorker.getRegistration(); await (await reg?.pushManager?.getSubscription())?.unsubscribe(); }
        catch { /* Account deletion succeeded; device cleanup must not block redirect. */ }
      }
      location.assign('/login.html');
    });
  });
}
