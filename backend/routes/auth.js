const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const AuthService = require('../services/AuthService');
const { isAuthenticated } = require('../middleware/auth');

// Admin codes for secure registration
const ADMIN_CODES = {
  Warden: process.env.WARDEN_CODE || 'WARDEN2025',
  SuperAdmin: process.env.SUPERADMIN_CODE || 'SUPERADMIN2025'
};

// Validation middleware
const loginValidation = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const registerValidation = [
  body('username')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters long'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email address'),
  body('role')
    .isIn(['Student', 'Warden', 'SuperAdmin'])
    .withMessage('Role must be Student, Warden, or SuperAdmin'),
  body('phone')
    .optional()
    .isLength({ min: 10 })
    .withMessage('Phone number must be at least 10 digits'),
  body('adminCode')
    .custom((value, { req }) => {
      const role = req.body.role;
      
      // Admin code is required for Warden and SuperAdmin roles
      if (role === 'Warden' || role === 'SuperAdmin') {
        if (!value) {
          throw new Error('Admin authorization code is required for this role');
        }
        
        // Validate the admin code
        if (value !== ADMIN_CODES[role]) {
          throw new Error('Invalid admin authorization code');
        }
      }
      
      return true;
    })
];

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// POST /api/auth/login
router.post('/login', loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await AuthService.login(username, password);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Login failed',
      message: error.message
    });
  }
});

// POST /api/auth/register
router.post('/register', registerValidation, handleValidationErrors, async (req, res) => {
  try {
    console.log('Full registration request body:', req.body);
    
    // Explicitly extract only the fields we want for the database
    const userData = {
      username: req.body.username,
      email: req.body.email,
      phone: req.body.phone,
      password: req.body.password,
      role: req.body.role
    };
    
    console.log('Filtered user data for database:', userData);
    console.log('Admin code (validation only):', req.body.adminCode);
    
    const result = await AuthService.register(userData);
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: result
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      success: false,
      error: 'Registration failed',
      message: error.message
    });
  }
});

// GET /api/auth/profile
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get profile',
      message: error.message
    });
  }
});

// POST /api/auth/logout
router.post('/logout', isAuthenticated, async (req, res) => {
  try {
    // In a production app, you might want to blacklist the token
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: error.message
    });
  }
});

// POST /api/auth/verify-token
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token required',
        message: 'No token provided'
      });
    }

    const decoded = AuthService.verifyToken(token);
    
    res.json({
      success: true,
      message: 'Token is valid',
      data: { user: decoded }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: error.message
    });
  }
});

// POST /api/auth/change-password
router.post('/change-password', isAuthenticated, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], handleValidationErrors, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    console.log('🔐 Change password request for user:', {
      jwtUserId: req.user.userId,
      jwtUsername: req.user.username,
      jwtRole: req.user.role,
      fullUserObject: req.user
    });

    console.log('🔐 Change password request:', { userId, hasCurrentPassword: !!currentPassword, hasNewPassword: !!newPassword });

    // Get user from database to verify current password
    const user = await AuthService.getUserById(userId);
    console.log('👤 User found:', { userId: user?.user_id, username: user?.username, hasPasswordHash: !!user?.password_hash });
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    console.log('🔍 Verifying current password...');
    const isCurrentPasswordValid = await AuthService.verifyPassword(currentPassword, user.password_hash);
    console.log('✅ Password verification result:', isCurrentPasswordValid);
    
    if (!isCurrentPasswordValid) {
      console.log('❌ Current password is incorrect');
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is different from current
    const isSamePassword = await AuthService.verifyPassword(newPassword, user.password_hash);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Update password in database
    await AuthService.updatePassword(userId, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Password change failed',
      message: error.message
    });
  }
});

