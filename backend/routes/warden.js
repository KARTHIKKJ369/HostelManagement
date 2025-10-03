const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { StudentModel, RoomModel, MaintenanceRequestModel, AllotmentApplicationModel, HostelModel, RoomAllotmentModel, UserModel } = require('../models');
const { supabase } = require('../config/supabase');

// Middleware to check if user is a warden
const requireWardenRole = (req, res, next) => {
  const userRole = req.user.role;
  if (userRole !== 'Warden' && userRole !== 'SuperAdmin') {
    return res.status(403).json({ message: 'Access denied. Warden role required.' });
  }
  next();
};

// GET /api/warden/stats - Get dashboard statistics
router.get('/stats', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    console.log('📊 Fetching warden dashboard stats...');
    
    // Get counts for different entities
    const [
      totalStudents,
      totalRooms,
      occupiedRooms,
      pendingMaintenanceRequests,
      pendingAllotmentApplications
    ] = await Promise.all([
      StudentModel.count(),
      RoomModel.count(),
      RoomModel.count({ status: 'Occupied' }),
      MaintenanceRequestModel.count({ status: 'Pending' }),
      AllotmentApplicationModel.count({ status: 'pending' })
    ]);

    const availableRooms = totalRooms - occupiedRooms;
    const todayTasks = pendingMaintenanceRequests + pendingAllotmentApplications;

    const stats = {
      totalStudents,
      totalRooms,
      occupiedRooms,
      availableRooms,
      pendingRequests: pendingMaintenanceRequests,
      pendingApplications: pendingAllotmentApplications,
      todayTasks
    };

    console.log('✅ Dashboard stats calculated:', stats);
    res.json(stats);

  } catch (error) {
    console.error('❌ Error fetching warden stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
});

// GET /api/warden/room-summary - Get detailed room summary
router.get('/room-summary', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    console.log('🏠 Fetching room summary...');

    // Get room counts by status
    const [
      totalRooms,
      occupiedRooms,
      vacantRooms,
      maintenanceRooms
    ] = await Promise.all([
      RoomModel.count(),
      RoomModel.count({ status: 'Occupied' }),
      RoomModel.count({ status: 'Vacant' }),
      RoomModel.count({ status: 'Under Maintenance' })
    ]);

    // Get hostel-wise breakdown
    const hostels = await HostelModel.findAll();
    const hostelSummary = [];

    for (const hostel of hostels) {
      const hostelRooms = await RoomModel.findByHostel(hostel.hostel_id);
      const occupied = hostelRooms.filter(r => r.status === 'Occupied').length;
      const available = hostelRooms.filter(r => r.status === 'Vacant').length;
      
      hostelSummary.push({
        hostelName: hostel.hostel_name,
        hostelType: hostel.hostel_type,
        totalRooms: hostelRooms.length,
        occupied,
        available,
        occupancyRate: hostelRooms.length > 0 ? Math.round((occupied / hostelRooms.length) * 100) : 0
      });
    }

    const summary = {
      overall: {
        totalRooms,
        occupiedRooms,
        vacantRooms,
        maintenanceRooms,
        occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0
      },
      hostels: hostelSummary
    };

    console.log('✅ Room summary calculated');
    res.json(summary);

  } catch (error) {
    console.error('❌ Error fetching room summary:', error);
    res.status(500).json({ message: 'Failed to fetch room summary' });
  }
});

