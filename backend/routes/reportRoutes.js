const express = require('express');
const router = express.Router();
const {
  getReports,
  getReport,
  createReport,
  updateReport,
  deleteReport
} = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuth');
const { upload } = require('../cloudinary');
const { reportLimiter } = require('../middleware/rateLimiters');

// Public routes (optionalAuth so we can return has_upvoted when logged in)
router.get('/', optionalAuth, getReports);
router.get('/search', optionalAuth, getReports);
router.get('/:id', optionalAuth, getReport);

// Protected routes
router.post('/', authMiddleware, reportLimiter, upload.single('screenshot'), createReport);
router.put('/:id', authMiddleware, updateReport);
router.delete('/:id', authMiddleware, deleteReport);

module.exports = router;