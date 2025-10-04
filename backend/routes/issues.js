const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { StudentModel, IssueModel } = require('../models');

// POST /api/issues/report - Student submits an issue/incident report
router.post('/report', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { category, description, location, anonymous } = req.body || {};

    if (!category || !description || !location) {
      return res.status(400).json({ success: false, message: 'category, description and location are required' });
    }

    // Resolve student record (optional when anonymous)
    let student = null;
    try { student = await StudentModel.findByUserId(userId); } catch (_) {}

    const payload = {
      student_id: anonymous ? null : (student?.student_id || null),
      user_id: anonymous ? null : (userId || null),
      category,
      description,
      location,
      is_anonymous: !!anonymous,
      status: 'Open'
    };

    const created = await IssueModel.createReport(payload);

    return res.json({
      success: true,
      message: 'Issue reported successfully',
      reportId: created?.issue_id,
      data: { id: created?.issue_id, status: created?.status }
    });
  } catch (error) {
    console.error('❌ Report issue error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to submit issue report' });
  }
});

module.exports = router;
