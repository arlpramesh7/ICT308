require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const preferenceRoutes = require('./routes/preferences');
const locationRoutes = require('./routes/location');
const restaurantRoutes = require('./routes/restaurants');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'SmartDine API' }));

app.use('/api/auth', authRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/restaurants', restaurantRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`SmartDine API listening on port ${PORT}`));
}

module.exports = app;
