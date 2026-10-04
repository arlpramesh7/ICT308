import { $, api, guard, escape, time, toast, busy } from './common.js';
async function load() {
  const data = await api('/analytics/restaurants/' + $('#analytics-venue').value);
  $('#analytics-name').textContent = data.restaurant.name + ' · All-time activity';
  const m = data.metrics;
  const metrics = [['Recommendation impressions', m.impressions], ['Restaurant views', m.views], ['Engagement rate', (m.engagement_rate * 100).toFixed(1) + '%'], ['Average rating', m.average_rating ?? 'No ratings'], ['Total ratings', m.rating_count], ['In-app offers created', m.notifications_sent]];
  $('#metrics').innerHTML = metrics.map(([label, value]) => '<div class="metric"><span>' + label + '</span><strong>' + value + '</strong></div>').join('');
  const maximum = Math.max(1, ...data.hourly_activity.map(a => a.count));
  $('#hourly-chart').innerHTML = Array.from({ length: 24 }, (_, hour) => {
    const count = data.hourly_activity.find(a => Number(a.hour) === hour)?.count || 0;
    return '<div class="chart-column" title="' + hour + ':00 UTC · ' + count + ' impressions"><progress value="' + count + '" max="' + maximum + '" aria-label="' + hour + ':00 UTC, ' + count + ' impressions">' + count + '</progress><small>' + String(hour).padStart(2, '0') + '</small></div>';
  }).join('');
  $('#hourly-chart').setAttribute('aria-label', data.hourly_activity.length ? data.hourly_activity.map(a => a.hour + ':00 UTC: ' + a.count + ' impressions').join('; ') : 'No impressions recorded yet.');
  $('#rating-chart').innerHTML = [5, 4, 3, 2, 1].map(rating => {
    const count = data.rating_distribution.find(r => r.rating === rating)?.count || 0;
    return '<div class="distribution"><span>' + rating + ' stars</span><meter min="0" max="' + Math.max(1, m.rating_count) + '" value="' + count + '">' + count + '</meter><span>' + count + '</span></div>';
  }).join('');
  $('#recent-feedback').innerHTML = data.recent_feedback.length ? data.recent_feedback.map(r => '<article class="feedback-row"><strong>' + r.rating + ' / 5</strong><p>' + escape(r.comment || 'No comment supplied') + '</p><small class="muted">' + time(r.submitted_at) + '</small></article>').join('') : '<p class="empty">No feedback has been submitted yet.</p>';
  $('#updated-at').textContent = 'Updated ' + new Date().toLocaleString('en-AU') + ' · Views measure engagement, not verified physical visits.';
}
if (await guard(['owner'])) {
  try {
    const venues = await api('/restaurants/managed');
    $('#analytics-venue').innerHTML = venues.map(v => '<option value="' + v.restaurant_id + '">' + escape(v.name) + '</option>').join('');
    if (!venues.length) throw new Error('No restaurant is assigned to your account.');
    await load();
  } catch (error) { $('#metrics').textContent = error.message; toast(error.message, true); }
  $('#reload-analytics').addEventListener('click', () => busy($('#reload-analytics'), load));
  $('#analytics-venue').addEventListener('change', async () => { try { await load(); } catch (error) { toast(error.message, true); } });
}

