const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { StudentModel, RoomAllotmentModel, MaintenanceRequestModel } = require('../models');

// GET /api/maintenance/my-requests - Get maintenance requests for logged-in student
router.get('/my-requests', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    console.log('🔧 Getting maintenance requests for user:', userId);
    
  // Get student ID first
  const student = await StudentModel.findByUserId(userId);
    
    if (!student) {
      // No student record means user hasn't been set up as student - return empty requests
      console.log('ℹ️ No student record found for user:', userId, '- returning empty maintenance requests');
      return res.json({
        success: true,
        data: {
          requests: [],
          message: 'User is not registered as a student'
        }
      });
    }
    
  // Get maintenance requests using model
  const requests = await MaintenanceRequestModel.findByStudent(student.student_id);
    
    console.log('📋 Found maintenance requests:', {
      studentId: student.student_id,
      requestCount: requests.length
    });
    
    res.json({
      success: true,
      data: {
        requests: requests.map(request => ({
          id: request.request_id,
          title: request.category,
          description: request.description,
          priority: request.priority,
          status: request.status,
          date: request.request_date,
          completionDate: request.completion_date,
          roomNumber: request.room_no,
          hostelName: request.hostel_name
        }))
      }
    });
  } catch (error) {
    console.error('Get maintenance requests error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get maintenance requests',
      message: error.message
    });
  }
});

// POST /api/maintenance/submit - Submit new maintenance request
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { type, description, priority } = req.body;
    
    console.log('📝 Submitting maintenance request:', { userId, type, description, priority });
    
  // Get student ID
  const student = await StudentModel.findByUserId(userId);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }
    
  // Get student's current room via RoomAllotmentModel
  const currentAllotment = await RoomAllotmentModel.findActiveByStudent(student.student_id);
    const roomId = currentAllotment ? currentAllotment.room_id : null;
    
    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'No room allocation found. Cannot submit maintenance request.'
      });
    }
    
  // Insert maintenance request via model
  // Normalize incoming fields
  // DB constraint allows only: Electricity, Plumbing, Cleaning, Other
  const normalizeCategory = (t) => {
    const s = (t || '').toLowerCase();
    if (s.includes('electric')) return 'Electricity';
    if (s.includes('plumb')) return 'Plumbing';
    if (s.includes('clean')) return 'Cleaning';
    // Map all other types (e.g., furniture, AC/Heating) to 'Other' to satisfy constraint
    return 'Other';
  };
  const normalizePriority = (p) => {
    const s = (p || '').toLowerCase();
    if (s.startsWith('u') || s.startsWith('hig')) return 'High';
    if (s.startsWith('med')) return 'Medium';
    return 'Low';
  };

  const payload = {
    student_id: student.student_id,
    room_id: roomId,
    category: normalizeCategory(type),
    description: description || '',
    priority: normalizePriority(priority || 'Medium'),
    status: 'Pending'
  };

  const newRequest = await MaintenanceRequestModel.createRequest(payload);
    
    console.log('✅ Maintenance request submitted:', {
      requestId: newRequest.request_id,
      studentId: student.student_id,
      roomId
    });
    
    res.json({
      success: true,
      message: 'Maintenance request submitted successfully',
      data: {
        requestId: newRequest.request_id,
        submissionDate: newRequest.request_date
      }
    });
  } catch (error) {
    console.error('Submit maintenance request error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to submit maintenance request',
      message: error.message
    });
  }
});

module.exports = router;