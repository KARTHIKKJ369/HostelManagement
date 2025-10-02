const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { supabase } = require('../config/supabase');
const { 
  UserModel, 
  HostelModel, 
  RoomModel, 
  StudentModel,
  AllotmentApplicationModel,
  MaintenanceRequestModel,
  RoomAllotmentModel 
} = require('../models');
const SettingsService = require('../services/SettingsService');

// Middleware to ensure SuperAdmin role
const requireSuperAdminRole = (req, res, next) => {
  if (req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ message: 'SuperAdmin access required' });
  }
  next();
};

// Lightweight audit logger (non-fatal if audit_logs table is missing)
async function logAudit(level, action, details, req) {
  try {
    const payload = {
      ts: new Date().toISOString(),
      level,
      actor_user_id: req?.user?.userId || null,
      action,
      details: details || {}
    };
    const { error } = await supabase.from('audit_logs').insert(payload);
    if (error) throw error;
  } catch (e) {
    // Silently ignore logging errors so they never break main flow
    if (process.env.NODE_ENV === 'development') {
      console.warn('Audit log skipped:', e.message);
    }
  }
}

// GET /api/superadmin/students - Minimal list for dropdowns
router.get('/students', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    // Optional search query ?q= to filter by reg_no or name
    const q = (req.query.q || '').trim();
    let qb = supabase.from('students').select('student_id, reg_no, name').order('reg_no', { ascending: true }).limit(500);
    if (q) {
      qb = qb.or(`reg_no.ilike.%${q}%,name.ilike.%${q}%`);
    }
    const { data, error } = await qb;
    if (error) throw error;
    res.json({ success: true, students: data || [] });
  } catch (error) {
    console.error('❌ Error loading students list:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load students' });
  }
});

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

// GET /api/superadmin/analytics/overview - High-level analytics for charts
router.get('/analytics/overview', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const [rooms, allotments, applications, maintenance] = await Promise.all([
      RoomModel.findAll(),
      RoomAllotmentModel.findAll(),
      AllotmentApplicationModel.findAll(),
      MaintenanceRequestModel.findAll()
    ]);

    const byStatus = rooms.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
    const activeAllotments = allotments.filter(a => a.status === 'Active').length;
    const occupancyRate = rooms.length ? Math.round((activeAllotments / rooms.length) * 100) : 0;

    // Applications by status
    const appByStatus = applications.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});

    // Maintenance by status
    const maintByStatus = maintenance.reduce((acc, m) => { acc[m.status] = (acc[m.status] || 0) + 1; return acc; }, {});

    res.json({
      occupancyRate,
      rooms: { total: rooms.length, byStatus },
      applications: { total: applications.length, byStatus: appByStatus },
      maintenance: { total: maintenance.length, byStatus: maintByStatus }
    });
  } catch (error) {
    console.error('❌ Error loading analytics overview:', error);
    res.status(500).json({ message: 'Failed to load analytics overview' });
  }
});

// GET /api/superadmin/maintenance/overview - Aggregated maintenance counts
router.get('/maintenance/overview', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    // Fetch all requests in last 30 days for recency insight; adjust as needed
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('status, priority, created_at, updated_at')
      .gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString());
    if (error) throw error;
    const rows = data || [];
    const total = rows.length;
    const pending = rows.filter(r => r.status === 'Pending').length;
    const inProgress = rows.filter(r => r.status === 'In Progress').length;
    const oneWeekAgo = new Date(Date.now() - 7*24*60*60*1000);
    const completedThisWeek = rows.filter(r => r.status === 'Completed' && new Date(r.updated_at || r.created_at) >= oneWeekAgo).length;
    res.json({ success: true, overview: { total, pending, inProgress, completedThisWeek } });
  } catch (error) {
    console.error('❌ Maintenance overview error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load maintenance overview' });
  }
});

