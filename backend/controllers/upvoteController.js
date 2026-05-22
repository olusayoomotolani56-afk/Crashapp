const pool = require('../db');

// Upvote a report.
// Deduplication is enforced by a UNIQUE(report_id, user_id) constraint in the DB.
// If the user already upvoted, Postgres raises error code 23505 (unique_violation),
// which we catch and convert to a 409 Conflict instead of letting it become a 500.
// Self-upvoting is blocked before the INSERT so it never hits the constraint.
const upvoteReport = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    // Check if report exists
    const report = await pool.query(
      'SELECT * FROM reports WHERE id = $1',
      [id]
    );

    if (report.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Block self-upvote
    if (report.rows[0].user_id === user_id) {
      return res.status(400).json({ error: 'You cannot upvote your own report' });
    }

    // Insert upvote
    await pool.query(
      'INSERT INTO upvotes (report_id, user_id) VALUES ($1, $2)',
      [id, user_id]
    );

    // Get updated upvote count
    const count = await pool.query(
      'SELECT COUNT(*) FROM upvotes WHERE report_id = $1',
      [id]
    );

    res.status(201).json({
      message: 'Report upvoted successfully',
      upvote_count: parseInt(count.rows[0].count)
    });

  } catch (err) {
    // Handle duplicate upvote
    if (err.code === '23505') {
      return res.status(409).json({ error: 'You have already upvoted this report' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Remove upvote
const removeUpvote = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      'DELETE FROM upvotes WHERE report_id = $1 AND user_id = $2 RETURNING *',
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Upvote not found' });
    }

    // Get updated upvote count
    const count = await pool.query(
      'SELECT COUNT(*) FROM upvotes WHERE report_id = $1',
      [id]
    );

    res.status(200).json({
      message: 'Upvote removed successfully',
      upvote_count: parseInt(count.rows[0].count)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { upvoteReport, removeUpvote };