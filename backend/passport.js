const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');
const jwt = require('jsonwebtoken');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'https://crashapp-p305.onrender.com/api/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        const existingUser = await pool.query(
          'SELECT * FROM users WHERE google_id = $1 OR email = $2',
          [profile.id, profile.emails[0].value]
        );

        if (existingUser.rows.length > 0) {
          // User exists — update google_id if needed
          const user = existingUser.rows[0];
          if (!user.google_id) {
            await pool.query(
              'UPDATE users SET google_id = $1 WHERE id = $2',
              [profile.id, user.id]
            );
          }
          return done(null, user);
        }

        // Create new user
        const newUser = await pool.query(
          `INSERT INTO users (name, email, google_id, avatar_url)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [
            profile.displayName,
            profile.emails[0].value,
            profile.id,
            profile.photos[0]?.value
          ]
        );

        return done(null, newUser.rows[0]);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;