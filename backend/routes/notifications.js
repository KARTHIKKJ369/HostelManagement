const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { NotificationModel } = require('../models');

// Role guard for creating announcements (Warden/Admin/SuperAdmin)
function requireWardenOrAdmin(req, res, next) {
  const role = req.user?.role;
  if (!['Warden', 'Admin', 'SuperAdmin'].includes(role)) {
    return res.status(403).json({ success: false, message: 'Access denied. Warden or Admin role required.' });
  }
  next();
}

// GET /api/notifications/my-notifications - Get personalized notifications for student
router.get('/my-notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    console.log('📢 Getting notifications for user:', userId);
    
    // Get student info
  const { StudentModel, RoomAllotmentModel } = require('../models');
  const student = await StudentModel.findByUserId(userId);
  let notifications = [];
    
    if (!student) {
      // User is not a student - show general notifications
      notifications.push({
        id: 'no-student-record',
        title: '📋 Student Registration Required',
        message: 'Complete your student profile to access hostel services and room allocation.',
        type: 'info',
        date: new Date().toISOString(),
        priority: 'high'
      });
    } else {
      // Check if student has room allocation
      const currentAllotment = await RoomAllotmentModel.findActiveByStudent(student.student_id);
      const hasRoom = !!currentAllotment;
      
      if (!hasRoom) {
        // No room allocation - show vacant hostels and allocation info
        
        // Get vacant rooms count via models
        const { HostelModel, RoomModel } = require('../models');
        const hostels = await HostelModel.findAll();
        const vacantHostels = [];
        for (const h of hostels) {
          const rooms = await RoomModel.findByHostel(h.hostel_id);
          const vacant_rooms = rooms.filter(r => r.status === 'Vacant').length;
          if (vacant_rooms > 0) vacantHostels.push({ hostel_name: h.hostel_name, hostel_type: h.hostel_type, vacant_rooms });
        }
        
        if (vacantHostels.length > 0) {
          const hostelList = vacantHostels.map(h => 
            `${h.hostel_name} (${h.hostel_type}) - ${h.vacant_rooms} rooms available`
          ).join(', ');
          
          notifications.push({
            id: 'vacant-hostels',
            title: '🏠 Hostel Rooms Available',
            message: `Vacant rooms found in: ${hostelList}. Contact administration for room allocation.`,
            type: 'success',
            date: new Date().toISOString(),
            priority: 'high'
          });
        }
        
        notifications.push({
          id: 'no-room-allocation',
          title: '📍 Room Allocation Pending',
          message: 'You haven\'t been assigned a hostel room yet. Please contact the hostel administration to apply for room allocation.',
          type: 'warning',
          date: new Date().toISOString(),
          priority: 'high'
        });
      } else {
        // Has room - show room-related notifications
        const currentRoom = roomResult.rows[0];
        
        notifications.push({
          id: 'current-room',
          title: '🎉 Room Allocated',
          message: `You are allocated to Room ${currentRoom.room_no} in ${currentRoom.hostel_name} (${currentRoom.hostel_type}).`,
          type: 'success',
          date: currentRoom.allotment_date,
          priority: 'normal'
        });
        
        // Check for pending maintenance requests
        const { MaintenanceRequestModel } = require('../models');
        const pendingRequests = (await MaintenanceRequestModel.count({ student_id: student.student_id, status: 'Pending' })) || 0;
        
        if (pendingRequests > 0) {
          notifications.push({
            id: 'pending-maintenance',
            title: '🔧 Maintenance Updates',
            message: `You have ${pendingRequests} maintenance request(s) being processed. Check your maintenance section for updates.`,
            type: 'info',
            date: new Date().toISOString(),
            priority: 'normal'
          });
        }
      }
      
      // Try to get notifications from notifications table if it exists
      try {
        const { NotificationModel } = require('../models');
        const dbNotifications = await NotificationModel.findForUser(userId);
        const formattedDbNotifications = (dbNotifications || []).map(notif => ({
          id: `db-${notif.notification_id || notif.id}`,
          title: notif.title,
          message: notif.message,
          type: notif.type || 'info',
          date: notif.created_at || notif.date,
          priority: 'normal',
          isRead: notif.is_read || false
        }));
        notifications = [...notifications, ...formattedDbNotifications];
      } catch (dbError) {
        console.log('ℹ️ No notifications table found or error reading it, using dynamic notifications only', dbError.message);
      }
    }
    
    // Add general system notifications
    notifications.push({
      id: 'system-welcome',
      title: '👋 Welcome to Hostel Management',
      message: 'Use this dashboard to manage your hostel allocation, submit maintenance requests, and stay updated.',
      type: 'info',
      date: new Date().toISOString(),
      priority: 'low'
    });
    
    // Sort by priority and date
    const priorityOrder = { 'high': 3, 'normal': 2, 'low': 1 };
    notifications.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.date) - new Date(a.date);
    });
    
    console.log('📢 Generated notifications:', {
      count: notifications.length,
      hasStudent: !!student,
      types: notifications.map(n => n.type)
    });
    
    res.json({
      success: true,
      data: {
        notifications: notifications.slice(0, 5), // Limit to 5 most relevant
        totalCount: notifications.length
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications',
      message: error.message
    });
  }
});

