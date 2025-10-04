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

// GET /api/student/my-fees - Return fees assigned to the logged-in student
router.get('/my-fees', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const student = await StudentModel.findByUserId(userId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    // Fetch fees for this student with nested payments
    let qb = supabase
      .from('fees')
      .select('fee_id, student_id, amount, paid_amount, status, due_date, paid_at, description, created_at, updated_at, payments(payment_id, amount, method, reference, paid_at)')
      .eq('student_id', student.student_id)
      .order('created_at', { ascending: false });

    const { data, error } = await qb;
    if (error) throw error;
    const rows = data || [];

    // Compute derived fields
    const today = new Date();
    const fees = rows.map((f) => {
      const amount = Number(f.amount || 0);
      const paid = Number(f.paid_amount || 0);
      const balance = Math.max(0, amount - paid);
      const isPaid = (f.status === 'Paid') || (paid >= amount && amount > 0);
      const due = f.due_date ? new Date(f.due_date) : null;
      const isOverdue = !!(due && !isPaid && due < new Date(today.toDateString()));
      return {
        fee_id: f.fee_id,
        amount,
        paid_amount: paid,
        balance,
        status: isPaid ? 'Paid' : (f.status || 'Pending'),
        due_date: f.due_date,
        paid_at: f.paid_at,
        description: f.description || null,
        created_at: f.created_at,
        updated_at: f.updated_at,
        isOverdue,
        payments: Array.isArray(f.payments) ? f.payments : []
      };
    });

    const totals = fees.reduce((acc, f) => {
      acc.total_billed += f.amount;
      acc.total_paid += f.paid_amount;
      acc.pending += Math.max(0, f.amount - f.paid_amount);
      if (f.isOverdue && f.balance > 0) acc.overdue += f.balance;
      return acc;
    }, { total_billed: 0, total_paid: 0, pending: 0, overdue: 0 });

    return res.json({ success: true, data: { fees, totals } });
  } catch (error) {
    console.error('❌ my-fees error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch fees' });
  }
});

// GET /api/student/fees/:fee_id/receipt - Download a receipt for a specific fee (owned by the student)
module.exports = router;
