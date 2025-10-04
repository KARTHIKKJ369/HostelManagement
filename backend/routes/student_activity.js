const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { RoomAllotmentModel, MaintenanceRequestModel, NotificationModel, StudentModel } = require('../models');

// GET /api/activity/recent - recent student-facing activity
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const student = await StudentModel.findByUserId(userId);
    const items = [];

    // Allocation event
    try {
      if (student) {
        const ra = await RoomAllotmentModel.findActiveByStudent(student.student_id);
        if (ra) {
          items.push({
            type: 'allocation',
            detail: `Room ${ra?.rooms?.room_no || ra?.room_no} allocated`,
            at: ra.allotment_date || ra.created_at || new Date().toISOString()
          });
        }
      }
    } catch (_) {}

    // Maintenance events (last 5)
    try {
      if (student) {
        const reqs = await MaintenanceRequestModel.findByStudent(student.student_id);
        for (const r of (reqs || []).slice(0, 5)) {
          items.push({
            type: 'maintenance',
            detail: `${r.category} · ${r.status}`,
            at: r.updated_at || r.created_at || r.request_date
          });
        }
      }
    } catch (_) {}

    // Announcements (best-effort)
    try {
      const notifs = await NotificationModel.findForUser(userId);
      for (const n of (notifs || []).slice(0, 5)) {
        items.push({ type: 'announcement', detail: n.title, at: n.created_at });
      }
    } catch (_) {}

    items.sort((a,b) => new Date(b.at) - new Date(a.at));
    res.json({ success: true, data: { items: items.slice(0, 10) } });
  } catch (error) {
    console.error('❌ Error fetching student recent activity:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch recent activity' });
  }
});

module.exports = router;
