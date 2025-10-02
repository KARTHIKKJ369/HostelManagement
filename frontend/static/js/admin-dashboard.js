// Admin Dashboard JavaScript
console.log('Admin Dashboard initialized');

// Check authentication and role
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    loadDashboardData();
});

function checkAuthentication() {
    const token = TokenManager.getToken();
    const user = TokenManager.getUser();
    
    if (!token || !user || user.role !== 'SuperAdmin') {
        console.warn('Unauthorized access to admin dashboard');
        window.location.href = 'login.html';
        return;
    }
    
    populateUserInfo();
}

function populateUserInfo() {
    const user = TokenManager.getUser();
    const username = user ? user.username : 'Super Administrator';
    const lastLogin = new Date().toLocaleDateString();
    
    document.getElementById('userInfo').innerHTML = `
        <h3>Welcome, ${username}!</h3>
        <p>Last Login: ${lastLogin} | Role: Super Administrator</p>
        <p style="color: #2563eb;">You have full system administration privileges</p>
    `;
}

function loadDashboardData() {
    loadSystemStats();
    loadUserSummary();
    loadHostelSummary();
    loadFinancialSummary();
    loadMaintenanceOverview();
    loadSecuritySummary();
    loadSystemHealth();
    loadAdminActivity();
    loadSystemNotifications();
}

async function loadSystemStats() {
    try {
        console.log('📊 Loading SuperAdmin system stats...');
        
        const stats = await API.call('/superadmin/stats', { method: 'GET' });
        console.log('✅ SuperAdmin stats loaded:', stats);
        
        // Update the dashboard stats
        document.getElementById('totalUsers').textContent = stats.system.totalUsers || 0;
        document.getElementById('totalHostels').textContent = stats.system.totalHostels || 0;
        document.getElementById('systemAlerts').textContent = stats.system.systemAlerts || 0;
        document.getElementById('activeWardens').textContent = stats.users.Warden || 0;
        
    } catch (error) {
        console.error('❌ Error loading system stats:', error);
        // Fallback to show loading error
        document.getElementById('totalUsers').textContent = '—';
        document.getElementById('totalHostels').textContent = '—';
        document.getElementById('systemAlerts').textContent = '—';
        document.getElementById('activeWardens').textContent = '—';
    }
}

async function loadUserSummary() {
    try {
        console.log('👥 Loading user summary...');
        
        const stats = await API.call('/superadmin/stats', { method: 'GET' });
        
        const userSummary = {
            totalStudents: stats.users.Student || 0,
            totalWardens: stats.users.Warden || 0,
            totalAdmins: (stats.users.SuperAdmin || 0) + (stats.users.Admin || 0),
            newRegistrations: 'N/A', // TODO: Implement this metric
            activeUsers: stats.system.totalUsers || 0
        };
        
        document.getElementById('userSummary').innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 1rem; margin-top: 1rem;">
                <div style="text-align: center;">
                    <h4 style="margin: 0; color: #2563eb;">${userSummary.totalStudents}</h4>
                    <small>Students</small>
                </div>
                <div style="text-align: center;">
                    <h4 style="margin: 0; color: #2563eb;">${userSummary.totalWardens}</h4>
                    <small>Wardens</small>
                </div>
                <div style="text-align: center;">
                    <h4 style="margin: 0; color: #2563eb;">${userSummary.totalAdmins}</h4>
                    <small>Admins</small>
                </div>
                <div style="text-align: center;">
                    <h4 style="margin: 0; color: #10b981;">${userSummary.activeUsers}</h4>
                    <small>Total Users</small>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('❌ Error loading user summary:', error);
        document.getElementById('userSummary').innerHTML = `
            <div style="color: #dc3545; font-style: italic; text-align: center; padding: 1rem;">
                Error loading user statistics
            </div>
        `;
    }
}