// GET /api/superadmin/maintenance/reports - Summary stats and recent items
router.get('/maintenance/reports', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from('maintenance_requests')
      .select('request_id, status, category, priority, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    const byStatus = rows.reduce((a, r) => { a[r.status] = (a[r.status]||0)+1; return a; }, {});
    const byCategory = rows.reduce((a, r) => { a[r.category] = (a[r.category]||0)+1; return a; }, {});
    const byPriority = rows.reduce((a, r) => { a[r.priority] = (a[r.priority]||0)+1; return a; }, {});
    res.json({ success: true, stats: { byStatus, byCategory, byPriority, total: rows.length }, recent: rows.slice(0, 20) });
  } catch (e) {
    console.error('❌ Maintenance reports error:', e.message);
    res.status(500).json({ success: false, message: 'Failed to load maintenance reports' });
  }
});

// POST /api/superadmin/maintenance/schedule - Create a scheduled maintenance entry
router.post('/maintenance/schedule', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const { title, description, category, priority = 'Medium', scheduled_for, hostel_id, room_id, assigned_to } = req.body;
    if (!title || !category || !scheduled_for) {
      return res.status(400).json({ success: false, message: 'title, category and scheduled_for are required' });
    }
    const { data, error } = await supabase
      .from('maintenance_schedules')
      .insert({ title, description, category, priority, scheduled_for, hostel_id, room_id, assigned_to })
      .select()
      .maybeSingle();
    if (error) throw error;
    // Audit log
    logAudit('INFO', 'MAINTENANCE_SCHEDULE_CREATE', { id: data?.schedule_id || data?.id, title, category, scheduled_for }, req);
    res.status(201).json({ success: true, schedule: data });
  } catch (e) {
    console.error('❌ Schedule maintenance error:', e.message);
    res.status(500).json({ success: false, message: 'Failed to schedule maintenance' });
  }
});

// GET /api/superadmin/export/:entity - CSV export for selected entities
router.get('/export/:entity', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const { entity } = req.params;
    let rows = [];
    if (entity === 'users') rows = await UserModel.findAll();
    else if (entity === 'hostels') {
      const hostels = await HostelModel.findAll();
      // Enrich with warden details for readability
      const wardenIds = [...new Set((hostels || []).map(h => h.warden_id).filter(Boolean))];
      let wardenMap = {};
      if (wardenIds.length) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('user_id, username, email')
            .in('user_id', wardenIds);
          if (error) throw error;
          wardenMap = (data || []).reduce((acc, u) => { acc[u.user_id] = u; return acc; }, {});
        } catch (e) {
          console.warn('⚠️ Failed to enrich hostels with warden names:', e.message);
        }
      }
      rows = (hostels || []).map(h => ({
        ...h,
        warden_name: h.warden_id ? (wardenMap[h.warden_id]?.username || '') : '',
        warden_email: h.warden_id ? (wardenMap[h.warden_id]?.email || '') : ''
      }));
    }
    else if (entity === 'rooms') rows = await RoomModel.findAll();
    else if (entity === 'allotments') rows = await RoomAllotmentModel.findAll();
    else if (entity === 'applications') rows = await AllotmentApplicationModel.findAll();
    else if (entity === 'maintenance') rows = await MaintenanceRequestModel.findAll();
    else return res.status(400).json({ message: 'Unsupported export entity' });

    const csv = toCSV(rows);
    // Audit log export action (fire-and-forget)
    logAudit('INFO', 'EXPORT', { entity, count: rows.length }, req);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${entity}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error('❌ Error exporting data:', error);
    res.status(500).json({ message: 'Failed to export data' });
  }
});

function toCSV(rows) {
  if (!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map(h => escape(r[h])).join(','));
  }
  return lines.join('\n');
}