// GET /api/warden/maintenance-queue - Get pending maintenance requests
router.get('/maintenance-queue', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    console.log('🔧 Fetching maintenance queue...');

    // Get pending maintenance requests with details
    const requests = await MaintenanceRequestModel.findWithDetails({ status: 'Pending' });

    const formattedRequests = requests.map(req => ({
      requestId: req.request_id,
      studentName: req.student_name || 'Unknown Student',
      roomNumber: req.room_no || 'Unknown Room',
      category: req.category,
      description: req.description,
      priority: req.priority || 'Medium',
      createdAt: req.created_at,
      daysSinceCreated: Math.floor((new Date() - new Date(req.created_at)) / (1000 * 60 * 60 * 24))
    }));

    // Sort by priority and creation date
    const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
    formattedRequests.sort((a, b) => {
      const priorityDiff = (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    console.log(`✅ Found ${formattedRequests.length} pending maintenance requests`);
    res.json(formattedRequests);

  } catch (error) {
    console.error('❌ Error fetching maintenance queue:', error);
    res.status(500).json({ message: 'Failed to fetch maintenance requests' });
  }
});

// GET /api/warden/maintenance-history - Get maintenance requests history
router.get('/maintenance-history', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    const { status, category, priority, hostelId, date_from, date_to, limit } = req.query;

    // Build filters for model search
    const filters = {};
    if (status && status !== 'All') filters.status = status;
    if (category) filters.category = category;
    if (priority) filters.priority = priority;
    if (hostelId) filters.hostel_id = parseInt(hostelId);
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;

    let requests = await MaintenanceRequestModel.search(filters);
    // Apply limit if provided
    const lim = parseInt(limit || '50');
    if (!isNaN(lim) && lim > 0) {
      requests = (requests || []).slice(0, lim);
    }

    const formatted = (requests || []).map(req => ({
      requestId: req.request_id,
      studentName: req.students?.name || req.student_name || 'Unknown Student',
      studentRegNo: req.students?.reg_no || req.student_reg_no,
      roomNumber: req.rooms?.room_no || req.room_no || 'Unknown Room',
      hostelName: req.rooms?.hostels?.hostel_name || req.hostel_name,
      category: req.category,
      description: req.description,
      status: req.status,
      priority: req.priority || 'Medium',
      createdAt: req.created_at || req.request_date,
      completionDate: req.completion_date || null
    }));

    res.json({ success: true, data: { requests: formatted } });
  } catch (error) {
    console.error('❌ Error fetching maintenance history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch maintenance history' });
  }
});

// GET /api/warden/pending-applications - Get pending allotment applications
router.get('/pending-applications', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    console.log('📋 Fetching pending allotment applications...');

    const applications = await AllotmentApplicationModel.findAll({ status: 'pending' });

    const formattedApplications = applications.map(app => ({
      applicationId: app.application_id,
      userId: app.user_id,
      preferredHostelId: app.preferred_hostel_id,
      roomTypePreference: app.room_type_preference,
      course: app.course,
      academicYear: app.academic_year,
      performanceType: app.performance_type,
      performanceValue: app.performance_value,
      distanceFromHome: app.distance_from_home,
      createdAt: app.created_at,
      daysSinceApplied: Math.floor((new Date() - new Date(app.created_at)) / (1000 * 60 * 60 * 24))
    }));

    // Sort by creation date (oldest first for fairness)
    formattedApplications.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    console.log(`✅ Found ${formattedApplications.length} pending applications`);
    res.json(formattedApplications);

  } catch (error) {
    console.error('❌ Error fetching pending applications:', error);
    res.status(500).json({ message: 'Failed to fetch pending applications' });
  }
});

// POST /api/warden/approve-maintenance - Approve maintenance request
router.post('/approve-maintenance/:requestId', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    const { requestId } = req.params;
    const wardenId = req.user.userId;
    
    console.log(`🔧 Approving maintenance request ${requestId} by warden ${wardenId}`);

    // Update the maintenance request status
    const updatedRequest = await MaintenanceRequestModel.updateStatus(requestId, 'In Progress', `Warden ${req.user.username}`);
    
    if (!updatedRequest) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }

    console.log('✅ Maintenance request approved successfully');
    res.json({ 
      success: true, 
      message: 'Maintenance request approved successfully',
      request: updatedRequest 
    });

  } catch (error) {
    console.error('❌ Error approving maintenance request:', error);
    res.status(500).json({ message: 'Failed to approve maintenance request' });
  }
});

