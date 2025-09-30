const express = require('express');
const router = express.Router();
const { 
  UserModel, 
  StudentModel, 
  HostelModel, 
  RoomModel, 
  RoomAllotmentModel, 
  MaintenanceRequestModel, 
  NotificationModel 
} = require('../models');

// Test database models
router.get('/test-models', async (req, res) => {
  try {
    const tests = [];

    // Test each model's basic functionality
    try {
      const users = await UserModel.findAll();
      tests.push({ model: 'UserModel', status: 'success', count: users.length });
    } catch (error) {
      tests.push({ model: 'UserModel', status: 'error', error: error.message });
    }

    try {
      const students = await StudentModel.findAll();
      tests.push({ model: 'StudentModel', status: 'success', count: students.length });
    } catch (error) {
      tests.push({ model: 'StudentModel', status: 'error', error: error.message });
    }

    try {
      const hostels = await HostelModel.findAll();
      tests.push({ model: 'HostelModel', status: 'success', count: hostels.length });
    } catch (error) {
      tests.push({ model: 'HostelModel', status: 'error', error: error.message });
    }

    try {
      const rooms = await RoomModel.findAll();
      tests.push({ model: 'RoomModel', status: 'success', count: rooms.length });
    } catch (error) {
      tests.push({ model: 'RoomModel', status: 'error', error: error.message });
    }

    try {
      const allotments = await RoomAllotmentModel.findAll();
      tests.push({ model: 'RoomAllotmentModel', status: 'success', count: allotments.length });
    } catch (error) {
      tests.push({ model: 'RoomAllotmentModel', status: 'error', error: error.message });
    }

    try {
      const requests = await MaintenanceRequestModel.findAll();
      tests.push({ model: 'MaintenanceRequestModel', status: 'success', count: requests.length });
    } catch (error) {
      tests.push({ model: 'MaintenanceRequestModel', status: 'error', error: error.message });
    }

    try {
      const notifications = await NotificationModel.findAll();
      tests.push({ model: 'NotificationModel', status: 'success', count: notifications.length });
    } catch (error) {
      tests.push({ model: 'NotificationModel', status: 'error', error: error.message });
    }

    res.json({
      message: 'Model tests completed',
      timestamp: new Date().toISOString(),
      tests,
      summary: {
        total: tests.length,
        successful: tests.filter(t => t.status === 'success').length,
        failed: tests.filter(t => t.status === 'error').length
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Test failed',
      message: error.message
    });
  }
});

// Get database schema info
router.get('/schema-info', async (req, res) => {
  try {
    // Schema info is not available without direct DB connection. Return a placeholder or use Supabase pg_meta if configured.
    res.json({
      message: 'Schema information not available in supabase-only mode',
      timestamp: new Date().toISOString(),
      tables: {}
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get schema info',
      message: error.message
    });
  }
});

module.exports = router;