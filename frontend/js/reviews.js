import { $, api, escape, time, toast, busy, icons } from './common.js';
export async function initReviews(id, user) {
  let page = 1;
  let pages = 1;
  const customer = user?.role === 'customer';
  $('#reviews-content').innerHTML = `<div id="review-summary" class="review-summary"></div><div id="review-list" aria-live="polite"></div><div class="review-pagination"><button class="icon-button" id="reviews-prev" title="Previous reviews" aria-label="Previous reviews"><i data-lucide="chevron-left"></i></button><span id="review-page"></span><button class="icon-button" id="reviews-next" title="Next reviews" aria-label="Next reviews"><i data-lucide="chevron-right"></i></button></div>${customer ? '<form id="review-form" class="review-form"><h3>Your experience</h3><label for="review-rating">Rating</label><select id="review-rating" required><option value="">Choose a rating</option><option value="5">5 - Excellent</option><option value="4">4 - Good</option><option value="3">3 - Average</option><option value="2">2 - Poor</option><option value="1">1 - Very poor</option></select><label for="review-comment">Review (optional)</label><textarea id="review-comment" rows="3" maxlength="500" placeholder="What did you enjoy?"></textarea><p class="small muted">One current review per restaurant. Saving again updates your review.</p><button class="button" type="submit"><i data-lucide="star"></i> Save review</button></form>' : !user ? '<p><a href="/login.html">Log in</a> to share your experience.</p>' : ''}`;
  async function load() {
    const result = await api('/feedback/' + id + '?page=' + page + '&page_size=5');
    $('#average-rating').textContent = result.average_rating ?? 'New';
    $('#review-count').textContent = result.rating_count + (result.rating_count === 1 ? ' review' : ' reviews');
    $('#review-summary').innerHTML = `<strong>${result.average_rating ?? '-'}</strong><div><span class="stars" aria-hidden="true">${'★'.repeat(Math.round(result.average_rating || 0))}</span><p class="muted small">${result.rating_count} customer ${result.rating_count === 1 ? 'review' : 'reviews'}</p></div>`;
    $('#review-list').innerHTML = result.reviews.length ? result.reviews.map(r => `<article class="feedback-row"><div class="review-meta"><strong aria-label="${r.rating} out of 5 stars" class="stars">${'★'.repeat(r.rating)}<span class="muted">${'☆'.repeat(5 - r.rating)}</span></strong><time>${time(r.submitted_at)}</time></div><p>${escape(r.comment || 'Rating without a comment.')}</p></article>`).join('') : '<p class="empty">No reviews yet. Share your first impression.</p>';
    pages = Math.max(1, Math.ceil(result.rating_count / 5));
    $('#reviews-prev').disabled = page <= 1; $('#reviews-next').disabled = !result.has_next;
    $('#review-page').textContent = 'Page ' + page + ' of ' + pages; icons();
  }
  async function changePage(delta) {
    const previous = page; page += delta;
    $('#reviews-prev').disabled = true; $('#reviews-next').disabled = true;
    try { await load(); } catch (error) { page = previous; toast(error.message, true); }
    finally { $('#reviews-prev').disabled = page <= 1; $('#reviews-next').disabled = page >= pages; }
  }
  $('#reviews-prev').addEventListener('click', () => changePage(-1));
  $('#reviews-next').addEventListener('click', () => changePage(1));
  if (customer) {
    const mine = await api('/feedback/' + id + '/mine');
    if (mine) { $('#review-rating').value = mine.rating; $('#review-comment').value = mine.comment || ''; }
    $('#review-form').addEventListener('submit', event => {
      event.preventDefault(); busy(event.submitter, async () => {
        await api('/feedback/' + id, { method: 'POST', body: { rating: Number($('#review-rating').value), comment: $('#review-comment').value.trim() } });
        page = 1; await load(); toast('Your review has been saved.');
      });
    });
  }
  await load();
}