// POST /api/warden/approve-application - Approve allotment application
router.post('/approve-application/:applicationId', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const wardenId = req.user.userId;
    const { roomId } = req.body; // Room ID should be provided by warden
    
    console.log(`📋 Approving application ${applicationId} by warden ${wardenId}`);

    // Get the application details first
    const application = await AllotmentApplicationModel.findById(applicationId, 'application_id');
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // If roomId provided, create room allotment
    if (roomId) {
      console.log(`🏠 Creating room allotment for student ${application.user_id} in room ${roomId}`);
      
      try {
        const allotment = await RoomAllotmentModel.createAllotment(application.user_id, roomId);
        console.log('✅ Room allotment created:', allotment);
      } catch (allotmentError) {
        console.error('❌ Failed to create room allotment:', allotmentError.message);
        return res.status(400).json({ 
          message: `Failed to allocate room: ${allotmentError.message}` 
        });
      }
    }

    // Update the application status to approved
    const updatedApp = await AllotmentApplicationModel.update(applicationId, {
      status: 'approved',
      reviewed_by: wardenId,
      reviewed_at: new Date().toISOString()
    }, 'application_id');

    console.log('✅ Application approved successfully');
    res.json({ 
      success: true, 
      message: roomId ? 'Application approved and room allocated successfully' : 'Application approved successfully',
      application: updatedApp 
    });

  } catch (error) {
    console.error('❌ Error approving application:', error);
    res.status(500).json({ message: 'Failed to approve application' });
  }
});

// POST /api/warden/reject-application - Reject allotment application
router.post('/reject-application/:applicationId', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const wardenId = req.user.userId;
    const { reason } = req.body;
    
    console.log(`📋 Rejecting application ${applicationId} by warden ${wardenId}`);

    // Update the application status to rejected
    const updatedApp = await AllotmentApplicationModel.update(applicationId, {
      status: 'rejected',
      reviewed_by: wardenId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason || 'No reason provided'
    }, 'application_id');
    
    if (!updatedApp) {
      return res.status(404).json({ message: 'Application not found' });
    }

    console.log('✅ Application rejected successfully');
    res.json({ 
      success: true, 
      message: 'Application rejected successfully',
      application: updatedApp 
    });

  } catch (error) {
    console.error('❌ Error rejecting application:', error);
    res.status(500).json({ message: 'Failed to reject application' });
  }
});

module.exports = router;

// -----------------------------
// Room management APIs (warden)
// -----------------------------

// GET /api/warden/rooms - List/search rooms
router.get('/rooms', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    const { status, hostelId, search } = req.query;

    // Build filters for RoomModel.search
    const filters = {};
    if (status) filters.status = status;
    if (hostelId) filters.hostel_id = parseInt(hostelId);
    if (search) filters.room_no = search; // RoomModel.search handles ilike

    let rooms;
    if (Object.keys(filters).length > 0) {
      rooms = await RoomModel.search(filters);
    } else {
      // Default: all rooms
      rooms = await RoomModel.findAll();
    }

    // Normalize fields
    const result = (rooms || []).map(r => ({
      roomId: r.room_id || r.roomId,
      roomNo: r.room_no || r.roomNo,
      hostelId: r.hostel_id,
      hostelName: r.hostels?.hostel_name || r.hostel_name,
      hostelType: r.hostels?.hostel_type || r.hostel_type,
      capacity: r.capacity,
      status: r.status
    }));

    res.json({ success: true, data: { rooms: result } });
  } catch (error) {
    console.error('Error listing rooms:', error.message);
    res.status(500).json({ success: false, message: 'Failed to list rooms' });
  }
});

// GET /api/warden/rooms/available - List rooms with available spots
router.get('/rooms/available', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    const { hostelType } = req.query;
    const rooms = await RoomModel.findAvailable(hostelType || null);
    const result = (rooms || []).map(r => ({
      roomId: r.room_id,
      roomNo: r.room_no,
      hostelId: r.hostel_id,
      hostelName: r.hostels?.hostel_name || r.hostel_name,
      hostelType: r.hostels?.hostel_type || r.hostel_type,
      capacity: r.capacity,
      availableSpots: r.available_spots || Math.max(0, (r.capacity || 0) - (r.current_occupants || 0))
    }));
    res.json({ success: true, data: { rooms: result } });
  } catch (error) {
    console.error('Error listing available rooms:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get available rooms' });
  }
});

