import { $, api, guard, escape, money, icons, busy, updateCartCount } from './common.js';
const user = await guard(['customer']);
let cart;
function render(value) {
  cart = value; updateCartCount(cart);
  if (!cart.items.length) { $('#cart-content').innerHTML = '<p class="empty">Your cart is empty.</p><a class="button" href="/customer.html">Find a restaurant</a>'; return; }
  $('#cart-content').innerHTML = '<div class="checkout-layout"><section><div class="section-heading"><div><h2>' + escape(cart.restaurant.name) + '</h2><a href="/restaurant.html?id=' + cart.restaurant.restaurant_id + '">Add more items</a></div><button class="icon-button" id="clear-cart" title="Clear cart" aria-label="Clear cart"><i data-lucide="trash-2"></i></button></div><div>' + cart.items.map(i => '<article class="cart-row"><div class="cart-description"><h3>' + escape(i.item_name) + '</h3><p class="muted small">' + money(i.unit_price_cents / 100) + ' each' + (!i.available ? ' &middot; Unavailable' : '') + '</p></div><div class="quantity-control" aria-label="Quantity for ' + escape(i.item_name) + '"><button class="icon-button" data-change="-1" data-id="' + i.item_id + '" title="Decrease ' + escape(i.item_name) + ' quantity" aria-label="Decrease ' + escape(i.item_name) + ' quantity"><i data-lucide="minus"></i></button><output>' + i.quantity + '</output><button class="icon-button" data-change="1" data-id="' + i.item_id + '" title="Increase ' + escape(i.item_name) + ' quantity" aria-label="Increase ' + escape(i.item_name) + ' quantity"' + (i.quantity >= 20 || !i.available ? ' disabled' : '') + '><i data-lucide="plus"></i></button></div><strong>' + money(i.line_total_cents / 100) + '</strong><button class="icon-button" data-remove="' + i.item_id + '" title="Remove ' + escape(i.item_name) + '" aria-label="Remove ' + escape(i.item_name) + '"><i data-lucide="x"></i></button></article>').join('') + '</div><p class="small muted">One restaurant per cart. Menu prices include applicable taxes; promotional offers are confirmed separately at pickup.</p></section><aside class="order-summary"><h2>Order summary</h2><dl><dt>Subtotal</dt><dd>' + money(cart.subtotal_cents / 100) + '</dd><dt>Pickup fee</dt><dd>' + money(0) + '</dd><dt><strong>Total</strong></dt><dd><strong>' + money(cart.total_cents / 100) + '</strong></dd></dl><p class="small">Pickup at ' + escape(cart.restaurant.address) + '</p>' + (cart.can_checkout ? '<a class="button wide" href="/checkout.html">Checkout <i data-lucide="arrow-right"></i></a>' : '<p class="message">The restaurant is closed or an item is unavailable. Remove unavailable items or return during opening hours.</p>') + '</aside></div>';
  icons();
}
if (user) {
  try { render(await api('/cart')); } catch (error) { $('#cart-content').innerHTML = '<p class="message">' + escape(error.message) + '</p>'; }
  $('#cart-content').addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    busy(button, async () => {
      if (button.id === 'clear-cart') return render(await api('/cart', { method: 'DELETE', body: {} }));
      if (button.dataset.remove) return render(await api('/cart/items/' + button.dataset.remove, { method: 'DELETE', body: {} }));
      if (button.dataset.change) {
        const item = cart.items.find(i => i.item_id === Number(button.dataset.id));
        const quantity = item.quantity + Number(button.dataset.change);
        render(await api('/cart/items/' + item.item_id, quantity ? { method: 'PUT', body: { quantity } } : { method: 'DELETE', body: {} }));
      }
    });
  });
}