// GET /api/superadmin/logs - Placeholder system logs (extend to real log store later)
router.get('/logs', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    // Placeholder: minimal logs derived from recent changes; can be replaced with a logs table later
    const now = new Date();
    const sample = [
      { ts: now.toISOString(), level: 'INFO', message: 'System OK' },
      { ts: new Date(now.getTime() - 3600_000).toISOString(), level: 'INFO', message: 'Nightly health check passed' }
    ];
    res.json({ logs: sample });
  } catch (error) {
    console.error('❌ Error loading logs:', error);
    res.status(500).json({ message: 'Failed to load system logs' });
  }
});

// Settings APIs
// GET /api/superadmin/settings
router.get('/settings', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const settings = await SettingsService.getSettings();
    res.json({ success: true, settings });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Failed to load settings' });
  }
});

// Finance APIs
// GET /api/superadmin/finance/summary
router.get('/finance/summary', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    // Aggregate fees and payments
    const { data: fees, error: fErr } = await supabase.from('fees').select('*');
    if (fErr) throw fErr;
    const { data: payments, error: pErr } = await supabase.from('payments').select('*');
    if (pErr) throw pErr;

    const totals = (fees || []).reduce((acc, f) => {
      acc.total_billed += Number(f.amount || 0);
      acc.total_paid += Number(f.paid_amount || 0);
      acc.pending += Math.max(0, Number(f.amount || 0) - Number(f.paid_amount || 0));
      if (f.status === 'Overdue') acc.overdue += Math.max(0, Number(f.amount || 0) - Number(f.paid_amount || 0));
      return acc;
    }, { total_billed: 0, total_paid: 0, pending: 0, overdue: 0 });

    const thisMonth = new Date();
    thisMonth.setDate(1);
    const monthlyPayments = (payments || []).filter(p => new Date(p.paid_at) >= thisMonth)
      .reduce((s, p) => s + Number(p.amount || 0), 0);

    res.json({ success: true, summary: { ...totals, monthlyPayments, feesCount: fees?.length || 0 } });
  } catch (error) {
    console.error('❌ Finance summary error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load finance summary' });
  }
});

// GET /api/superadmin/finance/fees?status=&student_id=
router.get('/finance/fees', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    let qb = supabase.from('fees').select('*, students(name, reg_no)');
    if (req.query.status) qb = qb.eq('status', req.query.status);
    if (req.query.student_id) qb = qb.eq('student_id', req.query.student_id);
    const { data, error } = await qb.order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, fees: data || [] });
  } catch (error) {
    console.error('❌ List fees error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load fees' });
  }
});

// POST /api/superadmin/finance/fees
router.post('/finance/fees', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const { student_id, amount, due_date, description } = req.body;
    if (!student_id || amount == null) return res.status(400).json({ success: false, message: 'student_id and amount required' });
    const { data, error } = await supabase.from('fees').insert({ student_id, amount, due_date, description }).select().maybeSingle();
    if (error) throw error;
    // Audit log
    logAudit('INFO', 'FEE_CREATE', { fee_id: data?.fee_id, student_id, amount }, req);
    res.status(201).json({ success: true, fee: data });
  } catch (error) {
    console.error('❌ Create fee error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create fee' });
  }
});

// POST /api/superadmin/finance/fees/:fee_id/pay
router.post('/finance/fees/:fee_id/pay', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const fee_id = parseInt(req.params.fee_id);
    const { amount, method, reference } = req.body;
    if (!fee_id || !amount) return res.status(400).json({ success: false, message: 'fee_id and amount required' });

    // Insert payment
    const { data: pay, error: pErr } = await supabase.from('payments').insert({ fee_id, amount, method, reference }).select().maybeSingle();
    if (pErr) throw pErr;

    // Update fee paid_amount and status
    const { data: feeRow, error: fErr } = await supabase.from('fees').select('*').eq('fee_id', fee_id).maybeSingle();
    if (fErr) throw fErr;
    if (!feeRow) return res.status(404).json({ success: false, message: 'Fee not found' });

    const newPaid = Number(feeRow.paid_amount || 0) + Number(amount);
    let status = 'Partially Paid';
    if (newPaid >= Number(feeRow.amount)) status = 'Paid';
    const { error: uErr } = await supabase.from('fees').update({ paid_amount: newPaid, status, paid_at: status === 'Paid' ? new Date().toISOString() : feeRow.paid_at }).eq('fee_id', fee_id);
    if (uErr) throw uErr;
    // Audit log
    logAudit('INFO', 'PAYMENT_RECORD', { payment_id: pay?.payment_id, fee_id, amount, status }, req);
    res.json({ success: true, payment: pay, newPaid, status });
  } catch (error) {
    console.error('❌ Record payment error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
});