// POST /api/warden/rooms/:roomId/status - Update room status (e.g., Under Maintenance, Vacant)
router.post('/rooms/:roomId/status', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

    // Only allow valid transitions
    const allowed = new Set(['Vacant', 'Occupied', 'Under Maintenance']);
    if (!allowed.has(status)) {
      return res.status(400).json({ success: false, message: 'Invalid room status' });
    }

    const updated = await RoomModel.update(parseInt(roomId), { status }, 'room_id');
    if (!updated) return res.status(404).json({ success: false, message: 'Room not found' });

    res.json({ success: true, message: 'Room status updated', data: { room: updated } });
  } catch (error) {
    console.error('Error updating room status:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update room status' });
  }
});

// POST /api/warden/allocate-room - Allocate a student to a room
router.post('/allocate-room', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    const { studentId, studentRegNo, roomId } = req.body;
    if (!roomId || (!studentId && !studentRegNo)) {
      return res.status(400).json({ success: false, message: 'roomId and studentId or studentRegNo are required' });
    }

    // Resolve student_id
    let targetStudentId = studentId;
    if (!targetStudentId && studentRegNo) {
      const student = await StudentModel.findByRegNo(studentRegNo);
      if (!student) return res.status(404).json({ success: false, message: 'Student not found for provided reg no' });
      targetStudentId = student.student_id;
    }

    // Create allotment
    const allotment = await RoomAllotmentModel.createAllotment(parseInt(targetStudentId), parseInt(roomId));

    // Recompute room status based on occupancy
    await RoomModel.updateStatusByOccupancy(parseInt(roomId));

    res.json({ success: true, message: 'Room allocated successfully', data: { allotment } });
  } catch (error) {
    console.error('Error allocating room:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Failed to allocate room' });
  }
});

// -----------------------------
// Students management (warden)
// -----------------------------

// GET /api/warden/students - list/search students
router.get('/students', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    const { name, reg_no, department, year } = req.query;
    const filters = {};
    if (name) filters.name = name;
    if (reg_no) filters.reg_no = reg_no;
    if (department) filters.department = department;
    if (year) filters.year_of_study = parseInt(year);
    const students = await StudentModel.search(filters);
    const mapped = (students || []).map(s => ({
      studentId: s.student_id,
      name: s.name,
      regNo: s.reg_no,
      yearOfStudy: s.year_of_study,
      department: s.department,
      category: s.category,
      keamRank: s.keam_rank,
      sgpa: s.sgpa,
      email: s.users?.email || s.email,
      username: s.users?.username || s.username
    }));
    res.json({ success: true, data: { students: mapped } });
  } catch (error) {
    console.error('Error listing students:', error.message);
    res.status(500).json({ success: false, message: 'Failed to list students' });
  }
});

