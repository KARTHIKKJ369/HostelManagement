const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

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

module.exports = router;