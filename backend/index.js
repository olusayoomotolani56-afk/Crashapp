const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./db');
const rateLimit = require('express-rate-limit');
const passport = require('./passport');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Rate limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' }
});

const upvoteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  message: { error: 'Too many upvote actions. Please wait before trying again.' }
});

// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authLimiter, authRoutes);

const reportRoutes = require('./routes/reportRoutes');
app.use('/api/reports', globalLimiter, reportRoutes);

const upvoteRoutes = require('./routes/upvoteRoutes');
app.use('/api/reports', upvoteLimiter, upvoteRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', globalLimiter, userRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'CrashApp API is running!' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong. Please try again.'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;