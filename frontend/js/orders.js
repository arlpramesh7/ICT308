import { $, api, guard, escape, money, time, icons, busy } from './common.js';
const user = await guard(['customer']);
const detail = location.pathname === '/order.html';
const id = Number(new URLSearchParams(location.search).get('id'));
const stages = ['Placed', 'Confirmed', 'Preparing', 'Ready', 'Completed'];
async function load() {
  if (detail) {
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Order not found.');
    const order = await api('/orders/' + id);
    $('#order-heading').textContent = order.order_number;
    if (new URLSearchParams(location.search).get('placed')) $('#confirmation-label').textContent = 'Order placed successfully';
    document.title = order.order_number + ' | SmartDine';
    $('#orders-content').innerHTML = '<ol class="order-progress" aria-label="Order status">' + stages.map((stage, index) => '<li class="' + (index <= stages.indexOf(order.status) ? 'reached' : '') + '"' + (stage === order.status ? ' aria-current="step"' : '') + '><i data-lucide="' + (index <= stages.indexOf(order.status) ? 'check-circle' : 'circle') + '"></i> ' + stage + '</li>').join('') + '</ol><div class="checkout-layout"><section><h2>' + escape(order.restaurant_name) + '</h2><p class="muted">Placed ' + time(order.created_at) + '</p>' + order.items.map(i => '<div class="cart-row"><div class="cart-description"><h3>' + escape(i.item_name) + '</h3><p class="small muted">' + i.quantity + ' &times; ' + money(i.unit_price_cents / 100) + '</p></div><strong>' + money(i.line_total_cents / 100) + '</strong></div>').join('') + '<p class="checkout-notice">No payment collected. This order is stored in SmartDine and is not sent to an external restaurant.</p></section><aside class="order-summary"><h2>Pickup information</h2><p><strong>' + escape(order.customer_name) + '</strong></p>' + (order.contact_phone ? '<p>' + escape(order.contact_phone) + '</p>' : '') + (order.pickup_notes ? '<p class="order-notes">' + escape(order.pickup_notes) + '</p>' : '') + '<p>Status: <strong>' + escape(order.status) + '</strong></p><dl><dt>Total</dt><dd><strong>' + money(order.total_cents / 100) + '</strong></dd></dl><a class="text-link" href="/restaurant.html?id=' + order.restaurant_id + '">Restaurant details <i data-lucide="arrow-right"></i></a></aside></div>';
  } else {
    const orders = await api('/orders');
    $('#orders-content').innerHTML = orders.length ? orders.map(o => '<article class="order-history-row"><div><h2><a href="/order.html?id=' + o.order_id + '">' + escape(o.order_number) + '</a></h2><p>' + escape(o.restaurant_name) + ' &middot; Pickup</p><p class="small muted">' + time(o.created_at) + '</p></div><div class="order-history-summary"><span class="badge">' + escape(o.status) + '</span><strong>' + money(o.total_cents / 100) + '</strong><a class="text-link" href="/order.html?id=' + o.order_id + '">View order <i data-lucide="arrow-right"></i></a></div></article>').join('') : '<p class="empty">You have no orders yet.</p><a class="button" href="/customer.html">Find a restaurant</a>';
  }
  icons();
}
if (user) {
  try { await load(); } catch (error) { $('#orders-content').innerHTML = '<p class="message">' + escape(error.message) + '</p>'; }
  $('#refresh-orders').addEventListener('click', event => busy(event.currentTarget, load));
}
