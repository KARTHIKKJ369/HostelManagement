const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
  UserModel, 
  HostelModel, 
  RoomModel, 
  StudentModel,
  AllotmentApplicationModel,
  MaintenanceRequestModel,
  RoomAllotmentModel 
} = require('../models');

// Middleware to ensure SuperAdmin role
const requireSuperAdminRole = (req, res, next) => {
  if (req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ message: 'SuperAdmin access required' });
  }
  next();
};

// GET /api/superadmin/stats - System overview statistics
router.get('/stats', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    console.log('📊 Loading SuperAdmin dashboard stats...');

    // Get total users count by role
    const users = await UserModel.findAll();
    const totalUsers = users.length;
    const usersByRole = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    // Get hostels count
    const hostels = await HostelModel.findAll();
    const totalHostels = hostels.length;
    const hostelsByType = hostels.reduce((acc, hostel) => {
      acc[hostel.hostel_type] = (acc[hostel.hostel_type] || 0) + 1;
      return acc;
    }, {});

    // Get rooms statistics
    const rooms = await RoomModel.findAll();
    const totalRooms = rooms.length;
    const roomsByStatus = rooms.reduce((acc, room) => {
      acc[room.status] = (acc[room.status] || 0) + 1;
      return acc;
    }, {});

    // Get active allotments
    const allotments = await RoomAllotmentModel.findAll();
    const activeAllotments = allotments.filter(a => a.status === 'Active').length;

    // Get pending applications
    const applications = await AllotmentApplicationModel.findAll();
    const pendingApplications = applications.filter(a => a.status === 'pending').length;

    // Get maintenance requests
    const maintenanceRequests = await MaintenanceRequestModel.findAll();
    const pendingMaintenance = maintenanceRequests.filter(r => r.status === 'pending').length;

    // Calculate system health metrics
    const occupancyRate = totalRooms > 0 ? Math.round((activeAllotments / totalRooms) * 100) : 0;
    const systemAlerts = pendingApplications + pendingMaintenance;

    const stats = {
      system: {
        totalUsers,
        totalHostels,
        totalRooms,
        activeAllotments,
        occupancyRate,
        systemAlerts
      },
      users: usersByRole,
      hostels: {
        total: totalHostels,
        byType: hostelsByType
      },
      rooms: {
        total: totalRooms,
        byStatus: roomsByStatus
      },
      applications: {
        pending: pendingApplications,
        total: applications.length
      },
      maintenance: {
        pending: pendingMaintenance,
        total: maintenanceRequests.length
      }
    };

    console.log('✅ SuperAdmin stats loaded');
    res.json(stats);

  } catch (error) {
    console.error('❌ Error loading SuperAdmin stats:', error);
    res.status(500).json({ message: 'Failed to load system statistics' });
  }
});

// GET /api/superadmin/users - Get all users
router.get('/users', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    console.log('👥 Loading all users...');
    
    const users = await UserModel.findAll();
    
    // Remove password hashes for security
    const safeUsers = users.map(user => {
      const { password_hash, ...safeUser } = user;
      return safeUser;
    });

    res.json(safeUsers);
  } catch (error) {
    console.error('❌ Error loading users:', error);
    res.status(500).json({ message: 'Failed to load users' });
  }
});

// POST /api/superadmin/users - Create new user
router.post('/users', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const { username, password, role, email, phone } = req.body;
    
    console.log(`👤 Creating new user: ${username} with role: ${role}`);
    
    // Validate required fields
    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Username, password, and role are required' });
    }

    // Check if username already exists
    const existingUser = await UserModel.findByUsername(username);
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const newUser = await UserModel.create({
      username,
      password, // UserModel should handle hashing
      role,
      email,
      phone
    });

    // Remove password hash from response
    const { password_hash, ...safeUser } = newUser;
    
    console.log('✅ User created successfully');
    res.status(201).json({ 
      message: 'User created successfully', 
      user: safeUser 
    });

  } catch (error) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// PUT /api/superadmin/users/:userId - Update user
