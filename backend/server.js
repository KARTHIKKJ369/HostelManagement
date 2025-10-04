const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Import routes
const testRoutes = require('./routes/test');
const authRoutes = require('./routes/auth');
const allotmentRoutes = require('./routes/allotment');
const maintenanceRoutes = require('./routes/maintenance');
const notificationRoutes = require('./routes/notifications');
const wardenRoutes = require('./routes/warden');
const superadminRoutes = require('./routes/superadmin');
const studentActivityRoutes = require('./routes/student_activity');
const issuesRoutes = require('./routes/issues');

// Frontend entry routes (serve static HTML)
app.get('/', (req, res) => {
  // Default to login page on root
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Friendly paths for main pages
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin-dashboard.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/student-dashboard.html'));
});

app.get('/warden', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/warden-dashboard.html'));
});

// API health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Mount routes
app.use('/api/test', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/allotment', allotmentRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/warden', wardenRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/activity', studentActivityRoutes);
app.use('/api/issues', issuesRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📍 API URL: http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();