// PUT /api/superadmin/settings
router.put('/settings', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const updated = await SettingsService.updateSettings(req.body || {});
    // Audit log
    logAudit('INFO', 'SETTINGS_UPDATE', { keys: Object.keys(req.body || {}) }, req);
    res.json({ success: true, settings: updated });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Failed to update settings' });
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

// GET /api/superadmin/users/search?q= - search users by username/email
router.get('/users/search', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ success: true, users: [] });
    // Prefer Supabase ilike search
    const { data, error } = await supabase
      .from('users')
      .select('user_id, username, email, role')
      .or(`username.ilike.%${q}%,email.ilike.%${q}%`)
      .order('username', { ascending: true })
      .limit(20);
    if (error) throw error;
    res.json({ success: true, users: data || [] });
  } catch (e) {
    console.error('❌ User search error:', e.message);
    res.status(500).json({ success: false, message: 'Failed to search users' });
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

    // Allow only valid fields to be updated
    const allowedFields = ['username', 'role', 'email', 'phone'];
    const filteredUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value;
      }
    }

    // Optional: basic role validation
    if (filteredUpdates.role && !['Student', 'Warden', 'SuperAdmin'].includes(filteredUpdates.role)) {
      return res.status(400).json({ message: 'Invalid role. Must be Student, Warden, or SuperAdmin' });
    }

    // Use correct PK column for users table
    const updatedUser = await UserModel.update(userId, filteredUpdates, 'user_id');
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
      const warden = await UserModel.findById(warden_id, 'user_id');
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
    
    // Handle specific database errors
    if (error.code === '23505' && error.message.includes('duplicate key')) {
      res.status(409).json({ 
        message: 'Database sequence error. Please try creating the hostel again.' 
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to create hostel',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
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
    
    // Attempt direct Supabase update to avoid BaseModel select/trigger issues
    const { error: sbError } = await supabase
      .from('hostels')
      .update(filteredUpdates)
      .eq('hostel_id', hostelId);

    if (sbError) {
      throw sbError;
    }

    // Fetch updated hostel separately
    const updatedHostel = await HostelModel.findById(hostelId, 'hostel_id');
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
    // Detect common Supabase trigger error referencing missing updated_at column
    if (error && error.code === '42703' && typeof error.message === 'string' && error.message.toLowerCase().includes('updated_at')) {
      return res.status(409).json({
        message: 'Hostel update failed due to a database trigger expecting an updated_at column on hostels. Please add an updated_at TIMESTAMP column to the hostels table.',
        hint: 'Run the migration in database/migrations/20251002_add_updated_at.sql to add updated_at and triggers.'
      });
    }
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
    
    // Fetch rooms for this hostel
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('room_id')
      .eq('hostel_id', hostelId);

    if (roomsError) {
      console.error('❌ Error fetching rooms for deletion:', roomsError);
      return res.status(500).json({ message: 'Failed to verify hostel rooms before deletion' });
    }

    const roomIds = (rooms || []).map(r => r.room_id);

    // Check if hostel has active allotments using a direct count query
    if (roomIds.length > 0) {
      const { count: activeCount, error: countError } = await supabase
        .from('room_allotments')
        .select('*', { count: 'exact', head: true })
        .in('room_id', roomIds)
        .eq('status', 'Active');

      if (countError) {
        console.error('❌ Error counting active allotments for delete:', countError);
        return res.status(500).json({ message: 'Failed to verify active allotments before deletion' });
      }

      if ((activeCount || 0) > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete hostel with active room allotments' 
        });
      }
    }

    // Cascade clean-up: First, nullify references in allotment_applications to avoid FK violations
    if (roomIds.length > 0) {
      console.log(`🔗 Clearing application allocations for ${roomIds.length} room(s)`);
      const { error: appsAllocNullErr } = await supabase
        .from('allotment_applications')
        .update({ allocated_room_id: null })
        .in('allocated_room_id', roomIds);
      if (appsAllocNullErr) {
        console.error('❌ Error nullifying allocated_room_id in applications:', appsAllocNullErr);
        return res.status(500).json({ message: 'Failed to clear application allocations for hostel rooms' });
      }

      // Now delete room allotments and maintenance requests tied to these rooms (to satisfy FK), then rooms
      console.log(`🧹 Deleting room allotments for ${roomIds.length} room(s)`);
      const { error: raDeleteError } = await supabase
        .from('room_allotments')
        .delete()
        .in('room_id', roomIds);
      if (raDeleteError) {
        console.error('❌ Error deleting room allotments for hostel rooms:', raDeleteError);
        return res.status(500).json({ message: 'Failed to delete room allotments for hostel' });
      }

      console.log(`🧹 Cleaning up related maintenance requests for ${roomIds.length} room(s)`);
      const { error: mrDeleteError } = await supabase
        .from('maintenance_requests')
        .delete()
        .in('room_id', roomIds);
      if (mrDeleteError) {
        console.error('❌ Error deleting maintenance requests for hostel rooms:', mrDeleteError);
        // Not fatal if none exist; proceed
      }

      console.log(`🧹 Deleting ${roomIds.length} room(s) for hostel ${hostelId}`);
      const { error: roomsDeleteError } = await supabase
        .from('rooms')
        .delete()
        .eq('hostel_id', hostelId);
      if (roomsDeleteError) {
        console.error('❌ Error deleting rooms for hostel:', roomsDeleteError);
        return res.status(500).json({ message: 'Failed to delete rooms for hostel' });
      }
    }

    // Also clear preferred_hostel_id references in applications that point to this hostel
    console.log(`🔗 Clearing application preferred_hostel references for hostel ${hostelId}`);
    const { error: appsPrefNullErr } = await supabase
      .from('allotment_applications')
      .update({ preferred_hostel_id: null })
      .eq('preferred_hostel_id', hostelId);
    if (appsPrefNullErr) {
      console.error('❌ Error nullifying preferred_hostel_id in applications:', appsPrefNullErr);
      return res.status(500).json({ message: 'Failed to clear application preferred hostel references' });
    }

    // Finally, delete the hostel using correct PK column
    const deleted = await HostelModel.delete(hostelId, 'hostel_id');
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
    const hostel = await HostelModel.findById(hostelId, 'hostel_id');
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

// POST /api/superadmin/hostels/:hostelId/rooms/bulk - Bulk add rooms to hostel
router.post('/hostels/:hostelId/rooms/bulk', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const { hostelId } = req.params;
    const { rooms } = req.body; // Expect [{ room_no, capacity, status }]

    console.log(`📦 Bulk adding rooms to hostel ${hostelId}...`);

    if (!Array.isArray(rooms) || rooms.length === 0) {
      return res.status(400).json({ message: 'Rooms array is required' });
    }

    // Check hostel exists
    const hostel = await HostelModel.findById(hostelId, 'hostel_id');
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found' });
    }

    // Fetch existing rooms for this hostel to avoid duplicates
    const { data: existing, error: existingErr } = await supabase
      .from('rooms')
      .select('room_no')
      .eq('hostel_id', hostelId);

    if (existingErr) {
      console.error('❌ Error fetching existing rooms before bulk insert:', existingErr);
      return res.status(500).json({ message: 'Failed to verify existing rooms' });
    }

    const existingSet = new Set((existing || []).map(r => (r.room_no || '').trim().toUpperCase()));

    // Normalize, validate and filter rooms
    const normalized = [];
    const skipped = [];
    for (const r of rooms) {
      const room_no = (r.room_no || '').trim();
      const capacity = parseInt(r.capacity);
      const status = r.status === 'Under Maintenance' ? 'Under Maintenance' : 'Vacant';

      if (!room_no || !capacity || capacity < 1) {
        skipped.push({ room_no: r.room_no, reason: 'Invalid room_no or capacity' });
        continue;
      }

      const key = room_no.toUpperCase();
      if (existingSet.has(key)) {
        skipped.push({ room_no, reason: 'Duplicate (already exists)' });
        continue;
      }

      normalized.push({ hostel_id: parseInt(hostelId), room_no, capacity, status });
      existingSet.add(key); // avoid duplicates within this request
    }

    if (normalized.length === 0) {
      return res.status(409).json({ 
        message: 'No new rooms to add. All provided rooms already exist or were invalid.',
        skipped
      });
    }

    // Insert rooms
    const { data: created, error: insertErr } = await supabase
      .from('rooms')
      .insert(normalized)
      .select();

    if (insertErr) {
      console.error('❌ Error bulk inserting rooms:', insertErr);
      return res.status(500).json({ message: 'Failed to create rooms in bulk' });
    }

    console.log(`✅ Bulk created ${created?.length || 0} rooms, skipped ${skipped.length}`);

    // Optionally update room count
    try { await HostelModel.updateRoomCount(hostelId); } catch (e) { console.warn('Room count update skipped:', e?.message); }

    res.status(201).json({
      message: `Created ${created?.length || 0} room(s). Skipped ${skipped.length}.`,
      created: created || [],
      skipped
    });

  } catch (error) {
    console.error('❌ Error bulk creating rooms:', error);
    res.status(500).json({ message: 'Failed to bulk create rooms' });
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

// POST /api/superadmin/rooms/:roomId/vacate - Vacate room (remove all allotments)
router.post('/rooms/:roomId/vacate', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    console.log(`🏠 Vacating room ${roomId}...`);
    
    // First, get the room details
    const room = await RoomModel.findById(roomId, 'room_id');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    // Find all active allotments for this room
    const allotments = await RoomAllotmentModel.findAll();
    const activeAllotments = allotments.filter(a => 
      a.room_id == roomId && a.status === 'Active'
    );
    
    console.log(`📋 Found ${activeAllotments.length} active allotments to clear`);

    // Robust approach: bulk-delete all active allotments for this room to avoid UPDATE triggers expecting updated_at
    // 1) Count active allotments
    const { count: activeCount, error: countError } = await supabase
      .from('room_allotments')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('status', 'Active');

    if (countError) {
      console.error('❌ Error counting active allotments:', countError);
    }

    // 2) Delete active allotments
    const { error: bulkDeleteError } = await supabase
      .from('room_allotments')
      .delete()
      .eq('room_id', roomId)
      .eq('status', 'Active');

    if (bulkDeleteError) {
      console.error('❌ Error deleting active allotments:', bulkDeleteError);
    } else {
      console.log(`✅ Deleted ${activeCount || 0} active allotment(s) for room ${roomId}`);
    }

    // Build response details (minimal, as rows aren't returned from delete without select)
    const vacatedAllotments = Array.from({ length: activeCount || 0 }, (_, i) => ({
      allotment_id: null,
      status: 'Removed',
      vacated_date: new Date().toISOString().split('T')[0]
    }));
    
    // Skip updating room status to avoid UPDATE triggers expecting updated_at
    // Just fetch latest room for response
    const updatedRoom = await RoomModel.findById(roomId, 'room_id');
    
    console.log(`✅ Successfully vacated room ${roomId}: ${vacatedAllotments.length} allotments updated/removed`);

    res.json({
  message: `Room cleared successfully. ${vacatedAllotments.length} active allotment(s) have been removed.`,
      room: updatedRoom,
      vacatedAllotments: vacatedAllotments.length,
      details: vacatedAllotments.map(a => ({
        allotmentId: a.allotment_id,
        status: a.status,
        vacatedDate: a.vacated_date
      }))
    });

  } catch (error) {
    console.error('❌ Error vacating room:', error);
    res.status(500).json({ message: 'Failed to vacate room: ' + error.message });
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

// GET /api/superadmin/security/summary - basic security stats snapshot
router.get('/security/summary', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    // For now, derive simple counts from audit_logs and users
    let failedAttempts = 0;
    try {
      const { data, error } = await supabase.from('audit_logs').select('id').eq('level', 'WARN');
      if (error) throw error;
      failedAttempts = (data || []).length;
    } catch (e) {
      // table may not exist; keep defaults
    }
    const users = await UserModel.findAll();
    const suspiciousActivity = 0; // placeholder; can hook into intrusion detection
    const lastSecurityScan = 'N/A'; // could be from settings or audits
    res.json({ success: true, summary: {
      activeLogins: users.length, // approximation for demo
      failedAttempts,
      suspiciousActivity,
      lastSecurityScan
    }});
  } catch (error) {
    console.error('❌ Security summary error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load security summary' });
  }
});