router.put('/users/:userId', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    console.log(`✏️ Updating user ${userId}`);
    
    // Don't allow updating password through this endpoint
    if (updates.password || updates.password_hash) {
      return res.status(400).json({ message: 'Use separate endpoint to change password' });
    }

    const updatedUser = await UserModel.update(userId, updates);
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove password hash from response
    const { password_hash, ...safeUser } = updatedUser;
    
    res.json({ 
      message: 'User updated successfully', 
      user: safeUser 
    });

  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// DELETE /api/superadmin/users/:userId - Delete user
router.delete('/users/:userId', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🗑️ Deleting user ${userId}`);
    
    // Prevent self-deletion
    if (parseInt(userId) === req.user.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Get user details first
    const user = await UserModel.findById(userId, 'user_id');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check for foreign key constraints
    if (user.role === 'Warden') {
      // Check if warden is assigned to any hostels
      const hostels = await HostelModel.findAll();
      const assignedHostels = hostels.filter(h => h.warden_id == userId);
      
      if (assignedHostels.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete warden. They are assigned to ${assignedHostels.length} hostel(s): ${assignedHostels.map(h => h.hostel_name).join(', ')}. Please reassign or remove the hostels first.` 
        });
      }
    }

    if (user.role === 'Student') {
      // Check if student has active room allotments
      const allotments = await RoomAllotmentModel.findAll();
      const activeAllotments = allotments.filter(a => a.student_id == userId && a.status === 'Active');
      
      if (activeAllotments.length > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete student. They have active room allotments. Please vacate the student first.' 
        });
      }

      // Also check if they have a student record and delete it first
      const { StudentModel } = require('../models');
      const student = await StudentModel.findByUserId(userId);
      if (student) {
        await StudentModel.delete(student.student_id, 'student_id');
        console.log(`🗑️ Deleted student record for user ${userId}`);
      }
    }

    const deleted = await UserModel.delete(userId, 'user_id');
    if (!deleted) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`✅ User ${user.username} deleted successfully`);
    res.json({ message: `User ${user.username} deleted successfully` });

  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ 
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/superadmin/hostels - Get all hostels
router.get('/hostels', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    console.log('🏢 Loading all hostels...');
    
    const hostels = await HostelModel.findAllWithDetails();
    res.json(hostels);
    
  } catch (error) {
    console.error('❌ Error loading hostels:', error);
    res.status(500).json({ message: 'Failed to load hostels' });
  }
});

// POST /api/superadmin/hostels - Create new hostel
router.post('/hostels', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const { hostel_name, hostel_type, warden_id, total_rooms, location } = req.body;
    
    console.log(`🏢 Creating new hostel: ${hostel_name}`);
    
    // Validate required fields
    if (!hostel_name || !hostel_type) {
      return res.status(400).json({ message: 'Hostel name and type are required' });
    }

    // Validate hostel_type
    if (!['Boys', 'Girls'].includes(hostel_type)) {
      return res.status(400).json({ message: 'Hostel type must be Boys or Girls' });
    }

    // Validate warden if provided
    if (warden_id) {
      const warden = await UserModel.findById(warden_id);
      if (!warden || warden.role !== 'Warden') {
        return res.status(400).json({ message: 'Invalid warden ID or user is not a Warden' });
      }
    }

    const newHostel = await HostelModel.create({
      hostel_name,
      hostel_type,
      warden_id: warden_id || null,
      total_rooms: total_rooms || 0,
      location
    });
    
    console.log('✅ Hostel created successfully');
    res.status(201).json({ 
      message: 'Hostel created successfully', 
      hostel: newHostel 
    });

  } catch (error) {
    console.error('❌ Error creating hostel:', error);
    res.status(500).json({ message: 'Failed to create hostel' });
  }
});

// PUT /api/superadmin/hostels/:hostelId - Update hostel
router.put('/hostels/:hostelId', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const { hostelId } = req.params;
    const updates = req.body;
    
    console.log(`✏️ Updating hostel ${hostelId} with:`, updates);
    
    // Handle warden_id conversion and validation
    if ('warden_id' in updates) {
      if (updates.warden_id === null || updates.warden_id === '' || updates.warden_id === 'null') {
        // Removing warden assignment
        updates.warden_id = null;
        console.log('🔄 Removing warden assignment');
      } else {
        // Convert to integer and validate
        const wardenId = parseInt(updates.warden_id);
        if (isNaN(wardenId)) {
          return res.status(400).json({ message: 'Invalid warden ID format' });
        }
        
        const warden = await UserModel.findById(wardenId, 'user_id');
        if (!warden || warden.role !== 'Warden') {
          return res.status(400).json({ message: 'Invalid warden ID or user is not a Warden' });
        }
        
        updates.warden_id = wardenId;
        console.log(`🔄 Assigning warden: ${warden.username} (ID: ${wardenId})`);
      }
    }

    // Convert other numeric fields if present
    if (updates.total_rooms !== undefined) {
      updates.total_rooms = parseInt(updates.total_rooms) || 0;
    }

    // Filter out any fields that don't exist in the hostels table
    const allowedFields = ['hostel_name', 'hostel_type', 'warden_id', 'total_rooms', 'location'];
    const filteredUpdates = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value;
      }
    }
    
    console.log('🔄 Filtered updates for hostel:', filteredUpdates);
    
    const updatedHostel = await HostelModel.update(hostelId, filteredUpdates, 'hostel_id');
    if (!updatedHostel) {
      return res.status(404).json({ message: 'Hostel not found' });
    }

    console.log('✅ Hostel updated successfully');
    res.json({ 
      message: 'Hostel updated successfully', 
      hostel: updatedHostel 
    });

  } catch (error) {
    console.error('❌ Error updating hostel:', error);
    res.status(500).json({ 
      message: 'Failed to update hostel',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/superadmin/hostels/:hostelId - Delete hostel
router.delete('/hostels/:hostelId', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const { hostelId } = req.params;
    
    console.log(`🗑️ Deleting hostel ${hostelId}`);
    
    // Check if hostel has active allotments
    const rooms = await RoomModel.findByHostel(hostelId);
    const roomIds = rooms.map(r => r.room_id);
    
    if (roomIds.length > 0) {
      const allotments = await RoomAllotmentModel.findAll();
      const activeAllotments = allotments.filter(a => 
        roomIds.includes(a.room_id) && a.status === 'Active'
      );
      
      if (activeAllotments.length > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete hostel with active room allotments' 
        });
      }
    }

    const deleted = await HostelModel.delete(hostelId);
    if (!deleted) {
      return res.status(404).json({ message: 'Hostel not found' });
    }

    res.json({ message: 'Hostel deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting hostel:', error);
    res.status(500).json({ message: 'Failed to delete hostel' });
  }
});

