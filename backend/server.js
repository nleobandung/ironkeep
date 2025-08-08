require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.js');
const gameProgressRoutes = require('./routes/gameProgress.js');
const cors = require('cors');
const { createClient } = require('redis');

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: ['http://localhost:5173', 'https://team24.cs144.org'],
  credentials: true,
}));

// Initialize Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redisClient.connect()
  .then(() => {
    console.log('Connected to Redis');
    app.locals.redis = redisClient;
  })
  .catch((err) => {
    console.error('Redis failed to connect:', err);
  });

app.use('/api/auth', authRoutes);
app.use('/api/gameProgress', gameProgressRoutes);
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(process.env.PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${process.env.PORT}`);
    }).on('error', (err) => {
      console.error('Server listen error:', err);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
  });

console.log('PORT:', process.env.PORT);
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Loaded' : 'Missing');