// POST /api/warden/students - create student record (for an existing user or standalone)
router.post('/students', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    const { user_id, username, email, phone, name, reg_no, year_of_study, department, category, keam_rank, sgpa, distance_category, backlogs } = req.body;

    // Basic validation
    if (!name || !reg_no || !year_of_study) {
      return res.status(400).json({ success: false, message: 'name, reg_no and year_of_study are required' });
    }

    let linkedUserId = user_id || null;
    // If username provided without user_id, attempt to find user
    if (!linkedUserId && username) {
      try {
        const found = await UserModel.findAll({ username });
        if (found && found.length > 0) linkedUserId = found[0].user_id;
      } catch (_) {}
    }

    // Validate enums to avoid DB check constraint violations
    const allowedDistance = ['<25km', '25-50km', '>50km'];
    const allowedCategory = ['General', 'OBC', 'SC', 'ST', 'Other'];
    if (distance_category && !allowedDistance.includes(distance_category)) {
      return res.status(400).json({ success: false, message: `distance_category must be one of ${allowedDistance.join(', ')}` });
    }
    if (category && !allowedCategory.includes(category)) {
      return res.status(400).json({ success: false, message: `category must be one of ${allowedCategory.join(', ')}` });
    }
    // Year of study bounds
    const y = parseInt(year_of_study);
    if (!y || y < 1 || y > 5) {
      return res.status(400).json({ success: false, message: 'year_of_study must be an integer between 1 and 5' });
    }

    // SGPA bounds check if provided
    if (sgpa !== undefined && sgpa !== null && sgpa !== '') {
      const sg = parseFloat(sgpa);
      if (Number.isNaN(sg) || sg < 0 || sg > 10) {
        return res.status(400).json({ success: false, message: 'sgpa must be a number between 0 and 10' });
      }
    }

    // keam_rank non-negative
    if (keam_rank !== undefined && keam_rank !== null && keam_rank !== '') {
      const kr = parseInt(keam_rank);
      if (Number.isNaN(kr) || kr < 0) {
        return res.status(400).json({ success: false, message: 'keam_rank must be a non-negative integer' });
      }
    }

    // backlogs non-negative
    if (backlogs !== undefined && backlogs !== null && backlogs !== '') {
      const bl = parseInt(backlogs);
      if (Number.isNaN(bl) || bl < 0) {
        return res.status(400).json({ success: false, message: 'backlogs must be a non-negative integer' });
      }
    }

    // Build insert payload
    const payload = {
      user_id: linkedUserId,
      name,
      reg_no,
  year_of_study: y,
      department: department || null,
      category: category || null,
      keam_rank: typeof keam_rank !== 'undefined' && keam_rank !== null && keam_rank !== '' ? parseInt(keam_rank) : null,
      sgpa: typeof sgpa !== 'undefined' && sgpa !== null && sgpa !== '' ? parseFloat(sgpa) : null,
      distance_category: distance_category || null,
      backlogs: typeof backlogs !== 'undefined' && backlogs !== null && backlogs !== '' ? parseInt(backlogs) : 0
    };

    const created = await StudentModel.create(payload);
    res.status(201).json({ success: true, message: 'Student created', data: { student: created } });
  } catch (error) {
    console.error('Error creating student:', error.message);
    const msg = /duplicate key/i.test(error.message)
      ? 'Student with this reg_no already exists'
      : (error.message?.includes('distance_category')
          ? 'Invalid distance category; must be <25km, 25-50km, or >50km'
          : (error.message?.includes('category') ? 'Invalid category; must be General, OBC, SC, ST, or Other' : 'Failed to create student'));
    res.status(400).json({ success: false, message: msg });
  }
});

// GET /api/warden/students/:studentId - get student details including current allocation
router.get('/students/:studentId', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await StudentModel.findStudentWithUser(parseInt(studentId));
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    // Current allocation
    const active = await RoomAllotmentModel.findActiveByStudent(parseInt(studentId));
    res.json({ success: true, data: { student, allocation: active } });
  } catch (error) {
    console.error('Error getting student details:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get student details' });
  }
});

// POST /api/warden/students/:studentId/vacate - vacate current room allotment
router.post('/students/:studentId/vacate', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    const { studentId } = req.params;
    // Find active allotment for student
    const active = await RoomAllotmentModel.findActiveByStudent(parseInt(studentId));
    if (!active) return res.status(404).json({ success: false, message: 'No active allotment found' });
    const updated = await RoomAllotmentModel.vacateRoom(active.allotment_id);
    // Update room status after vacate
    await RoomModel.updateStatusByOccupancy(active.room_id);
    res.json({ success: true, message: 'Room vacated', data: { allotment: updated } });
  } catch (error) {
    console.error('Error vacating room:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Failed to vacate room' });
  }
});

// -----------------------------
// Analytics & Reports (warden)
// -----------------------------