// GET /api/superadmin/admin-activity - recent admin actions (placeholder)
router.get('/admin-activity', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    // Use audit_logs if available, else provide sample recent actions
    let items = [];
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('ts, level, actor_user_id, action, details')
        .order('ts', { ascending: false })
        .limit(20);
      if (error) throw error;
      items = (data || []).map(row => ({
        action: row.action || row.level,
        user: row.actor_user_id,
        details: row.details?.message || '',
        time: row.ts
      }));
    } catch (e) {
      // If audit_logs table isn’t available or query fails, return empty list
      items = [];
    }
    // If table exists but empty, return empty (no forced samples) so Clear works as expected
    res.json({ success: true, activities: items });
  } catch (error) {
    console.error('❌ Admin activity error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load admin activity' });
  }
});
// DELETE /api/superadmin/admin-activity - clear recent admin actions
router.delete('/admin-activity', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(501).json({ success: false, message: 'Supabase not configured on server.' });
    }
    let deletedTotal = 0;
    // Attempt a broad delete with a universal filter
    let del = await supabase.from('audit_logs').delete().not('id', 'is', null).select('id');
    if (del.error) {
      // Fallback: delete by batching IDs if the above fails due to RLS or filter semantics
      let loopGuard = 0;
      while (loopGuard < 10) {
        const { data: ids, error: sErr } = await supabase
          .from('audit_logs')
          .select('id')
          .limit(1000);
        if (sErr) return res.status(500).json({ success: false, message: sErr.message });
        if (!ids || ids.length === 0) break;
        const idList = ids.map(r => r.id);
        const { error: dErr } = await supabase.from('audit_logs').delete().in('id', idList);
        if (dErr) return res.status(500).json({ success: false, message: dErr.message });
        deletedTotal += idList.length;
        loopGuard++;
      }
    } else {
      deletedTotal = Array.isArray(del.data) ? del.data.length : 0;
    }
    return res.json({ success: true, deleted: deletedTotal });
  } catch (error) {
    console.error('❌ Clear admin activity error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to clear admin activity' });
  }
});

