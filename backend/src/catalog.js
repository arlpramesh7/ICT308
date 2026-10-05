const venues = {
  'The Spice Tailor': ['indian', 'Slow-cooked curries, fragrant basmati rice and tandoor-baked breads. A neighbourhood kitchen for a generous lunch or a relaxed evening meal.', 20],
  'Nikkei Bar': ['japanese', 'Japanese favourites with bright citrus, seasonal vegetables and carefully prepared seafood. Small plates and satisfying rice bowls.', 25],
  'Trattoria Bianco': ['italian', 'A little Italian comfort in the city: stone-baked pizza, fresh pasta and simple ingredients, prepared with care.', 25],
  'Green Fork': ['vegetarian', 'Colourful plant-led bowls, roasted seasonal vegetables and fresh citrus dressings. Nourishing food with plenty of flavour.', 15],
  'Chophouse': ['steak', 'Chargrilled cuts, crisp sides and rich house sauces. Comforting classics with a focus on generous portions and good ingredients.', 30],
  'Seoul Grill': ['korean', 'Korean comfort food, from sizzling rice bowls to warming stews and savoury pancakes. Bold flavours for lunch and dinner.', 20],
};
const descriptions = {
  'Butter Chicken': 'Tender chicken in a slow-cooked tomato, butter and cream sauce.',
  'Vegetable Biryani': 'Fragrant basmati rice with seasonal vegetables and aromatic spices.',
  'Paneer Tikka Masala': 'Tandoor-style paneer with peppers in a spiced tomato sauce.',
  'Garlic Naan': 'Soft oven-baked flatbread brushed with garlic butter.',
  'Mango Lassi': 'A chilled blend of mango and cultured yoghurt.',
  'Salmon Tiradito': 'Thinly sliced salmon with citrus dressing and fresh herbs.',
  'Vegetable Tempura': 'Seasonal vegetables in a light, crisp batter.',
  'Cacio e Pepe': 'Pasta tossed with pecorino cheese and freshly cracked pepper.',
  'Margherita Pizza': 'Tomato, mozzarella and basil on a stone-baked crust.',
  'Harvest Grain Bowl': 'Whole grains, roasted vegetables and lemon tahini dressing.',
  'Roasted Cauliflower Steak': 'Spiced cauliflower with chickpeas and herb dressing.',
  'Dry-Aged Sirloin': 'Chargrilled sirloin with rosemary potatoes and house jus.',
  'Bibimbap': 'Rice, marinated beef, vegetables, egg and gochujang sauce.',
  'Kimchi Jjigae': 'A warming kimchi and pork stew served with steamed rice.',
};
const extras = {
  'The Spice Tailor': [['Vegetable Samosas', 'Crisp pastry filled with spiced potato and peas, with tamarind chutney.', 9, 'Starter', 1, 1], ['Gulab Jamun', 'Warm milk dumplings in a lightly scented cardamom syrup.', 8, 'Dessert', 1, 0]],
  'Nikkei Bar': [['Edamame', 'Steamed soybeans finished with sea salt.', 7, 'Starter', 1, 1], ['Teriyaki Chicken Bowl', 'Grilled chicken, teriyaki sauce, pickles and steamed rice.', 23, 'Main', 0, 0], ['Miso Soup', 'White miso broth with tofu, seaweed and spring onion.', 6, 'Side', 0, 0], ['Matcha Mochi', 'Soft rice cakes with a matcha ice cream centre.', 8, 'Dessert', 1, 0]],
  'Trattoria Bianco': [['Tomato Bruschetta', 'Toasted sourdough with ripe tomato, basil and olive oil.', 11, 'Starter', 1, 1], ['Rocket Salad', 'Rocket, pear and parmesan with balsamic dressing.', 10, 'Side', 1, 0], ['Tiramisu', 'Espresso-soaked sponge layered with mascarpone.', 12, 'Dessert', 1, 0], ['Blood Orange Soda', 'Chilled Italian-style sparkling blood orange.', 5, 'Drink', 1, 1]],
  'Green Fork': [['Hummus and Flatbread', 'Creamy chickpea hummus with warm wholemeal flatbread.', 10, 'Starter', 1, 1], ['Sweet Potato Wedges', 'Oven-roasted wedges with a smoky paprika seasoning.', 8, 'Side', 1, 1], ['Coconut Chia Pudding', 'Coconut milk, chia seeds and seasonal berries.', 9, 'Dessert', 1, 1], ['Citrus Iced Tea', 'House-brewed tea with orange and lemon.', 6, 'Drink', 1, 1]],
  'Chophouse': [['Crispy Calamari', 'Lightly dusted calamari with lemon and aioli.', 16, 'Starter', 0, 0], ['Grilled Chicken', 'Herb-marinated chicken with green beans and potatoes.', 29, 'Main', 0, 0], ['Rosemary Chips', 'Golden chips with rosemary salt.', 9, 'Side', 1, 1], ['Chocolate Brownie', 'Warm chocolate brownie with vanilla ice cream.', 12, 'Dessert', 1, 0], ['Sparkling Water', 'Chilled sparkling mineral water, 500 ml.', 5, 'Drink', 1, 1]],
  'Seoul Grill': [['Vegetable Pajeon', 'Crisp spring onion and vegetable pancake with soy dipping sauce.', 13, 'Starter', 1, 0], ['Korean Fried Chicken', 'Crisp chicken glazed with a sweet and spicy gochujang sauce.', 24, 'Main', 0, 0], ['Steamed Rice', 'A bowl of short-grain rice.', 4, 'Side', 1, 1], ['Yuzu Soda', 'Sparkling citrus with fragrant yuzu.', 6, 'Drink', 1, 1]],
};

