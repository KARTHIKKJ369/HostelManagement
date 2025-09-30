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
  const newRequest = await MaintenanceRequestModel.createRequest(student.student_id, roomId, type, description, priority || 'Medium');
    
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