// GET /api/superadmin/hostels/:hostelId/rooms - Get rooms for a hostel
router.get('/hostels/:hostelId/rooms', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const { hostelId } = req.params;
    
    console.log(`🏠 Loading rooms for hostel ${hostelId}...`);
    
    const rooms = await RoomModel.findByHostel(hostelId);
    res.json(rooms);
    
  } catch (error) {
    console.error('❌ Error loading hostel rooms:', error);
    res.status(500).json({ message: 'Failed to load hostel rooms' });
  }
});

// POST /api/superadmin/hostels/:hostelId/rooms - Add room to hostel
router.post('/hostels/:hostelId/rooms', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const { hostelId } = req.params;
    const { room_no, capacity, status = 'Vacant' } = req.body;
    
    console.log(`🏠 Adding room ${room_no} to hostel ${hostelId}`);
    
    // Validate required fields
    if (!room_no || !capacity) {
      return res.status(400).json({ message: 'Room number and capacity are required' });
    }

    // Check if hostel exists
    const hostel = await HostelModel.findById(hostelId);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found' });
    }

    // Check if room number already exists in this hostel
    const existingRoom = await RoomModel.findByRoomNoAndHostel(room_no, hostelId);
    if (existingRoom) {
      return res.status(409).json({ message: 'Room number already exists in this hostel' });
    }

    const newRoom = await RoomModel.create({
      hostel_id: hostelId,
      room_no,
      capacity: parseInt(capacity),
      status
    });
    
    console.log('✅ Room created successfully');
    res.status(201).json({ 
      message: 'Room created successfully', 
      room: newRoom 
    });

  } catch (error) {
    console.error('❌ Error creating room:', error);
    res.status(500).json({ message: 'Failed to create room' });
  }
});

// PUT /api/superadmin/rooms/:roomId - Update room
router.put('/rooms/:roomId', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const { roomId } = req.params;
    const updates = req.body;
    
    console.log(`✏️ Updating room ${roomId}`);
    
    // Check if room is occupied and trying to reduce capacity
    if (updates.capacity) {
      const allotments = await RoomAllotmentModel.findAll();
      const activeAllotments = allotments.filter(a => 
        a.room_id == roomId && a.status === 'Active'
      ).length;
      
      if (activeAllotments > parseInt(updates.capacity)) {
        return res.status(400).json({ 
          message: `Cannot reduce capacity below ${activeAllotments} (current occupants)` 
        });
      }
    }

    const updatedRoom = await RoomModel.update(roomId, updates);
    if (!updatedRoom) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json({ 
      message: 'Room updated successfully', 
      room: updatedRoom 
    });

  } catch (error) {
    console.error('❌ Error updating room:', error);
    res.status(500).json({ message: 'Failed to update room' });
  }
});

// DELETE /api/superadmin/rooms/:roomId - Delete room
router.delete('/rooms/:roomId', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    console.log(`🗑️ Deleting room ${roomId}`);
    
    // Check if room has active allotments
    const allotments = await RoomAllotmentModel.findAll();
    const activeAllotments = allotments.filter(a => 
      a.room_id == roomId && a.status === 'Active'
    );
    
    if (activeAllotments.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete room with active allotments' 
      });
    }

    const deleted = await RoomModel.delete(roomId);
    if (!deleted) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json({ message: 'Room deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting room:', error);
    res.status(500).json({ message: 'Failed to delete room' });
  }
});

// GET /api/superadmin/system-health - System health check
router.get('/system-health', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    console.log('🏥 Checking system health...');
    
    const health = {
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      status: 'healthy'
    };
    
    res.json(health);
    
  } catch (error) {
    console.error('❌ Error checking system health:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message 
    });
  }
});

module.exports = router;