import { $, api, guard, escape, money, time, icons, busy, toast } from './common.js';
const user = await guard(['staff', 'owner']);
const nextStage = { Placed: 'Confirmed', Confirmed: 'Preparing', Preparing: 'Ready', Ready: 'Completed' };
async function load() {
  if (!$('#order-restaurant').value) return;
  const orders = await api('/orders/managed?restaurant_id=' + $('#order-restaurant').value);
  $('#managed-orders').innerHTML = orders.length ? orders.map(o => '<article class="managed-order"><div class="section-heading"><div><h2>' + escape(o.order_number) + '</h2><p class="small muted">' + time(o.created_at) + '</p></div><span class="badge">' + escape(o.status) + '</span></div><p><strong>' + escape(o.customer_name) + '</strong>' + (o.contact_phone ? ' &middot; ' + escape(o.contact_phone) : '') + '</p>' + o.items.map(i => '<p class="summary-item"><span>' + i.quantity + ' &times; ' + escape(i.item_name) + '</span><strong>' + money(i.line_total_cents / 100) + '</strong></p>').join('') + (o.pickup_notes ? '<p class="order-notes">Notes: ' + escape(o.pickup_notes) + '</p>' : '') + '<div class="section-heading"><p>Total: <strong>' + money(o.total_cents / 100) + '</strong></p>' + (nextStage[o.status] ? '<button class="button secondary" data-id="' + o.order_id + '" data-status="' + nextStage[o.status] + '"><i data-lucide="check"></i> Mark ' + nextStage[o.status] + '</button>' : '<span class="muted">Completed</span>') + '</div><p class="small muted">No payment collected.</p></article>').join('') : '<p class="empty">No pickup orders for this restaurant.</p>';
  icons();
}
if (user) {
  try {
    const venues = await api('/restaurants/managed');
    $('#order-restaurant').innerHTML = venues.map(r => '<option value="' + r.restaurant_id + '">' + escape(r.name) + '</option>').join('');
    if (!venues.length) $('#managed-orders').innerHTML = '<p class="empty">No restaurants are assigned to this account.</p>';
    await load();
  } catch (error) { $('#managed-orders').innerHTML = '<p class="message">' + escape(error.message) + '</p>'; }
  $('#order-restaurant').addEventListener('change', () => load().catch(error => toast(error.message, true)));
  $('#refresh-orders').addEventListener('click', event => busy(event.currentTarget, load));
  $('#managed-orders').addEventListener('click', event => {
    const button = event.target.closest('[data-status]');
    if (button) busy(button, async () => { await api('/orders/' + button.dataset.id + '/status', { method: 'PATCH', body: { status: button.dataset.status } }); await load(); toast('Order status updated.'); });
  });
}
