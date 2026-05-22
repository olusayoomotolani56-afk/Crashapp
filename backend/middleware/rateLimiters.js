const rateLimit = require('express-rate-limit');

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  message: { error: 'You have filed too many reports. Please wait before posting again.' }
});

module.exports = { reportLimiter };
