const db = require('../src/db');
function seedReviews() {
  if (process.env.NODE_ENV === 'test' || process.env.DEMO_DATA === 'false' || db.prepare('SELECT 1 FROM app_migration WHERE name = ?').get('sample-reviews-v1')) return;
  const comments = {
    'The Spice Tailor': ['The vegetable biryani was fragrant and generously portioned.', 'Loved the paneer and soft garlic naan. A comforting lunch.', 'The curry had a lovely balance of spice. I would order it again.', 'Good vegetarian choices and a satisfying portion of rice.', 'The samosas were crisp and the chutney added a nice tang.', 'Enjoyed the mango lassi with a mildly spiced main.'],
    'Nikkei Bar': ['Fresh flavours and a nicely balanced rice bowl.', 'The edamame made a great starter before the main.', 'Really enjoyed the citrus dressing with the salmon.', 'The vegetable tempura was light and crisp.', 'Good lunch portions and a carefully prepared menu.', 'The matcha mochi was a lovely finish.'],
    'Trattoria Bianco': ['The pizza crust was crisp and the basil tasted fresh.', 'Simple pasta done well, with plenty of black pepper.', 'The bruschetta was bright and full of tomato flavour.', 'A good choice for a relaxed Italian lunch.', 'The tiramisu was creamy without being too sweet.', 'Enjoyed the rocket salad alongside a pizza.'],
    'Green Fork': ['The grain bowl was colourful and filling.', 'Great plant-based choices and a lovely tahini dressing.', 'The roasted cauliflower was the highlight of my lunch.', 'Fresh ingredients and a generous serving of vegetables.', 'The sweet potato wedges were nicely seasoned.', 'Loved the coconut chia pudding with berries.'],
    'Chophouse': ['The sirloin was tender and the potatoes were well seasoned.', 'A satisfying meal with a generous portion of sides.', 'The chicken was juicy and nicely grilled.', 'The calamari was crisp with a good lemon dressing.', 'Enjoyed the rosemary chips with the house sauce.', 'The warm brownie was a good finish to the meal.'],
    'Seoul Grill': ['The bibimbap had a great mix of vegetables and rice.', 'The kimchi stew was warming and full of flavour.', 'The pajeon was crisp at the edges and delicious.', 'The gochujang sauce added just the right amount of heat.', 'A satisfying Korean lunch with generous portions.', 'The yuzu soda was refreshing with a spicy main.'],
  };
  db.exec('BEGIN');
  try {
    const ids = [];
    for (let i = 0; i < 6; i++) {
      const email = 'catalog-reader-' + i + '@sample.smartdine.invalid';
      db.prepare('INSERT OR IGNORE INTO user (username,email,password_hash,role,is_active) VALUES (?,?,?, ?,0)').run('Local reader ' + (i + 1), email, 'disabled-synthetic-account', 'customer');
      ids.push(db.prepare('SELECT user_id FROM user WHERE email = ?').get(email).user_id);
    }
    for (const [name, reviews] of Object.entries(comments)) {
      const r = db.prepare('SELECT restaurant_id FROM restaurant WHERE name = ?').get(name); if (!r) continue;
      reviews.forEach((comment, i) => db.prepare('INSERT INTO feedback (user_id,restaurant_id,rating,comment) VALUES (?,?,?,?)').run(ids[i], r.restaurant_id, [5,4,5,4,4,5][i], comment));
    }
    db.prepare('INSERT INTO app_migration (name) VALUES (?)').run('sample-reviews-v1'); db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
module.exports = { seedReviews };
if (require.main === module) { seedReviews(); db.close(); }