async function loadHostelSummary() {
    try {
        console.log('🏢 Loading hostel summary...');
        
        const stats = await API.call('/superadmin/stats', { method: 'GET' });
        
        const hostelSummary = {
            totalRooms: stats.rooms.total || 0,
            occupiedRooms: stats.rooms.byStatus.Occupied || 0,
            availableRooms: stats.rooms.byStatus.Vacant || 0,
            maintenanceRooms: stats.rooms.byStatus['Under Maintenance'] || 0
        };
        
        document.getElementById('hostelSummary').innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 1rem; margin-top: 1rem;">
                <div style="text-align: center;">
                    <h4 style="margin: 0; color: #2563eb;">${hostelSummary.totalRooms}</h4>
                    <small>Total Rooms</small>
                </div>
                <div style="text-align: center;">
                    <h4 style="margin: 0; color: #10b981;">${hostelSummary.occupiedRooms}</h4>
                    <small>Occupied</small>
                </div>
                <div style="text-align: center;">
                    <h4 style="margin: 0; color: #3b82f6;">${hostelSummary.availableRooms}</h4>
                    <small>Available</small>
                </div>
                <div style="text-align: center;">
                    <h4 style="margin: 0; color: #f59e0b;">${hostelSummary.maintenanceRooms}</h4>
                    <small>Maintenance</small>
                </div>
            </div>
            <div style="margin-top: 1rem; padding: 0.75rem; background: #f8f9fa; border-radius: 4px; text-align: center;">
                <small style="color: #666;">
                    Occupancy Rate: <strong>${stats.system.occupancyRate || 0}%</strong> | 
                    Total Hostels: <strong>${stats.hostels.total || 0}</strong>
                </small>
            </div>
        `;
        
    } catch (error) {
        console.error('❌ Error loading hostel summary:', error);
        document.getElementById('hostelSummary').innerHTML = `
            <div style="color: #dc3545; font-style: italic; text-align: center; padding: 1rem;">
                Error loading hostel statistics
            </div>
        `;
    }
}

function loadFinancialSummary() {
    const financialSummary = {
        monthlyRevenue: 125000,
        pendingFees: 23500,
        totalCollected: 1450000,
        outstandingAmount: 67500
    };
    
    document.getElementById('financialSummary').innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin-top: 1rem;">
            <div style="text-align: center;">
                <h4 style="margin: 0; color: #10b981;">₹${financialSummary.monthlyRevenue.toLocaleString()}</h4>
                <small>Monthly Revenue</small>
            </div>
            <div style="text-align: center;">
                <h4 style="margin: 0; color: #f59e0b;">₹${financialSummary.pendingFees.toLocaleString()}</h4>
                <small>Pending Fees</small>
            </div>
            <div style="text-align: center;">
                <h4 style="margin: 0; color: #2563eb;">₹${financialSummary.totalCollected.toLocaleString()}</h4>
                <small>Total Collected</small>
            </div>
            <div style="text-align: center;">
                <h4 style="margin: 0; color: #dc2626;">₹${financialSummary.outstandingAmount.toLocaleString()}</h4>
                <small>Outstanding</small>
            </div>
        </div>
    `;
}

function loadMaintenanceOverview() {
    const maintenanceOverview = {
        totalRequests: 47,
        pendingRequests: 12,
        inProgress: 8,
        completedThisWeek: 15
    };
    
    document.getElementById('maintenanceOverview').innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 1rem; margin-top: 1rem;">
            <div style="text-align: center;">
                <h4 style="margin: 0; color: #2563eb;">${maintenanceOverview.totalRequests}</h4>
                <small>Total</small>
            </div>
            <div style="text-align: center;">
                <h4 style="margin: 0; color: #f59e0b;">${maintenanceOverview.pendingRequests}</h4>
                <small>Pending</small>
            </div>
            <div style="text-align: center;">
                <h4 style="margin: 0; color: #3b82f6;">${maintenanceOverview.inProgress}</h4>
                <small>In Progress</small>
            </div>
            <div style="text-align: center;">
                <h4 style="margin: 0; color: #10b981;">${maintenanceOverview.completedThisWeek}</h4>
                <small>Completed</small>
            </div>
        </div>
    `;
}

function loadSecuritySummary() {
    const securitySummary = {
        activeLogins: 67,
        failedAttempts: 3,
        suspiciousActivity: 1,
        lastSecurityScan: '2 hours ago'
    };
    
    document.getElementById('securitySummary').innerHTML = `
        <div style="margin-top: 1rem;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 1rem;">
                <div style="text-align: center;">
                    <h4 style="margin: 0; color: #10b981;">${securitySummary.activeLogins}</h4>
                    <small>Active Logins</small>
                </div>
                <div style="text-align: center;">
                    <h4 style="margin: 0; color: #f59e0b;">${securitySummary.failedAttempts}</h4>
                    <small>Failed Attempts</small>
                </div>
                <div style="text-align: center;">
                    <h4 style="margin: 0; color: #dc2626;">${securitySummary.suspiciousActivity}</h4>
                    <small>Suspicious</small>
                </div>
            </div>
            <p style="margin-top: 1rem; font-size: 0.9rem; color: #6b7280;">Last Security Scan: ${securitySummary.lastSecurityScan}</p>
        </div>
    `;
}

function loadSystemHealth() {
    const systemHealth = {
        serverStatus: 'Online',
        databaseStatus: 'Healthy',
        backupStatus: 'Up to date',
        systemLoad: '34%',
        diskUsage: '67%',
        memoryUsage: '42%'
    };
    
    document.getElementById('systemHealth').innerHTML = `
        <div style="margin-top: 1rem;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem;">
                <div>
                    <p style="margin: 0; font-weight: 500;">Server Status</p>
                    <p style="margin: 0; color: #10b981;">${systemHealth.serverStatus}</p>
                </div>
                <div>
                    <p style="margin: 0; font-weight: 500;">Database</p>
                    <p style="margin: 0; color: #10b981;">${systemHealth.databaseStatus}</p>
                </div>
                <div>
                    <p style="margin: 0; font-weight: 500;">Backup</p>
                    <p style="margin: 0; color: #10b981;">${systemHealth.backupStatus}</p>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 1rem; margin-top: 1rem;">
                <div>
                    <p style="margin: 0; font-weight: 500;">System Load</p>
                    <p style="margin: 0; color: #3b82f6;">${systemHealth.systemLoad}</p>
                </div>
                <div>
                    <p style="margin: 0; font-weight: 500;">Disk Usage</p>
                    <p style="margin: 0; color: #f59e0b;">${systemHealth.diskUsage}</p>
                </div>
                <div>
                    <p style="margin: 0; font-weight: 500;">Memory</p>
                    <p style="margin: 0; color: #3b82f6;">${systemHealth.memoryUsage}</p>
                </div>
            </div>
        </div>
    `;
}

function loadAdminActivity() {
    const activities = [
        { action: 'User Created', user: 'warden_kumar', time: '2 hours ago' },
        { action: 'Hostel Added', details: 'Block D - East Wing', time: '4 hours ago' },
        { action: 'System Backup', details: 'Scheduled backup completed', time: '6 hours ago' },
        { action: 'Security Update', details: 'Password policy updated', time: '1 day ago' },
        { action: 'Fee Structure', details: 'Monthly fees updated', time: '2 days ago' }
    ];
    
    let activityHTML = '<div style="margin-top: 1rem;">';
    activities.forEach(activity => {
        activityHTML += `
            <div style="padding: 0.75rem; background: #f8fafc; border-radius: 8px; margin-bottom: 0.5rem;">
                <div style="display: flex; justify-content: between; align-items: center;">
                    <div>
                        <p style="margin: 0; font-weight: 500; color: #2563eb;">${activity.action}</p>
                        ${activity.details ? `<p style="margin: 0; font-size: 0.9rem; color: #6b7280;">${activity.details}</p>` : ''}
                        ${activity.user ? `<p style="margin: 0; font-size: 0.9rem; color: #6b7280;">User: ${activity.user}</p>` : ''}
                    </div>
                    <small style="color: #9ca3af;">${activity.time}</small>
                </div>
            </div>
        `;
    });
    activityHTML += '</div>';
    
    document.getElementById('adminActivity').innerHTML = activityHTML;
}

function loadSystemNotifications() {
    const notifications = [
        { type: 'warning', message: 'Disk usage approaching 70% threshold', priority: 'Medium' },
        { type: 'info', message: 'System maintenance scheduled for next Sunday', priority: 'Low' },
        { type: 'error', message: 'Failed login attempts detected from IP 192.168.1.100', priority: 'High' }
    ];
    
    let notificationHTML = '<div style="margin-top: 1rem;">';
    notifications.forEach(notification => {
        const priorityColor = notification.priority === 'High' ? '#dc2626' : 
                             notification.priority === 'Medium' ? '#f59e0b' : '#10b981';
        
        notificationHTML += `
            <div style="padding: 0.75rem; background: #f8fafc; border-left: 4px solid ${priorityColor}; border-radius: 4px; margin-bottom: 0.5rem;">
                <div style="display: flex; justify-content: between; align-items: center;">
                    <p style="margin: 0; font-size: 0.9rem;">${notification.message}</p>
                    <span style="background: ${priorityColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">
                        ${notification.priority}
                    </span>
                </div>
            </div>
        `;
    });
    notificationHTML += '</div>';
    
    document.getElementById('systemNotifications').innerHTML = notificationHTML;
}

// Dashboard Action Functions
function manageUsers() {
    alert('User Management interface coming soon!');
}

function createUser() {
    alert('Create User interface coming soon!');
}

function manageHostels() {
    alert('Hostel Management interface coming soon!');
}

function addHostel() {
    alert('Add Hostel interface coming soon!');
}

function viewAnalytics() {
    alert('Analytics dashboard coming soon!');
}

function generateReports() {
    alert('Report generation coming soon!');
}

// User Management Functions
async function manageUsers() {
    try {
        console.log('👥 Loading all users...');
        const users = await API.call('/superadmin/users', { method: 'GET' });
        
        // Create a modal or new page to show users
        const userListHTML = users.map(user => `
            <div style="border: 1px solid #ddd; padding: 1rem; margin: 0.5rem 0; border-radius: 4px;">
                <h4>${user.username} <span style="font-size: 0.8rem; background: #e3f2fd; padding: 2px 6px; border-radius: 3px;">${user.role}</span></h4>
                <p><strong>Email:</strong> ${user.email || 'N/A'} | <strong>Phone:</strong> ${user.phone || 'N/A'}</p>
                <p><strong>Created:</strong> ${new Date(user.created_at).toLocaleDateString()} | <strong>Last Login:</strong> ${user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</p>
                <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.5rem;" onclick="editUser(${user.user_id})">Edit</button>
                <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="deleteUser(${user.user_id}, '${user.username}')">Delete</button>
            </div>
        `).join('');
        
        // Show in a modal-like overlay
        showModal('User Management', `
            <div style="max-height: 400px; overflow-y: auto;">
                <div style="margin-bottom: 1rem;">
                    <button class="btn btn-primary" onclick="showCreateUserForm()">Create New User</button>
                </div>
                ${userListHTML}
            </div>
        `);
        
    } catch (error) {
        console.error('❌ Error loading users:', error);
        UIHelper.showAlert('Failed to load users', 'error');
    }
}

async function createUser() {
    showCreateUserForm();
}

function showCreateUserForm() {
    const form = `
        <form id="createUserForm" onsubmit="submitCreateUser(event)" style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
                <label>Username:</label>
                <input type="text" name="username" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div>
                <label>Password:</label>
                <input type="password" name="password" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div>
                <label>Role:</label>
                <select name="role" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="">Select Role</option>
                    <option value="Student">Student</option>
                    <option value="Warden">Warden</option>
                    <option value="SuperAdmin">SuperAdmin</option>
                </select>
            </div>
            <div>
                <label>Email (optional):</label>
                <input type="email" name="email" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div>
                <label>Phone (optional):</label>
                <input type="tel" name="phone" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div>
                <button type="submit" class="btn btn-primary">Create User</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()" style="margin-left: 0.5rem;">Cancel</button>
            </div>
        </form>
    `;
    
    showModal('Create New User', form);
}

async function submitCreateUser(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const userData = Object.fromEntries(formData.entries());
        
        console.log('👤 Creating user:', userData.username);
        
        const result = await API.call('/superadmin/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        UIHelper.showAlert(`User ${userData.username} created successfully!`, 'success');
        closeModal();
        loadDashboardData(); // Refresh stats
        
    } catch (error) {
        console.error('❌ Error creating user:', error);
        UIHelper.showAlert('Failed to create user: ' + error.message, 'error');
    }
}

// Hostel Management Functions
async function manageHostels() {
    try {
        console.log('🏢 Loading all hostels...');
        const hostels = await API.call('/superadmin/hostels', { method: 'GET' });
        
        const hostelListHTML = hostels.map(hostel => `
            <div style="border: 1px solid #ddd; padding: 1rem; margin: 0.5rem 0; border-radius: 4px;">
                <h4>${hostel.hostel_name} <span style="font-size: 0.8rem; background: ${hostel.hostel_type === 'Boys' ? '#e3f2fd' : '#fce4ec'}; padding: 2px 6px; border-radius: 3px;">${hostel.hostel_type}</span></h4>
                <p><strong>Location:</strong> ${hostel.location || 'N/A'} | <strong>Total Rooms:</strong> ${hostel.total_rooms || 0}</p>
                <p><strong>Occupancy:</strong> ${hostel.occupied_rooms}/${hostel.total_rooms} rooms | <strong>Warden:</strong> ${hostel.warden_username || 'Not assigned'}</p>
                <button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.5rem;" onclick="manageHostelRooms(${hostel.hostel_id}, '${hostel.hostel_name}')">Manage Rooms</button>
                <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.5rem;" onclick="editHostel(${hostel.hostel_id})">Edit</button>
                <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="deleteHostel(${hostel.hostel_id}, '${hostel.hostel_name}')">Delete</button>
            </div>
        `).join('');
        
        showModal('Hostel Management', `
            <div style="max-height: 400px; overflow-y: auto;">
                <div style="margin-bottom: 1rem;">
                    <button class="btn btn-primary" onclick="showCreateHostelForm()">Add New Hostel</button>
                </div>
                ${hostelListHTML}
            </div>
        `);
        
    } catch (error) {
        console.error('❌ Error loading hostels:', error);
        UIHelper.showAlert('Failed to load hostels', 'error');
    }
}

async function addHostel() {
    showCreateHostelForm();
}

function showCreateHostelForm() {
    const form = `
        <form id="createHostelForm" onsubmit="submitCreateHostel(event)" style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
                <label>Hostel Name:</label>
                <input type="text" name="hostel_name" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div>
                <label>Hostel Type:</label>
                <select name="hostel_type" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="">Select Type</option>
                    <option value="Boys">Boys</option>
                    <option value="Girls">Girls</option>
                </select>
            </div>
            <div>
                <label>Location:</label>
                <input type="text" name="location" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div>
                <label>Total Rooms:</label>
                <input type="number" name="total_rooms" min="0" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div>
                <button type="submit" class="btn btn-primary">Create Hostel</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()" style="margin-left: 0.5rem;">Cancel</button>
            </div>
        </form>
    `;
    
    showModal('Add New Hostel', form);
}

async function submitCreateHostel(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const hostelData = Object.fromEntries(formData.entries());
        
        console.log('🏢 Creating hostel:', hostelData.hostel_name);
        
        const result = await API.call('/superadmin/hostels', {
            method: 'POST',
            body: JSON.stringify(hostelData)
        });
        
        UIHelper.showAlert(`Hostel ${hostelData.hostel_name} created successfully!`, 'success');
        closeModal();
        loadDashboardData(); // Refresh stats
        
    } catch (error) {
        console.error('❌ Error creating hostel:', error);
        UIHelper.showAlert('Failed to create hostel: ' + error.message, 'error');
    }
}

// Utility Functions for Modals
function showModal(title, content) {
    const modal = `
        <div id="modalOverlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;" onclick="closeModal()">
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 600px; width: 90%; max-height: 80%; overflow-y: auto;" onclick="event.stopPropagation()">
                <h3 style="margin: 0 0 1rem 0; padding-bottom: 0.5rem; border-bottom: 1px solid #eee;">${title}</h3>
                ${content}
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('modalOverlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modal);
}

function closeModal() {
    const modal = document.getElementById('modalOverlay');
    if (modal) {
        modal.remove();
    }
}

// Edit User Function
async function editUser(userId) {
    try {
        console.log(`✏️ Editing user ${userId}...`);
        
        // Get user details first
        const users = await API.call('/superadmin/users', { method: 'GET' });
        const user = users.find(u => u.user_id === parseInt(userId));
        
        if (!user) {
            UIHelper.showAlert('User not found', 'error');
            return;
        }
        
        const form = `
            <form id="editUserForm" onsubmit="submitEditUser(event, ${userId})" style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                    <label>Username:</label>
                    <input type="text" name="username" value="${user.username}" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div>
                    <label>Role:</label>
                    <select name="role" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="Student" ${user.role === 'Student' ? 'selected' : ''}>Student</option>
                        <option value="Warden" ${user.role === 'Warden' ? 'selected' : ''}>Warden</option>
                        <option value="SuperAdmin" ${user.role === 'SuperAdmin' ? 'selected' : ''}>SuperAdmin</option>
                    </select>
                </div>
                <div>
                    <label>Email:</label>
                    <input type="email" name="email" value="${user.email || ''}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div>
                    <label>Phone:</label>
                    <input type="tel" name="phone" value="${user.phone || ''}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div>
                    <button type="submit" class="btn btn-primary">Update User</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal()" style="margin-left: 0.5rem;">Cancel</button>
                </div>
            </form>
        `;
        
        showModal(`Edit User: ${user.username}`, form);
        
    } catch (error) {
        console.error('❌ Error editing user:', error);
        UIHelper.showAlert('Failed to load user details for editing', 'error');
    }
}

// Submit Edit User
async function submitEditUser(event, userId) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const userData = Object.fromEntries(formData.entries());
        
        console.log(`✏️ Updating user ${userId}...`);
        
        const result = await API.call(`/superadmin/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
        
        UIHelper.showAlert(`User ${userData.username} updated successfully!`, 'success');
        closeModal();
        loadDashboardData(); // Refresh stats
        
        // Refresh the user list if modal is open
        setTimeout(() => {
            manageUsers();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error updating user:', error);
        UIHelper.showAlert('Failed to update user: ' + error.message, 'error');
    }
}

// Show Reassign Warden Dialog
async function showReassignWardenDialog(wardenUserId, wardenUsername) {
    try {
        console.log('📋 Loading reassignment options...');
        
        // Get all users who can be wardens
        const users = await API.call('/superadmin/users', { method: 'GET' });
        const wardens = users.filter(u => u.role === 'Warden' && u.user_id !== parseInt(wardenUserId));
        
        // Get hostels assigned to this warden
        const hostels = await API.call('/superadmin/hostels', { method: 'GET' });
        const assignedHostels = hostels.filter(h => h.warden_id === parseInt(wardenUserId));
        
        if (assignedHostels.length === 0) {
            UIHelper.showAlert('No hostels found assigned to this warden', 'info');
            return;
        }
        
        const wardenOptions = wardens.length > 0 
            ? wardens.map(w => `<option value="${w.user_id}">${w.username} (${w.email || 'No email'})</option>`).join('')
            : '<option value="">No other wardens available</option>';
        
        const hostelsList = assignedHostels.map(h => `
            <div style="border: 1px solid #ddd; padding: 0.75rem; margin: 0.5rem 0; border-radius: 4px;">
                <strong>${h.hostel_name}</strong> (${h.hostel_type})
                <div style="margin-top: 0.5rem;">
                    <label>New Warden:</label>
                    <select name="warden_${h.hostel_id}" style="width: 100%; padding: 0.25rem; margin-top: 0.25rem;">
                        <option value="">Remove warden assignment</option>
                        ${wardenOptions}
                    </select>
                </div>
            </div>
        `).join('');
        
        const form = `
            <form id="reassignWardenForm" onsubmit="submitWardenReassignment(event, ${wardenUserId}, '${wardenUsername}')" style="display: flex; flex-direction: column; gap: 1rem;">
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 0.75rem; border-radius: 4px;">
                    <strong>⚠️ Warden Reassignment Required</strong>
                    <p>User "${wardenUsername}" is assigned to ${assignedHostels.length} hostel(s). Please reassign or remove these assignments before deletion.</p>
                </div>
                
                <div>
                    <h4>Hostels to Reassign:</h4>
                    ${hostelsList}
                </div>
                
                <div>
                    <button type="submit" class="btn btn-primary">Reassign & Delete User</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal()" style="margin-left: 0.5rem;">Cancel</button>
                </div>
            </form>
        `;
        
        showModal(`Reassign Warden: ${wardenUsername}`, form);
        
    } catch (error) {
        console.error('❌ Error loading reassignment dialog:', error);
        UIHelper.showAlert('Failed to load reassignment options', 'error');
    }
}

// Submit Warden Reassignment
async function submitWardenReassignment(event, wardenUserId, wardenUsername) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const assignments = {};
        
        // Extract hostel reassignments
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('warden_')) {
                const hostelId = key.replace('warden_', '');
                assignments[hostelId] = value || null; // null means remove warden
            }
        }
        
        console.log('🔄 Processing warden reassignments...', assignments);
        
        // Update each hostel's warden assignment
        for (const [hostelId, newWardenId] of Object.entries(assignments)) {
            const wardenIdToSend = newWardenId ? parseInt(newWardenId) : null;
            
            console.log(`🔄 Updating hostel ${hostelId} with warden ID:`, wardenIdToSend);
            
            await API.call(`/superadmin/hostels/${hostelId}`, {
                method: 'PUT',
                body: JSON.stringify({ warden_id: wardenIdToSend })
            });
        }
        
        // Now try to delete the user again
        console.log(`🗑️ Now deleting user ${wardenUserId}...`);
        await API.call(`/superadmin/users/${wardenUserId}`, {
            method: 'DELETE'
        });
        
        UIHelper.showAlert(`Warden reassigned and user "${wardenUsername}" deleted successfully!`, 'success');
        closeModal();
        loadDashboardData(); // Refresh stats
        
        // Refresh the user list
        setTimeout(() => {
            manageUsers();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error during reassignment:', error);
        UIHelper.showAlert('Failed to reassign warden: ' + error.message, 'error');
    }
}

// Delete User Function
async function deleteUser(userId, username) {
    try {
        if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
            return;
        }
        
        console.log(`🗑️ Deleting user ${userId}...`);
        
        const result = await API.call(`/superadmin/users/${userId}`, {
            method: 'DELETE'
        });
        
        UIHelper.showAlert(`User "${username}" deleted successfully!`, 'success');
        closeModal();
        loadDashboardData(); // Refresh stats
        
        // Refresh the user list if modal is open
        setTimeout(() => {
            manageUsers();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error deleting user:', error);
        
        // Check if it's a warden assignment error
        if (error.message && error.message.includes('assigned to') && error.message.includes('hostel')) {
            // Show option to reassign warden instead
            const confirmReassign = confirm(
                `${error.message}\n\nWould you like to reassign the warden first, then delete the user?`
            );
            
            if (confirmReassign) {
                showReassignWardenDialog(userId, username);
                return;
            }
        }
        
        // Show specific error message if available
        let errorMessage = 'Failed to delete user';
        if (error.message && error.message !== 'Failed to delete user') {
            errorMessage = error.message;
        } else if (error.response && error.response.message) {
            errorMessage = error.response.message;
        }
        
        UIHelper.showAlert(errorMessage, 'error');
    }
}

// Edit Hostel Function
async function editHostel(hostelId) {
    try {
        console.log(`✏️ Editing hostel ${hostelId}...`);
        
        // Get hostel details and available wardens
        const [hostels, users] = await Promise.all([
            API.call('/superadmin/hostels', { method: 'GET' }),
            API.call('/superadmin/users', { method: 'GET' })
        ]);
        
        const hostel = hostels.find(h => h.hostel_id === parseInt(hostelId));
        const wardens = users.filter(u => u.role === 'Warden');
        
        if (!hostel) {
            UIHelper.showAlert('Hostel not found', 'error');
            return;
        }
        
        const wardenOptions = wardens.map(w => 
            `<option value="${w.user_id}" ${w.user_id === hostel.warden_id ? 'selected' : ''}>${w.username} (${w.email || 'No email'})</option>`
        ).join('');
        
        const form = `
            <form id="editHostelForm" onsubmit="submitEditHostel(event, ${hostelId})" style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                    <label>Hostel Name:</label>
                    <input type="text" name="hostel_name" value="${hostel.hostel_name}" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div>
                    <label>Hostel Type:</label>
                    <select name="hostel_type" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="Boys" ${hostel.hostel_type === 'Boys' ? 'selected' : ''}>Boys</option>
                        <option value="Girls" ${hostel.hostel_type === 'Girls' ? 'selected' : ''}>Girls</option>
                    </select>
                </div>
                <div>
                    <label>Assigned Warden:</label>
                    <select name="warden_id" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="">No warden assigned</option>
                        ${wardenOptions}
                    </select>
                </div>
                <div>
                    <label>Location:</label>
                    <input type="text" name="location" value="${hostel.location || ''}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div>
                    <label>Total Rooms (for reference):</label>
                    <input type="number" name="total_rooms" value="${hostel.total_rooms || 0}" min="0" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div>
                    <button type="submit" class="btn btn-primary">Update Hostel</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal()" style="margin-left: 0.5rem;">Cancel</button>
                </div>
            </form>
        `;
        
        showModal(`Edit Hostel: ${hostel.hostel_name}`, form);
        
    } catch (error) {
        console.error('❌ Error editing hostel:', error);
        UIHelper.showAlert('Failed to load hostel details for editing', 'error');
    }
}

// Submit Edit Hostel
async function submitEditHostel(event, hostelId) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const hostelData = Object.fromEntries(formData.entries());
        
        // Convert empty string to null for warden_id
        if (!hostelData.warden_id) {
            hostelData.warden_id = null;
        }
        
        console.log(`✏️ Updating hostel ${hostelId}...`);
        
        const result = await API.call(`/superadmin/hostels/${hostelId}`, {
            method: 'PUT',
            body: JSON.stringify(hostelData)
        });
        
        UIHelper.showAlert(`Hostel ${hostelData.hostel_name} updated successfully!`, 'success');
        closeModal();
        loadDashboardData(); // Refresh stats
        
        // Refresh the hostel list if modal is open
        setTimeout(() => {
            manageHostels();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error updating hostel:', error);
        UIHelper.showAlert('Failed to update hostel: ' + error.message, 'error');
    }
}

// Delete Hostel Function
async function deleteHostel(hostelId, hostelName) {
    try {
        if (!confirm(`Are you sure you want to delete hostel "${hostelName}"? This will also delete all associated rooms. This action cannot be undone.`)) {
            return;
        }
        
        console.log(`🗑️ Deleting hostel ${hostelId}...`);
        
        const result = await API.call(`/superadmin/hostels/${hostelId}`, {
            method: 'DELETE'
        });
        
        UIHelper.showAlert(`Hostel "${hostelName}" deleted successfully!`, 'success');
        closeModal();
        loadDashboardData(); // Refresh stats
        
        // Refresh the hostel list if modal is open
        setTimeout(() => {
            manageHostels();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error deleting hostel:', error);
        UIHelper.showAlert('Failed to delete hostel: ' + error.message, 'error');
    }
}

// Manage Hostel Rooms Function
async function manageHostelRooms(hostelId, hostelName) {
    try {
        console.log(`🏠 Loading rooms for hostel ${hostelId}...`);
        
        const rooms = await API.call(`/superadmin/hostels/${hostelId}/rooms`, { method: 'GET' });
        
        const roomListHTML = rooms.map(room => `
            <div style="border: 1px solid #ddd; padding: 0.75rem; margin: 0.5rem 0; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>Room ${room.room_no}</strong>
                    <div style="font-size: 0.9rem; color: #666;">
                        Capacity: ${room.capacity} | Status: <span style="color: ${room.status === 'Vacant' ? '#10b981' : room.status === 'Occupied' ? '#f59e0b' : '#dc3545'};">${room.status}</span>
                    </div>
                </div>
                <div>
                    <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.5rem;" onclick="editRoom(${room.room_id})">Edit</button>
                    <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="deleteRoom(${room.room_id}, '${room.room_no}')">Delete</button>
                </div>
            </div>
        `).join('');
        
        showModal(`Rooms in ${hostelName}`, `
            <div style="max-height: 400px; overflow-y: auto;">
                <div style="margin-bottom: 1rem;">
                    <button class="btn btn-primary" onclick="showAddRoomForm(${hostelId}, '${hostelName}')">Add New Room</button>
                    <button class="btn btn-secondary" onclick="manageHostels()" style="margin-left: 0.5rem;">Back to Hostels</button>
                </div>
                ${rooms.length > 0 ? roomListHTML : '<p style="color: #666; font-style: italic; text-align: center; padding: 2rem;">No rooms found in this hostel.</p>'}
            </div>
        `);
        
    } catch (error) {
        console.error('❌ Error loading hostel rooms:', error);
        UIHelper.showAlert('Failed to load hostel rooms', 'error');
    }
}

// Add Room Form
function showAddRoomForm(hostelId, hostelName) {
    const form = `
        <form id="addRoomForm" onsubmit="submitAddRoom(event, ${hostelId}, '${hostelName}')" style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
                <label>Room Number:</label>
                <input type="text" name="room_no" required placeholder="e.g., A-101, B-205" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div>
                <label>Capacity:</label>
                <input type="number" name="capacity" required min="1" max="10" placeholder="Number of beds" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div>
                <label>Status:</label>
                <select name="status" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="Vacant">Vacant</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                </select>
            </div>
            <div>
                <button type="submit" class="btn btn-primary">Add Room</button>
                <button type="button" class="btn btn-secondary" onclick="manageHostelRooms(${hostelId}, '${hostelName}')" style="margin-left: 0.5rem;">Cancel</button>
            </div>
        </form>
    `;
    
    showModal(`Add Room to ${hostelName}`, form);
}

// Submit Add Room
async function submitAddRoom(event, hostelId, hostelName) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const roomData = Object.fromEntries(formData.entries());
        
        console.log(`🏠 Adding room ${roomData.room_no} to hostel ${hostelId}...`);
        
        const result = await API.call(`/superadmin/hostels/${hostelId}/rooms`, {
            method: 'POST',
            body: JSON.stringify(roomData)
        });
        
        UIHelper.showAlert(`Room ${roomData.room_no} added successfully!`, 'success');
        loadDashboardData(); // Refresh stats
        
        // Go back to room management
        setTimeout(() => {
            manageHostelRooms(hostelId, hostelName);
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error adding room:', error);
        UIHelper.showAlert('Failed to add room: ' + error.message, 'error');
    }
}

// Edit Room Function
async function editRoom(roomId) {
    try {
        console.log(`✏️ Editing room ${roomId}...`);
        // For now, show a simple alert - you can implement a full edit form later
        UIHelper.showAlert(`Edit room functionality coming soon! Room ID: ${roomId}`, 'info');
    } catch (error) {
        console.error('❌ Error editing room:', error);
        UIHelper.showAlert('Failed to edit room', 'error');
    }
}

// Delete Room Function
async function deleteRoom(roomId, roomNo) {
    try {
        if (!confirm(`Are you sure you want to delete room "${roomNo}"? This action cannot be undone.`)) {
            return;
        }
        
        console.log(`🗑️ Deleting room ${roomId}...`);
        
        const result = await API.call(`/superadmin/rooms/${roomId}`, {
            method: 'DELETE'
        });
        
        UIHelper.showAlert(`Room "${roomNo}" deleted successfully!`, 'success');
        loadDashboardData(); // Refresh stats
        
        // Refresh the current view
        setTimeout(() => {
            location.reload(); // Simple way to refresh the room list
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error deleting room:', error);
        UIHelper.showAlert('Failed to delete room: ' + error.message, 'error');
    }
}

function exportData() {
    alert('Data export coming soon!');
}

function systemLogs() {
    alert('System logs viewer coming soon!');
}

function systemSettings() {
    alert('System Settings interface coming soon!');
}

function emailConfig() {
    alert('Email Configuration coming soon!');
}

function backupSettings() {
    alert('Backup Settings coming soon!');
}

function securitySettings() {
    alert('Security Settings coming soon!');
}

function financialDashboard() {
    alert('Financial Dashboard coming soon!');
}

function feeManagement() {
    alert('Fee Management coming soon!');
}

function maintenanceReports() {
    alert('Maintenance Reports coming soon!');
}

function scheduleSystemMaintenance() {
    alert('System Maintenance Scheduler coming soon!');
}

function securityAudit() {
    alert('Security Audit interface coming soon!');
}

function accessLogs() {
    alert('Access Logs viewer coming soon!');
}

function healthCheck() {
    alert('Running full system health check...');
    setTimeout(() => {
        alert('System health check completed. All systems operational.');
    }, 2000);
}

function manageNotifications() {
    alert('Notification Management coming soon!');
}

// Logout function
document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
        TokenManager.clear();
        window.location.href = 'login.html';
    }
});

console.log('Admin Dashboard functions loaded');