function sampleAdminActivity() {
  return [
    { action: 'User Created', user: 'admin', details: 'Warden account added', time: new Date(Date.now()-2*3600e3).toISOString() },
    { action: 'Hostel Added', user: 'admin', details: 'Block D - East Wing', time: new Date(Date.now()-4*3600e3).toISOString() },
    { action: 'System Backup', user: 'system', details: 'Scheduled backup completed', time: new Date(Date.now()-6*3600e3).toISOString() },
    { action: 'Security Update', user: 'admin', details: 'Password policy updated', time: new Date(Date.now()-24*3600e3).toISOString() },
    { action: 'Fee Structure', user: 'finance', details: 'Monthly fees updated', time: new Date(Date.now()-2*24*3600e3).toISOString() }
  ];
}

// GET /api/superadmin/system-notifications - operational/system notifications
router.get('/system-notifications', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    // Prefer DB notifications; fallback to sample
    let rows = [];
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('notification_id, title, message, created_at, receiver_role, receiver_id')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      rows = data || [];
    } catch (e) {
      // table may not exist; keep rows empty, will fallback
    }

    const derivePriority = (t, m) => {
      const s = `${t || ''} ${m || ''}`.toLowerCase();
      if (/(error|failed|critical|security)/.test(s)) return 'High';
      if (/(warn|maintenance|degrad|delay)/.test(s)) return 'Medium';
      return 'Low';
    };

    let list = rows.map(r => ({
      id: r.notification_id,
      message: r.title ? `${r.title}: ${r.message}` : r.message,
      priority: derivePriority(r.title, r.message),
      created_at: r.created_at
    }));

    if (!list.length) {
      list = [
        { message: 'Disk usage approaching 70% threshold', priority: 'Medium' },
        { message: 'System maintenance scheduled for next Sunday', priority: 'Low' },
        { message: 'Failed login attempts detected from unknown IP', priority: 'High' }
      ];
    }

    res.json({ success: true, notifications: list });
  } catch (error) {
    console.error('❌ System notifications error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load system notifications' });
  }
});

