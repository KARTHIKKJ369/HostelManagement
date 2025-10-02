const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { StudentModel, RoomModel, MaintenanceRequestModel, AllotmentApplicationModel, HostelModel, RoomAllotmentModel } = require('../models');

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