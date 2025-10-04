const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { supabase } = require('../config/supabase');
const { StudentModel, RoomAllotmentModel, HostelModel } = require('../models');

// GET /api/student/my-warden - Return warden contact for the student's active hostel
router.get('/my-warden', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const student = await StudentModel.findByUserId(userId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    const allotment = await RoomAllotmentModel.findActiveByStudent(student.student_id);
    if (!allotment) {
      return res.json({ success: true, data: null, message: 'No active hostel allocation' });
    }

    // Determine hostel_id from the student's room
    const roomId = allotment.room_id;
    const roomRes = await supabase.from('rooms').select('hostel_id').eq('room_id', roomId).maybeSingle();
    if (roomRes.error) throw roomRes.error;
    const hostelId = roomRes.data?.hostel_id;
    if (!hostelId) {
      return res.json({ success: true, data: null, message: 'Hostel not found for current room' });
    }

    const hostel = await HostelModel.findWithWarden(hostelId);
    if (!hostel) {
      return res.json({ success: true, data: null, message: 'Hostel details not found' });
    }

    const payload = {
      hostelId,
      hostelName: hostel.hostel_name,
      hostelType: hostel.hostel_type,
      location: hostel.location || null,
      warden: {
        username: hostel.warden_username || null,
        email: hostel.warden_email || null,
        phone: hostel.warden_phone || null
      }
    };

    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('❌ my-warden error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch warden info' });
  }
});

module.exports = router;