// PUT /api/auth/profile
router.put('/profile', isAuthenticated, [
  body('username').optional().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').optional().isEmail().withMessage('Must be a valid email address'),
  body('phone').optional().isLength({ min: 10 }).withMessage('Phone number must be at least 10 digits'),
  body('fullName').optional().isLength({ min: 2 }).withMessage('Full name must be at least 2 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.userId;
    const updateData = req.body;
    
    console.log('📝 Profile update request:', { 
      userId, 
      updateData,
      hasUsername: !!updateData.username,
      hasEmail: !!updateData.email,
      hasPhone: !!updateData.phone,
      hasFullName: !!updateData.fullName
    });
    
    // Remove undefined/null values
    const cleanUpdateData = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanUpdateData[key] = value;
      }
    }
    
    console.log('📝 Cleaned update data:', cleanUpdateData);
    
    if (Object.keys(cleanUpdateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid data provided for update'
      });
    }
    
    // Update user in database
    const updatedUser = await AuthService.updateUserProfile(userId, cleanUpdateData);
    
    console.log('📝 Profile update result:', { 
      success: !!updatedUser,
      updatedUserId: updatedUser?.user_id,
      updatedUsername: updatedUser?.username
    });
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Profile update failed',
      message: error.message
    });
  }
});

// POST /api/auth/student-profile - Create student profile
router.post('/student-profile', isAuthenticated, async (req, res) => {
  try {
    console.log('📥 Request received for student profile creation');
    console.log('👤 User from middleware:', req.user);
    
    const userId = req.user.userId || req.user.id;
    console.log('🔍 Extracted userId:', userId);
    
    const {
      name,
      regNo,
      yearOfStudy,
      department,
      keamRank,
      distanceCategory,
      category,
      sgpa,
      backlogs
    } = req.body;
    
    console.log('📝 Creating student profile for user:', userId);
    console.log('📋 Profile data:', req.body);
    
    // Validate required fields
    if (!name || !regNo || !yearOfStudy) {
      return res.status(400).json({
        message: 'Name, registration number, and year of study are required'
      });
    }
    
    // Check if user is a student
    const { UserModel, StudentModel } = require('../models');
    const u = await UserModel.findById(userId);
    if (!u) return res.status(404).json({ message: 'User not found' });
    if (u.role !== 'Student') return res.status(400).json({ message: 'Only students can create student profiles' });

    // Check if student profile already exists
    const existingStudent = await StudentModel.findByUserId(userId);
    if (existingStudent) return res.status(400).json({ message: 'Student profile already exists. You can update it instead.' });
    
    // Insert student profile
    const newStudent = await StudentModel.create({
      user_id: userId,
      name,
      reg_no: regNo,
      year_of_study: parseInt(yearOfStudy),
      department: department || null,
      keam_rank: keamRank ? parseInt(keamRank) : null,
      distance_category: distanceCategory || null,
      category: category || null,
      sgpa: sgpa ? parseFloat(sgpa) : null,
      backlogs: backlogs ? parseInt(backlogs) : 0
    });

    console.log('✅ Student profile created successfully:', newStudent);

    res.status(201).json({
      message: 'Student profile created successfully',
      student: newStudent
    });
    
  } catch (error) {
    console.error('❌ Error creating student profile:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint
    });
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// GET /api/auth/student-profile - Get complete student profile with room info
router.get('/student-profile', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('📋 Getting complete student profile for user:', userId);
    
    // Get user data
    const user = await AuthService.getProfile(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get student data
    const { StudentModel } = require('../models');
    const student = await StudentModel.findByUserId(userId);
    
    if (!student) {
      // Student record not found is normal - user exists but hasn't been set up as student
      console.log('ℹ️ No student record found for user:', userId, '- returning user data only');
      return res.json({
        success: true,
        data: { 
          profile: {
            ...user,
            isStudent: false,
            message: 'User account exists but student profile not set up'
          }
        }
      });
    }
    
    // Combine user and student data
    const completeProfile = {
      ...user,
      ...student,
      fullName: student.name,
      isStudent: true
    };
    
    console.log('✅ Complete student profile retrieved:', {
      userId: user.user_id,
      studentId: student.student_id,
      name: student.name,
      hasRoomInfo: false // Will be enhanced later
    });
    
    res.json({
      success: true,
      data: { profile: completeProfile }
    });
  } catch (error) {
    console.error('Get student profile error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get student profile',
      message: error.message
    });
  }
});

module.exports = router;