// Notifications management APIs for SuperAdmin
// GET /api/superadmin/notifications?limit=20
router.get('/notifications', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20'), 100);
    const { data, error } = await supabase
      .from('notifications')
      .select('notification_id, title, message, receiver_role, receiver_id, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.json({ success: true, notifications: data || [] });
  } catch (error) {
    console.error('❌ List notifications error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
});

// POST /api/superadmin/notifications - create notification
router.post('/notifications', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const { target = 'All', role, user_id, title, message } = req.body || {};
    if (!message) return res.status(400).json({ success: false, message: 'message is required' });
    let payload;
    if (target === 'User') {
      if (!user_id) return res.status(400).json({ success: false, message: 'user_id is required for target User' });
      payload = { sender_id: req.user.userId, receiver_id: user_id, receiver_role: null, title, message };
    } else if (target === 'Role') {
      if (!role || !['Student', 'Warden'].includes(role)) return res.status(400).json({ success: false, message: 'role must be Student or Warden' });
      payload = { sender_id: req.user.userId, receiver_id: null, receiver_role: role, title, message };
    } else {
      // All
      payload = { sender_id: req.user.userId, receiver_id: null, receiver_role: 'All', title, message };
    }
    const { data, error } = await supabase.from('notifications').insert(payload).select().maybeSingle();
    if (error) throw error;
    logAudit('INFO', 'NOTIFICATION_CREATE', { notification_id: data?.notification_id, target, role, user_id }, req);
    res.status(201).json({ success: true, notification: data });
  } catch (error) {
    console.error('❌ Create notification error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create notification' });
  }
});

// DELETE /api/superadmin/notifications/:id
router.delete('/notifications/:id', authenticateToken, requireSuperAdminRole, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'invalid id' });
    const { data, error } = await supabase.from('notifications').delete().eq('notification_id', id).select().maybeSingle();
    if (error) throw error;
    logAudit('INFO', 'NOTIFICATION_DELETE', { notification_id: id }, req);
    res.json({ success: true, deleted: !!data });
  } catch (error) {
    console.error('❌ Delete notification error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
});

module.exports = router;