// GET /api/notifications/role - List recent announcements visible to a role (defaults to requester role)
router.get('/role', authenticateToken, async (req, res) => {
  try {
    const { role: queryRole, limit } = req.query;
    const role = (queryRole && typeof queryRole === 'string') ? queryRole : req.user?.role;
    const lim = parseInt(limit || '10');
    if (!role) return res.status(400).json({ success: false, message: 'Role is required' });
    let rows;
    try {
      rows = await NotificationModel.findByRole(role);
    } catch (e) {
      // Fallback: plain select without any embeds
      const { supabase } = require('../config/database');
      const fb = await supabase
        .from('notifications')
        .select('*')
        .or(`receiver_role.eq.${role},receiver_role.eq.All`)
        .order('created_at', { ascending: false });
      if (fb.error) throw fb.error;
      rows = fb.data || [];
    }
    if (!Number.isNaN(lim) && lim > 0) rows = rows.slice(0, lim);
    // Fetch sender usernames in one go (best-effort)
    let sendersMap = {};
    try {
      const ids = Array.from(new Set((rows || []).map(r => r.sender_id).filter(Boolean)));
      if (ids.length) {
        const { supabase } = require('../config/database');
        const { data: users } = await supabase.from('users').select('user_id, username').in('user_id', ids);
        for (const u of users || []) sendersMap[u.user_id] = u.username;
      }
    } catch (_) {}
    const announcements = (rows || []).map(n => ({
      id: n.notification_id || n.id,
      title: n.title,
      message: n.message,
      createdAt: n.created_at,
      sender: sendersMap[n.sender_id] || 'System',
      audience: n.receiver_role || (n.receiver_id ? 'User' : 'All')
    }));
    res.json({ success: true, data: { announcements } });
  } catch (error) {
    console.error('List role announcements error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to list announcements' });
  }
});

// GET /api/notifications/sent - List announcements sent by current user
router.get('/sent', authenticateToken, async (req, res) => {
  try {
    const { limit } = req.query;
    const lim = parseInt(limit || '20');
  let rows = await NotificationModel.findBySender(req.user.userId || req.user.id);
    if (!Number.isNaN(lim) && lim > 0) rows = rows.slice(0, lim);
    const announcements = (rows || []).map(n => ({
      id: n.notification_id || n.id,
      title: n.title,
      message: n.message,
      createdAt: n.created_at,
      audience: n.receiver_role || (n.receiver_id ? 'User' : 'All')
    }));
    res.json({ success: true, data: { announcements } });
  } catch (error) {
    console.error('List sent announcements error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to list sent announcements' });
  }
});