// Helper to get student IDs currently allocated in hostels managed by this warden
async function getWardenStudentIds(wardenUserId) {
  // 1) Hostels managed by this warden
  const { data: hostels, error: hErr } = await supabase
    .from('hostels')
    .select('hostel_id')
    .eq('warden_id', wardenUserId);
  if (hErr) throw hErr;
  const hostelIds = (hostels || []).map(h => h.hostel_id);
  if (!hostelIds.length) return [];

  // 2) Rooms in those hostels
  const { data: rooms, error: rErr } = await supabase
    .from('rooms')
    .select('room_id')
    .in('hostel_id', hostelIds);
  if (rErr) throw rErr;
  const roomIds = (rooms || []).map(r => r.room_id);
  if (!roomIds.length) return [];

  // 3) Active allotments in those rooms
  const { data: allotments, error: aErr } = await supabase
    .from('room_allotments')
    .select('student_id')
    .in('room_id', roomIds)
    .eq('status', 'Active');
  if (aErr) throw aErr;
  const studentIds = [...new Set((allotments || []).map(a => a.student_id).filter(Boolean))];
  return studentIds;
}

// GET /api/warden/analytics/occupancy - occupancy stats per hostel and overall
router.get('/analytics/occupancy', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    const { HostelModel, RoomModel, RoomAllotmentModel } = require('../models');
    const hostels = await HostelModel.findAll();
    const items = [];
    let totalCapacity = 0, totalActive = 0, totalRooms = 0, vacantRooms = 0, occupiedRooms = 0, maintRooms = 0;
    for (const h of hostels || []) {
      const rooms = await RoomModel.findByHostel(h.hostel_id);
      const caps = rooms.reduce((s, r) => s + (r.capacity || 0), 0);
      const occ = rooms.filter(r => r.status === 'Occupied').length;
      const vac = rooms.filter(r => r.status === 'Vacant').length;
      const maint = rooms.filter(r => r.status === 'Under Maintenance').length;
      const active = (await RoomAllotmentModel.findActiveByHostel(h.hostel_id)).length;
      const occPct = caps ? Math.round((active / caps) * 10000) / 100 : 0;
      items.push({ hostelId: h.hostel_id, hostelName: h.hostel_name, hostelType: h.hostel_type, totalRooms: rooms.length, occupiedRooms: occ, vacantRooms: vac, maintenanceRooms: maint, capacity: caps, activeStudents: active, occupancyPercent: occPct });
      totalRooms += rooms.length; vacantRooms += vac; occupiedRooms += occ; maintRooms += maint; totalCapacity += caps; totalActive += active;
    }
    const overall = { totalRooms, vacantRooms, occupiedRooms, maintenanceRooms: maintRooms, totalCapacity, activeStudents: totalActive, occupancyPercent: totalCapacity ? Math.round((totalActive / totalCapacity) * 10000) / 100 : 0 };
    res.json({ success: true, data: { overall, hostels: items } });
  } catch (error) {
    console.error('Error computing occupancy analytics:', error.message);
    res.status(500).json({ success: false, message: 'Failed to compute occupancy analytics' });
  }
});

// GET /api/warden/analytics/maintenance - recent maintenance aggregates
router.get('/analytics/maintenance', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    const { MaintenanceRequestModel, HostelModel, RoomModel } = require('../models');
    const stats = await MaintenanceRequestModel.getStatistics();
    // Per-hostel counts (basic)
    const hostels = await HostelModel.findAll();
    const perHostel = [];
    for (const h of hostels || []) {
      const rooms = await RoomModel.findByHostel(h.hostel_id);
      const roomIds = rooms.map(r => r.room_id);
      if (!roomIds.length) { perHostel.push({ hostelId: h.hostel_id, hostelName: h.hostel_name, total: 0, pending: 0, inProgress: 0, completed: 0 }); continue; }
      const recent = await MaintenanceRequestModel.search({});
      const subset = recent.filter(r => roomIds.includes(r.room_id));
      perHostel.push({
        hostelId: h.hostel_id,
        hostelName: h.hostel_name,
        total: subset.length,
        pending: subset.filter(r => r.status === 'Pending').length,
        inProgress: subset.filter(r => r.status === 'In Progress').length,
        completed: subset.filter(r => r.status === 'Completed').length
      });
    }
    res.json({ success: true, data: { overall: stats, perHostel } });
  } catch (error) {
    console.error('Error computing maintenance analytics:', error.message);
    res.status(500).json({ success: false, message: 'Failed to compute maintenance analytics' });
  }
});

