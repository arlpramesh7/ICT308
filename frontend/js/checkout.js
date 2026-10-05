import { $, api, guard, escape, money, icons, busy } from './common.js';
import { validPhone } from './phone-validation.js';
const user = await guard(['customer']);
if (user) {
  try {
    const cart = await api('/cart');
    if (!cart.can_checkout) throw new Error('Review your cart before checkout. The restaurant must be open and all items available.');
    const storageKey = 'smartdine-checkout-' + user.user_id;
    let attempt;
    try { attempt = JSON.parse(sessionStorage.getItem(storageKey)); } catch {}
    if (attempt?.revision !== cart.revision) { attempt = { revision: cart.revision, key: crypto.randomUUID() }; sessionStorage.setItem(storageKey, JSON.stringify(attempt)); }
    $('#checkout-content').innerHTML = '<div class="checkout-layout"><form id="checkout-form"><h2>Pickup details</h2><label class="check"><input type="radio" name="fulfilment" value="pickup" checked> Pickup from ' + escape(cart.restaurant.name) + '</label><p class="muted">' + escape(cart.restaurant.address) + ' &middot; Usually ' + cart.restaurant.pickup_minutes + '-' + (cart.restaurant.pickup_minutes + 10) + ' minutes after confirmation.</p><label for="pickup-name">Name for pickup</label><input id="pickup-name" name="customer_name" required minlength="2" maxlength="80" autocomplete="name" value="' + escape(user.display_name || user.username) + '"><label for="pickup-phone">Phone (optional)</label><input id="pickup-phone" name="contact_phone" type="tel" maxlength="25" aria-describedby="pickup-phone-error" autocomplete="tel"><p id="pickup-phone-error" class="field-error" role="alert" hidden></p><label for="pickup-notes">Pickup notes (optional)</label><textarea id="pickup-notes" name="pickup_notes" maxlength="500" rows="3"></textarea><p class="checkout-notice">Payment is handled at pickup; no online payment is collected. Orders are stored in SmartDine for its restaurant portal, not sent to an external restaurant service.</p><label class="check"><input type="checkbox" required> I understand payment is handled at the restaurant, not online.</label><button class="button wide" type="submit"><i data-lucide="check"></i> Place order</button></form><aside class="order-summary"><h2>' + escape(cart.restaurant.name) + '</h2>' + cart.items.map(i => '<p class="summary-item"><span>' + i.quantity + ' &times; ' + escape(i.item_name) + '</span><strong>' + money(i.line_total_cents / 100) + '</strong></p>').join('') + '<dl><dt>Subtotal</dt><dd>' + money(cart.subtotal_cents / 100) + '</dd><dt>Pickup fee</dt><dd>' + money(0) + '</dd><dt><strong>Total</strong></dt><dd><strong>' + money(cart.total_cents / 100) + '</strong></dd></dl><p class="small muted">AUD. Menu prices include applicable taxes. Promotional offers are confirmed separately at pickup.</p></aside></div>';
    icons();
    const phone = $('#pickup-phone');
    const phoneError = $('#pickup-phone-error');
    function checkPhone(focus = false) {
      const valid = validPhone(phone.value);
      phone.setAttribute('aria-invalid', String(!valid));
      phoneError.hidden = valid;
      phoneError.textContent = valid ? '' : 'Enter a valid phone number or leave this field blank.';
      if (!valid && focus) phone.focus();
      return valid;
    }
    phone.addEventListener('input', () => { if (phone.getAttribute('aria-invalid') === 'true') checkPhone(); });
    phone.addEventListener('blur', () => checkPhone());
    $('#checkout-form').addEventListener('submit', event => {
      event.preventDefault();
      if (!checkPhone(true)) return;
      busy(event.submitter, async () => {
        let order;
        try { order = await api('/orders', { method: 'POST', body: { customer_name: $('#pickup-name').value, contact_phone: $('#pickup-phone').value, pickup_notes: $('#pickup-notes').value, fulfilment: 'pickup', cart_revision: cart.revision, idempotency_key: attempt.key } }); }
        catch (error) {
          if (error.fields.some(field => field.field === 'contact_phone')) {
            phoneError.textContent = 'Enter a valid phone number or leave this field blank.';
            phoneError.hidden = false; phone.setAttribute('aria-invalid', 'true'); phone.focus(); return;
          }
          throw error;
        }
        sessionStorage.removeItem(storageKey); location.assign('/order.html?id=' + order.order_id + '&placed=1');
      });
    });
  } catch (error) { $('#checkout-content').innerHTML = '<p class="message">' + escape(error.message) + '</p><a class="button" href="/cart.html">Review cart</a>'; }
}