// POST /api/notifications/announce - Create a new announcement
router.post('/announce', authenticateToken, requireWardenOrAdmin, async (req, res) => {
  try {
    const senderId = req.user.userId || req.user.id;
    const { title, message, audience, receiver_id, receiver_username } = req.body || {};
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'title and message are required' });
    }
    const allowedAud = ['All', 'Student', 'Warden', 'Admin', 'User'];
    const aud = audience || 'All';
    if (!allowedAud.includes(aud)) {
      return res.status(400).json({ success: false, message: `audience must be one of ${allowedAud.join(', ')}` });
    }

    let created;
    if (aud === 'All') {
      created = await NotificationModel.createForAll(senderId, title, message);
    } else if (aud === 'User') {
      let targetUserId = receiver_id ? parseInt(receiver_id) : null;
      if (!targetUserId && receiver_username) {
        const { UserModel } = require('../models');
        const user = await UserModel.findByUsername(receiver_username);
        if (!user) return res.status(404).json({ success: false, message: 'User not found for provided username' });
        targetUserId = user.user_id;
      }
      if (!targetUserId) return res.status(400).json({ success: false, message: 'Provide receiver_username (preferred) or receiver_id for audience User' });
      created = await NotificationModel.createForUser(senderId, targetUserId, title, message);
    } else {
      created = await NotificationModel.createForRole(senderId, aud, title, message);
    }

    res.status(201).json({ success: true, message: 'Announcement created', data: { announcement: created } });
  } catch (error) {
    console.error('Create announcement error:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Failed to create announcement' });
  }
});

// GET /api/notifications/users - search users by username/email (optional role filter)
router.get('/users', authenticateToken, requireWardenOrAdmin, async (req, res) => {
  try {
    const { q, role, limit } = req.query;
    const lim = parseInt(limit || '10');
    if (!q || q.length < 1) return res.status(400).json({ success: false, message: 'q (search text) is required' });
    const { supabase } = require('../config/database');
    let qb = supabase.from('users').select('user_id, username, role, email');
    if (role) qb = qb.eq('role', role);
    qb = qb.or(`username.ilike.%${q}%,email.ilike.%${q}%`).order('username', { ascending: true }).limit(lim);
    const { data, error } = await qb;
    if (error) throw error;
    res.json({ success: true, data: { users: data || [] } });
  } catch (error) {
    console.error('Search users error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to search users' });
  }
});

// POST /api/notifications/announce/my-hostel - Warden sends to students in their hostel(s)
router.post('/announce/my-hostel', authenticateToken, requireWardenOrAdmin, async (req, res) => {
  try {
    if (req.user.role !== 'Warden' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ success: false, message: 'Only Wardens or SuperAdmin can target their hostel' });
    }
    const senderId = req.user.userId || req.user.id;
    const { title, message } = req.body || {};
    if (!title || !message) return res.status(400).json({ success: false, message: 'title and message are required' });
    // Find hostels managed by this warden
    const { HostelModel, RoomModel, RoomAllotmentModel, StudentModel } = require('../models');
    const hostels = await HostelModel.findByWarden(senderId);
    const hostelIds = (hostels || []).map(h => h.hostel_id);
    if (!hostelIds.length) return res.status(400).json({ success: false, message: 'No hostels found for this warden' });
    // Find active students in those hostels
    const { supabase } = require('../config/database');
    const roomsRes = await supabase.from('rooms').select('room_id, hostel_id').in('hostel_id', hostelIds);
    const roomIds = (roomsRes.data || []).map(r => r.room_id);
    if (!roomIds.length) return res.status(200).json({ success: true, message: 'No active rooms under this warden' });
    const raRes = await supabase.from('room_allotments').select('student_id').in('room_id', roomIds).eq('status', 'Active');
    const studentIds = Array.from(new Set((raRes.data || []).map(a => a.student_id)));
    if (!studentIds.length) return res.status(200).json({ success: true, message: 'No students allocated currently' });
    const stRes = await supabase.from('students').select('user_id').in('student_id', studentIds);
    const userIds = Array.from(new Set((stRes.data || []).map(s => s.user_id).filter(Boolean)));
    if (!userIds.length) return res.status(200).json({ success: true, message: 'No student user accounts to notify' });
    // Build notifications for each user
    const notifications = userIds.map(uid => ({ sender_id: senderId, receiver_id: uid, receiver_role: null, title, message }));
    const created = await NotificationModel.bulkCreate(notifications);
    res.status(201).json({ success: true, message: `Announcement sent to ${created.length} students`, data: { count: created.length } });
  } catch (error) {
    console.error('Announce to my-hostel error:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Failed to send announcement' });
  }
});

module.exports = router;