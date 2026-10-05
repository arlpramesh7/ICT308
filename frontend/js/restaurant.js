import { $, api, header, escape, money, icons, busy, toast, updateCartCount } from './common.js';
import { loadFavourites, favouriteButton } from './favourites.js';
import { initReviews } from './reviews.js';
const id = Number(new URLSearchParams(location.search).get('id'));
let user = null;
try { user = await api('/auth/me', { redirectOn401: false }); } catch (error) { if (error.status !== 401) console.warn(error.message); }
header(user);
try {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Restaurant not found.');
  const r = await api('/restaurants/' + id);
  await loadFavourites(user);
  document.title = r.name + ' | SmartDine';
  if (user?.role === 'customer') api('/location/recommendations/' + id + '/viewed', { method: 'POST', body: {} }).catch(() => {});
  const categories = ['Starter', 'Main', 'Side', 'Dessert', 'Drink'].filter(c => r.menu.some(i => i.category === c));
  const other = r.menu.filter(i => !categories.includes(i.category));
  if (other.length) categories.push('Other');
  $('#restaurant-page').innerHTML = `<div class="venue-cover"><img src="${escape(r.cover_image || '/assets/indian-meal.png')}" alt="${escape(r.cuisine_type)} cuisine" width="1400" height="560"></div><div class="wrap venue-main"><a class="text-link" href="${user ? '/customer.html' : '/'}"><i data-lucide="arrow-left"></i> Restaurants</a><div class="venue-heading"><div><p class="eyebrow">${escape(r.cuisine_type)} &middot; ${escape(r.price_range)}</p><h1>${escape(r.name)}</h1><p class="venue-rating"><i data-lucide="star"></i> <strong id="average-rating">${r.average_rating ?? 'New'}</strong> <a href="#reviews" id="review-count">${r.rating_count} reviews</a> &middot; <span class="${r.is_open ? 'status-open' : 'muted'}">${r.is_open ? 'Open for pickup' : 'Closed now'}</span></p><p class="muted">${escape(r.address)}</p></div><div class="actions" id="venue-actions"><a class="button secondary" href="https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}&travelmode=walking" target="_blank" rel="noopener noreferrer"><i data-lucide="navigation"></i> Directions</a></div></div><div class="venue-info"><p>${escape(r.description)}</p><div><p><i data-lucide="clock"></i> ${escape(r.opening_hours)} <small>(Sydney time)</small></p><p><i data-lucide="shopping-bag"></i> Pickup &middot; ${r.pickup_minutes}-${r.pickup_minutes + 10} minutes</p><div class="badges">${r.vegan_friendly ? '<span class="badge">Vegan options</span>' : ''}${r.vegetarian_friendly ? '<span class="badge">Vegetarian options</span>' : ''}</div></div></div>${r.promotion_active ? `<p class="offer venue-offer"><i data-lucide="tag"></i> ${escape(r.promotion_text)}</p>` : ''}<nav class="category-nav" aria-label="Menu categories">${categories.map(c => `<a href="#menu-${c}">${c === 'Main' ? 'Mains' : c + (c === 'Other' ? '' : 's')}</a>`).join('')}<a href="#reviews">Reviews</a></nav><div class="venue-layout"><div><section id="full-menu">${categories.map(c => `<section class="menu-category" id="menu-${c}"><h2>${c === 'Main' ? 'Mains' : c + (c === 'Other' ? '' : 's')}</h2><div class="dish-grid">${(c === 'Other' ? other : r.menu.filter(i => i.category === c)).map(i => `<article class="dish"><div><h3>${escape(i.item_name)}</h3><p class="muted small">${escape(i.description)}</p><p class="small">${i.vegan ? 'Vegan' : i.vegetarian ? 'Vegetarian' : ''}</p><strong>${money(i.price)}</strong>${!i.is_available ? '<span class="badge neutral">Unavailable</span>' : ''}</div><div class="dish-action" data-item="${i.item_id}"></div></article>`).join('')}</div></section>`).join('') || '<p class="empty">The menu is currently unavailable.</p>'}</section><p class="small muted">Please confirm allergies and preparation requirements with the restaurant.</p><section id="reviews" class="reviews-section"><h2>Customer reviews</h2><div id="reviews-content"><p class="empty">Loading reviews...</p></div></section></div><aside id="venue-side"><h2>Pickup</h2><p>${escape(r.address)}</p><p class="muted">${escape(r.opening_hours)}</p><a class="button secondary wide" href="#full-menu">Browse menu <i data-lucide="arrow-up"></i></a></aside></div></div>`;
  $('#venue-actions').insertAdjacentHTML('beforeend', favouriteButton(id));
  for (const item of r.menu.filter(i => i.is_available)) {
    const target = document.querySelector('[data-item="' + item.item_id + '"]');
    if (user?.role === 'customer') target.innerHTML = '<button class="icon-button" data-add="' + item.item_id + '" title="Add ' + escape(item.item_name) + ' to cart" aria-label="Add ' + escape(item.item_name) + ' to cart"><i data-lucide="plus"></i></button>';
    else if (!user) target.innerHTML = '<a class="text-link" href="/login.html">Log in to order</a>';
  }
  if (user?.role === 'customer') $('#venue-side').insertAdjacentHTML('beforeend', '<a class="button wide" href="/cart.html"><i data-lucide="shopping-bag"></i> View cart</a>');
  let pendingSwitch;
  document.body.insertAdjacentHTML('beforeend', '<dialog id="cart-switch-dialog" aria-labelledby="cart-switch-title" aria-describedby="cart-switch-description"><h2 id="cart-switch-title">Switch restaurants?</h2><p id="cart-switch-description"></p><div class="actions cart-switch-actions"><button class="button secondary" id="cancel-cart-switch" autofocus>Cancel</button><button class="button" id="confirm-cart-switch"><i data-lucide="shopping-bag"></i> Clear cart &amp; add item</button></div></dialog>');
  const switchDialog = $('#cart-switch-dialog');
  $('#cancel-cart-switch').addEventListener('click', () => switchDialog.close());
  switchDialog.addEventListener('close', () => { pendingSwitch = null; });
  $('#confirm-cart-switch').addEventListener('click', event => busy(event.currentTarget, async () => {
    if (!pendingSwitch) return;
    const cart = await api('/cart/switch', { method: 'POST', body: pendingSwitch });
    updateCartCount(cart); switchDialog.close(); toast('Cart switched. Item added.');
  }));
  $('#full-menu').addEventListener('click', event => {
    const button = event.target.closest('[data-add]');
    if (button) busy(button, async () => {
      const itemId = Number(button.dataset.add);
      try {
        const cart = await api('/cart/items', { method: 'POST', body: { item_id: itemId, quantity: 1 } });
        updateCartCount(cart); toast('Added to your cart.');
      } catch (error) {
        if (error.code !== 'CART_RESTAURANT_CONFLICT') throw error;
        const cart = await api('/cart');
        if (!cart.restaurant) throw new Error('Your cart changed. Please try adding the item again.');
        pendingSwitch = { item_id: itemId, quantity: 1, cart_revision: cart.revision };
        $('#cart-switch-description').textContent = 'Your cart contains items from another restaurant. You have ' + cart.item_count + ' item' + (cart.item_count === 1 ? '' : 's') + ' from ' + cart.restaurant.name + '. Clear those items and add this item from ' + r.name + '?';
        switchDialog.showModal(); $('#cancel-cart-switch').focus();
      }
    });
  });
  await initReviews(id, user);
  icons();
} catch (error) { $('#restaurant-page').innerHTML = '<div class="wrap band"><h1>Restaurant unavailable</h1><p>' + escape(error.message) + '</p><a class="button" href="/customer.html">Back to restaurants</a></div>'; }