function enrichCatalog(db) {
  db.exec('CREATE TABLE IF NOT EXISTS app_migration (name TEXT PRIMARY KEY)');
  if (process.env.DEMO_DATA === 'false' || db.prepare('SELECT 1 FROM app_migration WHERE name = ?').get('catalog-v2')) return;
  db.exec('BEGIN');
  try {
    for (const [name, [image, description, minutes]] of Object.entries(venues)) {
      const r = db.prepare('SELECT * FROM restaurant WHERE name = ?').get(name);
      if (!r) continue;
      db.prepare("UPDATE restaurant SET cover_image = ?, description = ?, pickup_minutes = ?, opening_hours = 'Daily 11:00 am - 10:00 pm' WHERE restaurant_id = ? AND cover_image = ''").run('/assets/' + image + '.jpg', description, minutes, r.restaurant_id);
      for (const [item, description] of Object.entries(descriptions)) db.prepare("UPDATE menu_item SET description = ? WHERE restaurant_id = ? AND item_name = ? AND description = ''").run(description, r.restaurant_id, item);
      for (const [item, description, price, category, vegetarian, vegan] of extras[name]) {
        if (!db.prepare('SELECT 1 FROM menu_item WHERE restaurant_id = ? AND item_name = ?').get(r.restaurant_id, item)) db.prepare('INSERT INTO menu_item (restaurant_id,item_name,description,price,category,vegetarian,vegan) VALUES (?,?,?,?,?,?,?)').run(r.restaurant_id, item, description, price, category, vegetarian, vegan);
      }
    }
    db.prepare("UPDATE restaurant SET promotion_text = '20% off all curries' WHERE promotion_text = '20% off all curries - demonstration offer'").run();
    for (const [old, name] of [['Customer Demo', 'Alex Morgan'], ['Staff Demo', 'Jamie Chen'], ['Owner Demo', 'Taylor Singh']]) db.prepare('UPDATE user SET username = ? WHERE username = ? AND email IN (?,?,?)').run(name, old, 'customer@smartdine.test', 'staff@smartdine.test', 'owner@smartdine.test');
    db.prepare("UPDATE menu_item SET item_name = 'Chickpea Garden Salad', description = 'Chickpeas, crisp cucumber, herbs and lemon dressing.' WHERE item_name = 'Chickpea Salad Demo' AND description = 'Demonstration menu item created during browser verification.'").run();
    db.prepare('INSERT INTO app_migration (name) VALUES (?)').run('catalog-v2');
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
module.exports = { enrichCatalog };
