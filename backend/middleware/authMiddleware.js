const jwt = require('jsonwebtoken');

// Requires a valid Bearer JWT in the Authorization header.
// Attaches the decoded payload as req.user so downstream handlers know who is calling.
// Returns 401 (not 500) for any missing or invalid token so callers get a clear signal.
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};

module.exports = authMiddleware;