// GET /api/warden/analytics/students - student stats by year/category/department
router.get('/analytics/students', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    const { StudentModel, RoomAllotmentModel } = require('../models');
    const students = await StudentModel.findAll();
    const byYear = {}, byDept = {}, byCategory = {};
    for (const s of students || []) {
      byYear[s.year_of_study] = (byYear[s.year_of_study] || 0) + 1;
      if (s.department) byDept[s.department] = (byDept[s.department] || 0) + 1;
      if (s.category) byCategory[s.category] = (byCategory[s.category] || 0) + 1;
    }
    // Active allocations count
    let activeCount = 0;
    try {
      const active = await RoomAllotmentModel.findAll({ status: 'Active' });
      activeCount = (active || []).length;
    } catch (_) {}
    res.json({ success: true, data: { totals: { students: (students || []).length, activeAllotments: activeCount }, byYear, byDept, byCategory } });
  } catch (error) {
    console.error('Error computing student analytics:', error.message);
    res.status(500).json({ success: false, message: 'Failed to compute student analytics' });
  }
});

// -----------------------------
// Finance (warden)
// -----------------------------

// GET /api/warden/finance/summary - totals scoped to warden's hostels (active residents)
router.get('/finance/summary', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    const wardenId = req.user.userId;
    const studentIds = await getWardenStudentIds(wardenId);
    if (!studentIds.length) {
      return res.json({ success: true, summary: { total_billed: 0, total_paid: 0, pending: 0, overdue: 0, monthlyPayments: 0, feesCount: 0 } });
    }

    // Fees for these students
    const { data: fees, error: fErr } = await supabase
      .from('fees')
      .select('*')
      .in('student_id', studentIds);
    if (fErr) throw fErr;

    const totals = (fees || []).reduce((acc, f) => {
      acc.total_billed += Number(f.amount || 0);
      acc.total_paid += Number(f.paid_amount || 0);
      acc.pending += Math.max(0, Number(f.amount || 0) - Number(f.paid_amount || 0));
      if (f.status === 'Overdue') acc.overdue += Math.max(0, Number(f.amount || 0) - Number(f.paid_amount || 0));
      return acc;
    }, { total_billed: 0, total_paid: 0, pending: 0, overdue: 0 });

    // Payments this month for these fees
    const feeIds = (fees || []).map(f => f.fee_id).filter(Boolean);
    let monthlyPayments = 0;
    if (feeIds.length) {
      const monthStart = new Date();
      monthStart.setDate(1);
      const { data: pays, error: pErr } = await supabase
        .from('payments')
        .select('*')
        .in('fee_id', feeIds)
        .gte('paid_at', monthStart.toISOString());
      if (pErr) throw pErr;
      monthlyPayments = (pays || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    }

    res.json({ success: true, summary: { ...totals, monthlyPayments, feesCount: fees?.length || 0 } });
  } catch (error) {
    console.error('❌ Warden finance summary error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load finance summary' });
  }
});

// GET /api/warden/finance/fees?status=
router.get('/finance/fees', authenticateToken, requireWardenRole, async (req, res) => {
  try {
    const wardenId = req.user.userId;
    const studentIds = await getWardenStudentIds(wardenId);
    if (!studentIds.length) return res.json({ success: true, fees: [] });

    let qb = supabase.from('fees').select('*, students(name, reg_no)');
    qb = qb.in('student_id', studentIds);
    if (req.query.status && req.query.status !== 'All') qb = qb.eq('status', req.query.status);
    const { data, error } = await qb.order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, fees: data || [] });
  } catch (error) {
    console.error('❌ Warden list fees error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load fees' });
  }
});