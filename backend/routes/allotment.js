const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
// Database query helper removed - supabase client and models are used instead
const { RoomAllotmentModel, AllotmentApplicationModel, HostelModel, RoomModel, StudentModel } = require('../models');

// In-memory storage for allotment data (replace with database in production)
let allotmentApplications = [];
let studentAllotments = {};

// GET /api/allotment/status - Check student's allotment status
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        console.log('🔍 Checking allotment status for user:', userId);
        
        // First get the student record to get student_id
        const { StudentModel } = require('../models');
        const student = await StudentModel.findByUserId(userId);
        if (!student) {
            return res.status(404).json({ message: 'Student record not found' });
        }
        
        console.log('👤 Found student:', student.student_id);
        
    // Check if student has an active room allocation
    const allocation = await RoomAllotmentModel.findActiveByStudent(student.student_id);

        if (allocation) {
            const roomNo = allocation?.rooms?.room_no || allocation?.room_no || null;
            const capacity = allocation?.rooms?.capacity ?? allocation?.capacity ?? null;
            const hostelName = allocation?.rooms?.hostels?.hostel_name || allocation?.hostel_name || null;
            const hostelType = allocation?.rooms?.hostels?.hostel_type || allocation?.hostel_type || null;
            const location = allocation?.rooms?.hostels?.location || allocation?.location || null;
            // Compute floor from numeric part of room number
            let floorNum = undefined;
            if (roomNo) {
              const match = String(roomNo).match(/(\d+)/);
              if (match && match[1]) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > 0) floorNum = Math.floor(num / 100) || 1;
              }
            }

            return res.json({
                isAllocated: true,
                roomNumber: roomNo,
                hostelName,
                hostelType,
                location,
                allocationDate: allocation.allotment_date || allocation.allotmentDate || null,
                status: allocation.status,
                // Extra fields to help UI show consistent details
                roomType: capacity ? `${capacity}-person room` : undefined,
                occupancy: capacity ? `${capacity} max` : undefined,
                floor: floorNum
            });
        }
        
    // Check if student has a pending application
    const application = await AllotmentApplicationModel.findLatestByUser(userId);
        
        if (application) {
            return res.json({
                isAllocated: false,
                applicationStatus: application.status,
                applicationDate: application.created_at || application.createdAt,
                expectedProcessingTime: '5-7 business days',
                applicationId: application.application_id || application.applicationId,
                preferredHostel: application.hostel_name || application.preferredHostel || 'Not specified',
                roomType: application.room_type_preference || application.roomType
            });
        }
        
        // No allocation or application
        res.json({
            isAllocated: false,
            applicationStatus: null
        });
        
    } catch (error) {
        console.error('❌ Error checking allotment status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/allotment/hostels - Get available hostels
router.get('/hostels', authenticateToken, async (req, res) => {
    try {
        console.log('🏨 Fetching available hostels...');
    const hostels = await HostelModel.findAll();
        const result = [];
        for (const h of hostels) {
            const rooms = await RoomModel.findByHostel(h.hostel_id);
            const available_rooms = rooms.filter(r => r.status === 'Vacant').length;
            result.push({ id: h.hostel_id, name: h.hostel_name, type: h.hostel_type, totalRooms: h.total_rooms, availableRooms: available_rooms, location: h.location });
        }
        console.log(`✅ Found ${result.length} hostels`);
        res.json(result);
        
    } catch (error) {
        console.error('❌ Error fetching hostels:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /api/allotment/register - Submit allotment application
router.post('/register', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const {
            studentId,
            studentName,
            course,
            yearOfStudy,
            academicScore,
            phoneNumber,
            emergencyContactName,
            emergencyContactPhone,
            relationship,
            homeAddress,
            distanceFromHome,
            distanceUnit,
            medicalInfo,
            specialRequests,
            hostelPreference,
            roomType,
            floorPreference,
            additionalNotes
        } = req.body;
        
        console.log('📝 Processing allotment application for user:', userId);
        console.log('📋 Form data received:', req.body);
        
        // Validate required fields
        if (!studentId || !studentName || !course || !yearOfStudy || !academicScore || 
            !phoneNumber || !emergencyContactName || !emergencyContactPhone || !relationship ||
            !homeAddress || !distanceFromHome || !distanceUnit || !hostelPreference || !roomType) {
            return res.status(400).json({ 
                message: 'Missing required fields' 
            });
        }
        // Ensure student profile exists to map to student_id
        const student = await StudentModel.findByUserId(userId);
        if (!student) {
            return res.status(400).json({
                message: 'Please complete your student profile before applying for allotment'
            });
        }

        // Check if student is already allocated a room (use student_id, not userId)
        const existingAllocation = await RoomAllotmentModel.findActiveByStudent(student.student_id);
        
        if (existingAllocation) {
            return res.status(400).json({ 
                message: 'You are already allocated to a hostel room' 
            });
        }
        
        // Check if student already has a pending application
        const existingApplication = await AllotmentApplicationModel.findByUserAndStatus(userId, 'pending');
        
        if (existingApplication) {
            return res.status(400).json({ 
                message: 'You already have a pending allotment application' 
            });
        }
        
        // Map hostel preference to hostel_id
        let preferredHostelId = null;
        if (hostelPreference && hostelPreference !== '') {
            // Try to find hostel by ID first, then by name or type
            if (!isNaN(hostelPreference)) {
                preferredHostelId = parseInt(hostelPreference);
            } else {
                const found = await HostelModel.findAll({ hostel_name: hostelPreference });
                if (found && found.length > 0) preferredHostelId = found[0].hostel_id;
            }
        }
        
        // Determine performance type and value based on year
    const performanceType = parseInt(yearOfStudy) === 1 ? 'keam_rank' : 'cgpa';
        const performanceValue = parseFloat(academicScore);
        
        // Generate unique application ID
        const applicationId = `APP${Date.now()}`;
        
    // Insert application into database
    const app = await AllotmentApplicationModel.create({
            application_id: applicationId,
            user_id: userId,
            preferred_hostel_id: preferredHostelId,
            room_type_preference: roomType,
            course,
            academic_year: yearOfStudy,
            performance_type: performanceType,
            performance_value: performanceValue,
            distance_from_home: distanceFromHome,
            distance_unit: distanceUnit || 'km',
            guardian_name: emergencyContactName,
            guardian_phone: emergencyContactPhone,
            home_address: homeAddress,
            medical_info: medicalInfo || null,
            special_requests: specialRequests || null,
            status: 'pending'
        });

        console.log('✅ Application inserted successfully:', app);

        res.status(201).json({
            message: 'Allotment application submitted successfully',
            applicationId: applicationId,
            status: 'pending',
            submissionDate: app.created_at || app.createdAt
        });
        
    } catch (error) {
        console.error('❌ Error submitting allotment application:', error && error.stack ? error.stack : error);
        const message = process.env.NODE_ENV === 'development' ? (error.message || String(error)) : 'Internal server error';
        res.status(500).json({ message });
    }
});

// GET /api/allotment/application/:id - Get application details
router.get('/application/:id', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const applicationId = req.params.id;
        
        const application = allotmentApplications.find(app => 
            app.id === applicationId && app.studentId === userId.toString()
        );
        
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }
        
        res.json(application);
        
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/allotment/applications - Get student's applications
router.get('/applications', authenticateToken, (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        
        const userApplications = allotmentApplications.filter(app => 
            app.studentId === userId.toString()
        );
        
        res.json(userApplications);
        
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /api/allotment/allocate - Allocate room to student (Admin/Warden only)
router.post('/allocate', authenticateToken, (req, res) => {
    try {
        const userRole = req.user.role;
        
        // Check if user has permission to allocate rooms
        if (userRole !== 'Admin' && userRole !== 'SuperAdmin' && userRole !== 'Warden') {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        
        const {
            studentId,
            roomNumber,
            hostelName,
            roomType,
            occupancy,
            floor
        } = req.body;
        
        if (!studentId || !roomNumber || !hostelName || !roomType) {
            return res.status(400).json({ 
                message: 'Missing required allocation details' 
            });
        }
        
        // Check if student is already allocated
        if (studentAllotments[studentId]) {
            return res.status(400).json({ 
                message: 'Student is already allocated to a room' 
            });
        }
        
        // Create allocation
        studentAllotments[studentId] = {
            roomNumber,
            hostelName,
            roomType,
            occupancy: occupancy || 'Single',
            floor: floor || '1',
            allocationDate: new Date().toISOString(),
            allocatedBy: req.user.id || req.user.userId
        };
        
        // Update application status if exists
        const applicationIndex = allotmentApplications.findIndex(app => 
            app.studentId === studentId.toString()
        );
        
        if (applicationIndex !== -1) {
            allotmentApplications[applicationIndex].status = 'allocated';
            allotmentApplications[applicationIndex].lastUpdated = new Date().toISOString();
        }
        
        res.json({
            message: 'Room allocated successfully',
            allocation: studentAllotments[studentId]
        });
        
    } catch (error) {
        console.error('Error allocating room:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Demo: Add some sample allocations for testing
// In production, this data would come from the database
function initializeDemoData() {
    // Add a sample allocated student for testing
    studentAllotments['demo-student-1'] = {
        roomNumber: 'A-101',
        hostelName: 'Boys Hostel A',
        roomType: 'Double Occupancy',
        occupancy: 'Double',
        floor: '1',
        allocationDate: new Date().toISOString(),
        allocatedBy: 'admin'
    };
}

// Initialize demo data
initializeDemoData();

// GET /api/allotment/my-room - Get current room allocation from database
router.get('/my-room', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    console.log('🏠 Getting room allocation from DB for user:', userId);
    
    // Get student ID first
    const { StudentModel } = require('../models');
    const student = await StudentModel.findByUserId(userId);
    
    if (!student) {
      // No student record means user hasn't been set up as student - this is normal
      console.log('ℹ️ No student record found for user:', userId, '- user is not a student');
      return res.json({
        success: true,
        data: { 
          hasAllocation: false,
          message: 'User is not registered as a student'
        }
      });
    }
    
    // Get current room allocation using model
    const allocation = await RoomAllotmentModel.findActiveByStudent(student.student_id);
    
    if (!allocation) {
      console.log('⚠️ No active room allocation found for student:', student.student_id);
      return res.json({
        success: true,
        data: { 
          hasAllocation: false,
          message: 'No room currently allocated'
        }
      });
    }
    
        const roomNo = allocation?.rooms?.room_no || allocation?.room_no || null;
        const capacity = allocation?.rooms?.capacity ?? allocation?.capacity ?? null;
        const hostelName = allocation?.rooms?.hostels?.hostel_name || allocation?.hostel_name || null;
        const hostelType = allocation?.rooms?.hostels?.hostel_type || allocation?.hostel_type || null;
        const location = allocation?.rooms?.hostels?.location || allocation?.location || null;

        console.log('✅ Room allocation found:', {
            studentId: student.student_id,
            roomNo,
            hostel: hostelName
        });

        // Compute floor robustly: extract numeric part (e.g., A-305 -> 305 -> floor 3)
        let floorNum = 1;
        if (roomNo) {
            const match = String(roomNo).match(/(\d+)/);
            if (match && match[1]) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > 0) floorNum = Math.floor(num / 100) || 1;
            }
        }

        res.json({
            success: true,
            data: {
                hasAllocation: true,
                allocation: {
                    roomNumber: roomNo,
                    hostelName,
                    hostelType,
                    location,
                    capacity,
                    allottedDate: allocation.allotment_date,
                    status: allocation.status,
                    floor: floorNum
                }
            }
        });
  } catch (error) {
    console.error('Get room allocation error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get room allocation',
      message: error.message
    });
  }
});

module.exports = router;