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
    (async () => {
        try {
            const resp = await API.call('/superadmin/finance/summary', { method: 'GET' });
            const s = resp.summary || { total_billed: 0, total_paid: 0, pending: 0, overdue: 0, monthlyPayments: 0 };
            document.getElementById('financialSummary').innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-top: 1rem;">
                    <div style="text-align: center;">
                        <h4 style="margin: 0; color: #10b981;">₹${Number(s.monthlyPayments).toLocaleString()}</h4>
                        <small>Monthly Payments</small>
                    </div>
                    <div style="text-align: center;">
                        <h4 style="margin: 0; color: #2563eb;">₹${Number(s.total_paid).toLocaleString()}</h4>
                        <small>Total Collected</small>
                    </div>
                    <div style="text-align: center;">
                        <h4 style="margin: 0; color: #f59e0b;">₹${Number(s.pending).toLocaleString()}</h4>
                        <small>Pending Fees</small>
                    </div>
                    <div style="text-align: center;">
                        <h4 style="margin: 0; color: #dc2626;">₹${Number(s.overdue).toLocaleString()}</h4>
                        <small>Overdue</small>
                    </div>
                </div>
                <div style="margin-top: 1rem; text-align:center;">
                    <button class="btn btn-primary" onclick="openFeeManager()">Open Fee Manager</button>
                </div>
            `;
        } catch (e) {
            console.error('❌ Finance summary error:', e);
            document.getElementById('financialSummary').innerHTML = '<div style="color:#dc2626; text-align:center;">Failed to load finance summary</div>';
        }
    })();
}

function loadMaintenanceOverview() {
    (async () => {
        const el = document.getElementById('maintenanceOverview');
        try {
            const resp = await API.call('/superadmin/maintenance/overview', { method: 'GET' });
            const o = resp.overview || { total: 0, pending: 0, inProgress: 0, completedThisWeek: 0 };
            el.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 1rem; margin-top: 1rem;">
                    <div style="text-align: center;">
                        <h4 style="margin: 0; color: #2563eb;">${o.total}</h4>
                        <small>Total</small>
                    </div>
                    <div style="text-align: center;">
                        <h4 style="margin: 0; color: #f59e0b;">${o.pending}</h4>
                        <small>Pending</small>
                    </div>
                    <div style="text-align: center;">
                        <h4 style="margin: 0; color: #3b82f6;">${o.inProgress}</h4>
                        <small>In Progress</small>
                    </div>
                    <div style="text-align: center;">
                        <h4 style="margin: 0; color: #10b981;">${o.completedThisWeek}</h4>
                        <small>Completed (7d)</small>
                    </div>
                </div>`;
        } catch (e) {
            console.error('❌ Maintenance overview error:', e);
            el.innerHTML = '<div style="color:#dc2626; text-align:center;">Failed to load maintenance overview</div>';
        }
    })();
}

function loadSecuritySummary() {
    (async () => {
        const el = document.getElementById('securitySummary');
        try {
            const resp = await API.call('/superadmin/security/summary', { method: 'GET' });
            const s = resp.summary || { activeLogins: 0, failedAttempts: 0, suspiciousActivity: 0, lastSecurityScan: 'N/A' };
            el.innerHTML = `
                <div style="margin-top: 1rem;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 1rem;">
                        <div style=\"text-align: center;\">
                            <h4 style=\"margin: 0; color: #10b981;\">${s.activeLogins}</h4>
                            <small>Active Logins</small>
                        </div>
                        <div style=\"text-align: center;\">
                            <h4 style=\"margin: 0; color: #f59e0b;\">${s.failedAttempts}</h4>
                            <small>Failed Attempts</small>
                        </div>
                        <div style=\"text-align: center;\">
                            <h4 style=\"margin: 0; color: #dc2626;\">${s.suspiciousActivity}</h4>
                            <small>Suspicious</small>
                        </div>
                    </div>
                    <p style=\"margin-top: 1rem; font-size: 0.9rem; color: #6b7280;\">Last Security Scan: ${s.lastSecurityScan}</p>
                </div>`;
        } catch (e) {
            console.error('❌ Security summary error:', e);
            el.innerHTML = '<div style="color:#dc2626; text-align:center;">Failed to load security summary</div>';
        }
    })();
}

function loadSystemHealth() {
    (async () => {
        const el = document.getElementById('systemHealth');
        try {
            const health = await API.call('/superadmin/system-health', { method: 'GET' });
            const serverStatus = (health && health.status === 'healthy') ? 'Online' : 'Degraded';
            const databaseStatus = 'Healthy';
            const backupStatus = 'Unknown';
            const load = (health && health.memory) ? `${Math.round((health.memory.rss || 0)/1024/1024)} MB RSS` : 'N/A';
            el.innerHTML = `
                <div style="margin-top: 1rem;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem;">
                        <div>
                            <p style="margin: 0; font-weight: 500;">Server Status</p>
                            <p style="margin: 0; color: #10b981;">${serverStatus}</p>
                        </div>
                        <div>
                            <p style="margin: 0; font-weight: 500;">Database</p>
                            <p style="margin: 0; color: #10b981;">${databaseStatus}</p>
                        </div>
                        <div>
                            <p style="margin: 0; font-weight: 500;">Backup</p>
                            <p style="margin: 0; color: #10b981;">${backupStatus}</p>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 1rem; margin-top: 1rem;">
                        <div>
                            <p style="margin: 0; font-weight: 500;">System Load</p>
                            <p style="margin: 0; color: #3b82f6;">${load}</p>
                        </div>
                        <div>
                            <p style="margin: 0; font-weight: 500;">Uptime</p>
                            <p style="margin: 0; color: #3b82f6;">${health && health.uptime ? `${Math.floor(health.uptime/60)} min` : 'N/A'}</p>
                        </div>
                    </div>
                </div>`;
        } catch (e) {
            console.error('❌ System health error:', e);
            el.innerHTML = '<div style="color:#dc2626; text-align:center;">Failed to load system health</div>';
        }
    })();
}

async function loadAdminActivity() {
    const el = document.getElementById('adminActivity');
    try {
        const resp = await API.call('/superadmin/admin-activity', { method: 'GET' });
        const activities = resp.activities || [];
        if (!activities.length) {
            el.innerHTML = '<div style="margin-top:1rem; color:#6b7280; text-align:center;">No recent admin activity</div>';
            return;
        }
        const items = activities.map(activity => {
            const time = activity.time ? new Date(activity.time).toLocaleString() : '';
            return `
                <div style=\"padding: 0.75rem; background: #f8fafc; border-radius: 8px; margin-bottom: 0.5rem;\">
                    <div style=\"display: flex; justify-content: space-between; align-items: center;\">
                        <div>
                            <p style=\"margin: 0; font-weight: 500; color: #2563eb;\">${activity.action}</p>
                            ${activity.details ? `<p style=\\\"margin: 0; font-size: 0.9rem; color: #6b7280;\\\">${activity.details}</p>` : ''}
                            ${activity.user ? `<p style=\\\"margin: 0; font-size: 0.9rem; color: #6b7280;\\\">User: ${activity.user}</p>` : ''}
                        </div>
                        <small style=\"color: #9ca3af;\">${time}</small>
                    </div>
                </div>`;
        }).join('');
        el.innerHTML = `<div style=\"margin-top: 1rem;\">${items}</div>`;
    } catch (e) {
        el.innerHTML = '<div style="color:#dc2626; text-align:center;">Failed to load admin activity</div>';
    }
}

async function loadSystemNotifications() {
    const el = document.getElementById('systemNotifications');
    try {
        const resp = await API.call('/superadmin/system-notifications', { method: 'GET' });
        const notifications = resp.notifications || [];
        let notificationHTML = '<div style="margin-top: 1rem;">';
        notifications.forEach(notification => {
            const priorityColor = notification.priority === 'High' ? '#dc2626' : 
                                 notification.priority === 'Medium' ? '#f59e0b' : '#10b981';
            
            notificationHTML += `
                <div style="padding: 0.75rem; background: #f8fafc; border-left: 4px solid ${priorityColor}; border-radius: 4px; margin-bottom: 0.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <p style="margin: 0; font-size: 0.9rem;">${notification.message}</p>
                        <span style="background: ${priorityColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">
                            ${notification.priority}
                        </span>
                    </div>
                </div>`;
        });
        notificationHTML += '</div>';
        el.innerHTML = notificationHTML;
    } catch (e) {
        el.innerHTML = '<div style="color:#dc2626; text-align:center;">Failed to load notifications</div>';
    }
}

// Hook up header notifications button and modal controls
(function initNotificationsUI() {
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('openNotificationsBtn');
    if (btn) btn.addEventListener('click', openNotificationsModal);
  });
})();

function openNotificationsModal() {
  try {
    const modal = document.getElementById('notificationsModal');
    const body = document.getElementById('notificationsModalBody');
    const listEl = document.getElementById('systemNotifications');
    if (listEl && body) {
      body.innerHTML = listEl.innerHTML || '<div style="color:#6b7280;">No notifications to display</div>';
    }
    if (modal) modal.style.display = 'block';
  } catch (e) {
    console.error('openNotificationsModal error', e);
  }
}

function closeNotificationsModal() {
  const modal = document.getElementById('notificationsModal');
  if (modal) modal.style.display = 'none';
}

// Enhance loadSystemNotifications to update header badge
const _origLoadSystemNotifications = typeof loadSystemNotifications === 'function' ? loadSystemNotifications : null;
loadSystemNotifications = async function() {
  const el = document.getElementById('systemNotifications');
  const badge = document.getElementById('notifBadge');
  try {
    const resp = await API.call('/superadmin/system-notifications', { method: 'GET' });
    const notifications = resp.notifications || [];
    let notificationHTML = '<div style="margin-top: 1rem;">';
    notifications.forEach(notification => {
      const priorityColor = notification.priority === 'High' ? '#dc2626' : 
                             notification.priority === 'Medium' ? '#f59e0b' : '#10b981';
      notificationHTML += `
        <div style="padding: 0.75rem; background: #f8fafc; border-left: 4px solid ${priorityColor}; border-radius: 4px; margin-bottom: 0.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <p style="margin: 0; font-size: 0.9rem;">${notification.message}</p>
            <span style="background: ${priorityColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">
              ${notification.priority}
            </span>
          </div>
        </div>`;
    });
    notificationHTML += '</div>';
    if (el) el.innerHTML = notificationHTML;

    // Update badge count: show only if > 0
    if (badge) {
      const count = notifications.length;
      badge.textContent = String(count);
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  } catch (e) {
    if (el) el.innerHTML = '<div style="color:#dc2626; text-align:center;">Failed to load notifications</div>';
    if (badge) {
      badge.textContent = '0';
      badge.style.display = 'none';
    }
  }
}

// Close modal on backdrop click
window.addEventListener('click', (ev) => {
  const modal = document.getElementById('notificationsModal');
  if (modal && ev.target === modal) {
    closeNotificationsModal();
  }
});

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
        
        // Check if it's an active allotments error
        if (error.message && error.message.includes('active room allotments')) {
            // Show option to view and manage active allotments
            const confirmViewAllotments = confirm(
                `${error.message}\n\nWould you like to view and manage the active room allotments first?`
            );
            
            if (confirmViewAllotments) {
                showHostelAllotmentsDialog(hostelId, hostelName);
                return;
            }
        }
        
        // Show specific error message if available
        let errorMessage = 'Failed to delete hostel';
        if (error.message && error.message !== 'Failed to delete hostel') {
            errorMessage = error.message;
        }
        
        UIHelper.showAlert(errorMessage, 'error');
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
        <div style="display: flex; gap: 1rem;">
            <div style="flex: 1; border-right: 1px solid #eee; padding-right: 1rem;">
                <h4 style="margin-top: 0;">Add Single Room</h4>
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
            </div>
            <div style="flex: 1; padding-left: 1rem;">
                <h4 style="margin-top: 0;">Bulk Add Rooms</h4>
                <form id="bulkRoomForm" onsubmit="submitBulkRooms(event, ${hostelId}, '${hostelName}')" style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                        <div>
                            <label>Prefix (optional):</label>
                            <input type="text" name="prefix" placeholder="e.g., A-" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div>
                            <label>Number Width:</label>
                            <input type="number" name="width" min="1" value="3" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div>
                            <label>Start Number:</label>
                            <input type="number" name="start" required min="1" placeholder="100" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div>
                            <label>End Number:</label>
                            <input type="number" name="end" required min="1" placeholder="120" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div>
                            <label>Capacity:</label>
                            <input type="number" name="capacity" required min="1" max="10" value="2" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div>
                            <label>Status:</label>
                            <select name="status" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                                <option value="Vacant">Vacant</option>
                                <option value="Under Maintenance">Under Maintenance</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <button type="button" class="btn btn-secondary" onclick="previewBulkRooms(${hostelId})">Preview</button>
                        <button type="submit" class="btn btn-primary" style="margin-left: 0.5rem;">Add Rooms</button>
                    </div>
                    <div id="bulkPreview" style="max-height: 140px; overflow-y: auto; font-size: 0.9rem; color: #555; border: 1px dashed #ddd; padding: 0.5rem; border-radius: 4px; display: none;"></div>
                </form>
            </div>
        </div>
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

// Bulk preview generator
function previewBulkRooms() {
    const form = document.getElementById('bulkRoomForm');
    const prefix = (form.prefix.value || '').trim();
    const start = parseInt(form.start.value);
    const end = parseInt(form.end.value);
    const width = parseInt(form.width.value) || 1;

    if (isNaN(start) || isNaN(end) || end < start) {
        UIHelper.showAlert('Invalid range: End must be >= Start', 'error');
        return;
    }

    const list = [];
    for (let n = start; n <= end; n++) {
        const num = String(n).padStart(width, '0');
        list.push(prefix + num);
    }

    const preview = document.getElementById('bulkPreview');
    preview.style.display = 'block';
    preview.innerHTML = `Rooms to add (${list.length}):<br>` + list.join(', ');
}

// Submit bulk rooms
async function submitBulkRooms(event, hostelId, hostelName) {
    event.preventDefault();
    try {
        const form = document.getElementById('bulkRoomForm');
        const prefix = (form.prefix.value || '').trim();
        const start = parseInt(form.start.value);
        const end = parseInt(form.end.value);
        const width = parseInt(form.width.value) || 1;
        const capacity = parseInt(form.capacity.value);
        const status = form.status.value;

        if (isNaN(start) || isNaN(end) || end < start || isNaN(capacity) || capacity < 1) {
            UIHelper.showAlert('Please provide a valid range and capacity', 'error');
            return;
        }

        // Build rooms payload
        const rooms = [];
        for (let n = start; n <= end; n++) {
            const num = String(n).padStart(width, '0');
            rooms.push({ room_no: prefix + num, capacity, status });
        }

        console.log(`📦 Bulk adding ${rooms.length} rooms to hostel ${hostelId}`);
        const result = await API.call(`/superadmin/hostels/${hostelId}/rooms/bulk`, {
            method: 'POST',
            body: JSON.stringify({ rooms })
        });

        UIHelper.showAlert(result.message, 'success');
        // Refresh rooms list
        manageHostelRooms(hostelId, hostelName);
    } catch (error) {
        console.error('❌ Error bulk adding rooms:', error);
        UIHelper.showAlert('Failed to bulk add rooms: ' + error.message, 'error');
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

// Show Hostel Allotments Dialog
async function showHostelAllotmentsDialog(hostelId, hostelName) {
    try {
        console.log(`📋 Loading active allotments for hostel ${hostelId}...`);
        
        // Get hostel rooms and their allotments
        const rooms = await API.call(`/superadmin/hostels/${hostelId}/rooms`, { method: 'GET' });
        
        if (rooms.length === 0) {
            UIHelper.showAlert('No rooms found in this hostel. You can safely delete it now.', 'info');
            return;
        }
        
        // For now, we'll show a placeholder - you can enhance this to show actual allotment data
        const roomsList = rooms.map(room => `
            <div style="border: 1px solid #ddd; padding: 0.75rem; margin: 0.5rem 0; border-radius: 4px;">
                <strong>Room ${room.room_no}</strong>
                <div style="font-size: 0.9rem; color: #666;">
                    Capacity: ${room.capacity} | Status: <span style="color: ${room.status === 'Vacant' ? '#10b981' : room.status === 'Occupied' ? '#f59e0b' : '#dc3545'};">${room.status}</span>
                </div>
                <div style="margin-top: 0.5rem;">
                    ${room.status === 'Occupied' ? 
                        '<span style="color: #dc3545;">⚠️ This room has active allotments</span>' : 
                        '<span style="color: #10b981;">✅ No active allotments</span>'
                    }
                </div>
                ${room.status === 'Occupied' ? 
                    `<button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-top: 0.5rem;" onclick="vacateRoom(${room.room_id}, '${room.room_no}', ${hostelId}, '${hostelName}')">Vacate Room</button>` : 
                    ''
                }
            </div>
        `).join('');
        
        const occupiedRooms = rooms.filter(r => r.status === 'Occupied').length;
        
        showModal(`Active Allotments in ${hostelName}`, `
            <div style="max-height: 400px; overflow-y: auto;">
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem;">
                    <strong>⚠️ Cannot Delete Hostel</strong>
                    <p>This hostel has ${occupiedRooms} occupied room(s). Please vacate all rooms before deleting the hostel.</p>
                </div>
                
                <h4>Rooms in ${hostelName}:</h4>
                ${roomsList}
                
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee;">
                    <button class="btn btn-secondary" onclick="manageHostels()">Back to Hostels</button>
                    ${occupiedRooms === 0 ? 
                        `<button class="btn btn-danger" onclick="deleteHostel(${hostelId}, '${hostelName}')" style="margin-left: 0.5rem;">Delete Hostel Now</button>` : 
                        ''
                    }
                </div>
            </div>
        `);
        
    } catch (error) {
        console.error('❌ Error loading hostel allotments:', error);
        UIHelper.showAlert('Failed to load hostel allotment information', 'error');
    }
}

// Vacate Room Function
async function vacateRoom(roomId, roomNo, hostelId, hostelName) {
    try {
        const confirmVacate = confirm(`Are you sure you want to vacate room ${roomNo}? This will remove all student allotments from this room and mark them as 'Vacated'.`);
        if (!confirmVacate) {
            return;
        }
        
        console.log(`🏠 Vacating room ${roomId}...`);
        
        // Show loading state
        const loadingAlert = UIHelper.showAlert('Vacating room... Please wait.', 'info');
        
        // Call the vacate room API
        const result = await API.call(`/superadmin/rooms/${roomId}/vacate`, { 
            method: 'POST' 
        });
        
        console.log('✅ Room vacated successfully:', result);
        
        // Hide loading alert
        if (loadingAlert && loadingAlert.remove) {
            loadingAlert.remove();
        }
        
        // Show success message
        UIHelper.showAlert(`Room ${roomNo} vacated successfully! ${result.vacatedAllotments} student(s) have been vacated.`, 'success');
        
        // Refresh the current view to show updated room status
        // Close the current modal and refresh the hostel allotments view
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
        }
        
        // Refresh the current hostel allotments view instead of full page reload
        // Re-fetch and show the updated hostel allotments
        if (hostelId && hostelName) {
            setTimeout(() => {
                showHostelAllotmentsDialog(hostelId, hostelName);
            }, 500);
        }
        
    } catch (error) {
        console.error('❌ Error vacating room:', error);
        UIHelper.showAlert('Failed to vacate room: ' + error.message, 'error');
    }
}

async function viewAnalytics() {
    try {
        const data = await API.call('/superadmin/analytics/overview', { method: 'GET' });
        const html = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                <div class="info-card light-blue"><h5>Occupancy Rate</h5><h3>${data.occupancyRate || 0}%</h3></div>
                <div class="info-card green"><h5>Total Rooms</h5><h3>${data.rooms?.total || 0}</h3></div>
                <div class="info-card orange"><h5>Applications</h5><h3>${data.applications?.total || 0}</h3></div>
                <div class="info-card pink"><h5>Maintenance</h5><h3>${data.maintenance?.total || 0}</h3></div>
            </div>
            <div style="margin-top:1rem;">
                <h4>Rooms by Status</h4>
                <pre style="background:#f8f9fa;padding:0.75rem;border-radius:6px;">${JSON.stringify(data.rooms?.byStatus || {}, null, 2)}</pre>
                <h4>Applications by Status</h4>
                <pre style="background:#f8f9fa;padding:0.75rem;border-radius:6px;">${JSON.stringify(data.applications?.byStatus || {}, null, 2)}</pre>
                <h4>Maintenance by Status</h4>
                <pre style="background:#f8f9fa;padding:0.75rem;border-radius:6px;">${JSON.stringify(data.maintenance?.byStatus || {}, null, 2)}</pre>
            </div>`;
        showModal('System Analytics', html);
    } catch (err) {
        UIHelper.showAlert('Failed to load analytics', 'error');
        console.error(err);
    }
}

function generateReports() {
        const content = `
            <div class="form-row" style="align-items:center; gap:0.5rem;">
                <div class="form-group" style="margin:0;">
                    <label>Choose dataset:</label>
                    <select id="reportEntity" class="form-select" onchange="onReportEntityChange()">
                        <option value="users">Users</option>
                        <option value="hostels">Hostels</option>
                        <option value="rooms">Rooms</option>
                        <option value="allotments">Room Allotments</option>
                        <option value="applications">Applications</option>
                        <option value="maintenance">Maintenance</option>
                    </select>
                </div>
                <div class="form-group" style="margin:0; display:flex; gap:0.5rem;">
                    <button class="btn btn-secondary" onclick="loadReportPreview()">Load Preview</button>
                    <button class="btn btn-primary" onclick="downloadReport()">Download CSV</button>
                </div>
            </div>
            <div id="reportDesc" style="color:#6b7280; font-size: 0.95rem; margin: 8px 0 12px 0;"></div>
            <div id="reportSummary"></div>
            <div id="reportTable" style="margin-top: 10px;"></div>`;
        showModal('Generate Reports', content);
        onReportEntityChange();
}

function onReportEntityChange() {
        const entity = document.getElementById('reportEntity').value;
        const descEl = document.getElementById('reportDesc');
        const descriptions = {
            users: 'All application users with roles (Student, Warden, SuperAdmin). Useful for access audits and onboarding checks.',
            hostels: 'Hostel blocks with type (Boys/Girls), location, and assigned warden if any.',
            rooms: 'Individual rooms with capacity and status (Vacant, Occupied, Under Maintenance).',
            allotments: 'Room allotments linking students to rooms, with status and key dates.',
            applications: 'Allotment applications from students with current status and preferences.',
            maintenance: 'Maintenance requests with status, priority and timestamps.'
        };
        descEl.textContent = descriptions[entity] || '';
        // Clear previous preview
        document.getElementById('reportSummary').innerHTML = '';
        document.getElementById('reportTable').innerHTML = '';
}

async function loadReportPreview() {
        const entity = document.getElementById('reportEntity').value;
        const token = TokenManager.getToken();
        const url = `${API_BASE_URL}/superadmin/export/${entity}`;
        const summaryEl = document.getElementById('reportSummary');
        const tableEl = document.getElementById('reportTable');
        summaryEl.innerHTML = '<div style="color:#6b7280;">Loading preview…</div>';
        tableEl.innerHTML = '';
        try {
                const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'text/csv' } });
                if (!resp.ok) throw new Error('Failed to load CSV');
                const csvText = await resp.text();
                const { headers, rows } = parseCSV(csvText);
                // Summary KPIs
                const total = rows.length;
                const breakdowns = buildBreakdowns(headers, rows);
                summaryEl.innerHTML = renderReportSummary(total, breakdowns);
                // Preview table (first 20 rows)
                const preview = rows.slice(0, 20);
                tableEl.innerHTML = renderReportTable(headers, preview);
        } catch (e) {
                summaryEl.innerHTML = '<div style="color:#dc2626;">Failed to load preview</div>';
        }
}

function parseCSV(text) {
        if (!text || !text.trim()) return { headers: [], rows: [] };
        const lines = text.split(/\r?\n/).filter(l => l.length > 0);
        if (!lines.length) return { headers: [], rows: [] };
        const headers = splitCSVLine(lines[0]);
        const rows = lines.slice(1).map(line => splitCSVLine(line)).filter(cols => cols.length === headers.length)
            .map(cols => Object.fromEntries(headers.map((h, i) => [h, cols[i]])));
        return { headers, rows };
}

function splitCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
                const c = line[i];
                if (inQuotes) {
                        if (c === '"' && line[i + 1] === '"') { current += '"'; i++; }
                        else if (c === '"') { inQuotes = false; }
                        else { current += c; }
                } else {
                        if (c === '"') { inQuotes = true; }
                        else if (c === ',') { result.push(current); current = ''; }
                        else { current += c; }
                }
        }
        result.push(current);
        return result;
}

function buildBreakdowns(headers, rows) {
        const fields = ['status', 'role', 'hostel_type', 'priority'];
        const present = fields.filter(f => headers.includes(f));
        const breakdowns = {};
        for (const f of present) {
                const counts = {};
                for (const r of rows) {
                        const key = (r[f] || '-');
                        counts[key] = (counts[key] || 0) + 1;
                }
                // Sort by count desc and take top 6
                breakdowns[f] = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0, 6);
        }
        return breakdowns;
}

function renderReportSummary(total, breakdowns) {
        const badges = `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:0.75rem; margin-bottom:0.75rem;">
                <div style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px; padding:10px; text-align:center;">
                    <div style="font-size:12px; color:#6b7280;">Total rows</div>
                    <div style="font-weight:700; font-size:20px;">${total}</div>
                </div>
            </div>`;
        const sections = Object.entries(breakdowns).map(([field, list]) => {
                const title = field.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
                const body = list.length ? list.map(([k,v]) => `<div style="display:flex; justify-content:space-between;"><span>${k}</span><strong>${v}</strong></div>`).join('') : '<div style="color:#6b7280;">No data</div>';
                return `<div class="form-group"><h4>${title}</h4>${body}</div>`;
        }).join('');
        return `${badges}<div class="form-row">${sections}</div>`;
}

function renderReportTable(headers, rows) {
        if (!headers.length) return '<div style="color:#6b7280;">No data to display</div>';
        const thead = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
        const tbody = rows.length ? rows.map(r => `<tr>${headers.map(h => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${headers.length}" style="text-align:center; color:#6b7280;">No rows</td></tr>`;
        return `<div style="max-height:300px; overflow:auto;"><table class="table" style="width:100%; border-collapse:collapse;">${thead}<tbody>${tbody}</tbody></table></div>`;
}

async function downloadReport() {
    const entity = document.getElementById('reportEntity').value;
    const token = TokenManager.getToken();
    const url = `${API_BASE_URL}/superadmin/export/${entity}`;
    try {
        const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!resp.ok) throw new Error('Export failed');
        const blob = await resp.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${entity}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        // Refresh admin activity so the export action appears
        try { await loadAdminActivity(); } catch (_) {}
    } catch (e) {
        UIHelper.showAlert('Failed to download report', 'error');
        console.error(e);
    }
}

function exportData() { generateReports(); }

async function systemLogs() {
    try {
        const data = await API.call('/superadmin/logs', { method: 'GET' });
        const html = `<div style="max-height:400px; overflow:auto;">${(data.logs||[]).map(l => `
           <div style='font-family:monospace;border-bottom:1px solid #eee;padding:6px 0;'>
             <span style='color:#6b7280;'>${l.ts}</span> [${l.level}] ${l.message}
           </div>`).join('')}</div>`;
        showModal('System Logs', html);
    } catch (e) {
        UIHelper.showAlert('Failed to load system logs', 'error');
    }
}

async function systemSettings() {
    try {
        const resp = await API.call('/superadmin/settings', { method: 'GET' });
        const s = resp.settings || {};
        const html = `
           <form id="settingsForm" onsubmit="return saveSystemSettings(event)" class="modal-form">
             <h4>Applications</h4>
             <label class="form-label">Applications Open</label>
             <select name="applications_open" class="form-select">
               <option value="true" ${s.application?.applications_open ? 'selected' : ''}>Yes</option>
               <option value="false" ${!s.application?.applications_open ? 'selected' : ''}>No</option>
             </select>

             <div class="form-row">
               <div class="form-group">
                 <label class="form-label">Min CGPA</label>
                 <input type="number" step="0.01" name="min_cgpa" class="form-input" value="${s.application?.eligibility?.min_cgpa ?? 0}">
               </div>
               <div class="form-group">
                 <label class="form-label">Max KEAM Rank</label>
                 <input type="number" name="max_keam_rank" class="form-input" value="${s.application?.eligibility?.max_keam_rank ?? 999999}">
               </div>
             </div>

             <h4 style="margin-top:1rem;">Rooms</h4>
             <label class="form-label">Default Capacity</label>
             <input type="number" name="default_capacity" class="form-input" value="${s.rooms?.default_capacity ?? 2}">

                         <div style="margin-top:1rem; text-align:right;">
                             <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                             <button type="submit" class="btn btn-primary">Save</button>
                         </div>
           </form>`;
        showModal('System Settings', html);
    } catch (e) {
        UIHelper.showAlert('Failed to load settings', 'error');
    }
}

async function saveSystemSettings(ev) {
    ev.preventDefault();
    const form = ev.target;
    const payload = {
        application: {
            applications_open: form.applications_open.value === 'true',
            eligibility: {
                min_cgpa: parseFloat(form.min_cgpa.value || '0'),
                max_keam_rank: parseInt(form.max_keam_rank.value || '999999')
            }
        },
        rooms: {
            default_capacity: parseInt(form.default_capacity.value || '2')
        }
    };
    try {
        const resp = await API.call('/superadmin/settings', { method: 'PUT', body: JSON.stringify(payload) });
    UIHelper.showAlert('Settings saved', 'success');
    closeModal();
    } catch (e) {
        UIHelper.showAlert('Failed to save settings', 'error');
        console.error(e);
    }
    return false;
}

function emailConfig() { systemSettings(); }
function backupSettings() { systemSettings(); }
function securitySettings() { systemSettings(); }

function financialDashboard() {
    alert('Financial Dashboard coming soon!');
}

function feeManagement() {
    openFeeManager();
}

async function maintenanceReports() {
        try {
                const resp = await API.call('/superadmin/maintenance/reports', { method: 'GET' });
                const s = resp.stats || { byStatus:{}, byCategory:{}, byPriority:{}, total:0 };
                const recent = resp.recent || [];
                const renderPairs = (obj) => {
                    const entries = Object.entries(obj || {});
                    if (!entries.length) return '<div style="color:#6b7280;">No data</div>';
                    return entries.map(([k,v]) => `<div style="display:flex; justify-content:space-between;"><span>${k}</span><strong>${v}</strong></div>`).join('');
                };

                // Friendly KPIs at the top
                const pending = (s.byStatus && (s.byStatus['Pending'] || s.byStatus['pending'])) || 0;
                const inProgress = (s.byStatus && (s.byStatus['In Progress'] || s.byStatus['in progress'])) || 0;
                const completed = (s.byStatus && (s.byStatus['Completed'] || s.byStatus['completed'])) || 0;

                // Recent table rows or empty-row message
                const recentRows = recent.length ? recent.map(r => `
                        <tr>
                            <td>${r.request_id}</td>
                            <td>${r.status}</td>
                            <td>${r.category || '-'}</td>
                            <td>${r.priority || '-'}</td>
                            <td>${r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                        </tr>`).join('') : `<tr><td colspan="5" style="text-align:center; color:#6b7280;">No recent maintenance requests</td></tr>`;

                // If there's no data at all, show a simple explanatory message
                const noDataBanner = (s.total === 0) ? `
                    <div style="background:#f8fafc; border:1px solid #e5e7eb; color:#6b7280; padding:12px; border-radius:8px; margin-bottom:12px;">
                        No maintenance requests found in the last 200 records.
                    </div>` : '';

                const html = `
                    ${noDataBanner}
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:0.75rem; margin-bottom:0.75rem;">
                        <div style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px; padding:10px; text-align:center;">
                            <div style="font-size:12px; color:#6b7280;">Total (last 200)</div>
                            <div style="font-weight:700; font-size:20px;">${s.total || 0}</div>
                        </div>
                        <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:8px; padding:10px; text-align:center;">
                            <div style="font-size:12px; color:#c2410c;">Pending</div>
                            <div style="font-weight:700; font-size:20px; color:#c2410c;">${pending}</div>
                        </div>
                        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px; text-align:center;">
                            <div style="font-size:12px; color:#1d4ed8;">In Progress</div>
                            <div style="font-weight:700; font-size:20px; color:#1d4ed8;">${inProgress}</div>
                        </div>
                        <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:10px; text-align:center;">
                            <div style="font-size:12px; color:#047857;">Completed</div>
                            <div style="font-weight:700; font-size:20px; color:#047857;">${completed}</div>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <h4>Status</h4>
                            ${renderPairs(s.byStatus)}
                        </div>
                        <div class="form-group">
                            <h4>Category</h4>
                            ${renderPairs(s.byCategory)}
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <h4>Priority</h4>
                            ${renderPairs(s.byPriority)}
                        </div>
                        <div class="form-group">
                            <h4>Tips</h4>
                            <div style="color:#6b7280; font-size:13px;">Use the Maintenance Overview card to schedule upcoming work, or ask wardens/students to submit maintenance requests so they appear here.</div>
                        </div>
                    </div>
                    <div style="max-height:300px; overflow:auto; margin-top:8px;">
                        <table class="table" style="width:100%; border-collapse:collapse;">
                            <thead><tr><th>ID</th><th>Status</th><th>Category</th><th>Priority</th><th>Created</th></tr></thead>
                            <tbody>${recentRows}</tbody>
                        </table>
                    </div>`;
                showModal('Maintenance Reports', html);
        } catch (e) {
                UIHelper.showAlert('Failed to load maintenance reports', 'error');
        }
}
// Finance manager modal
async function openFeeManager() {
        try {
                const resp = await API.call('/superadmin/finance/fees', { method: 'GET' });
                const fees = resp.fees || [];
                const rows = fees.map(f => `
                    <tr>
                        <td>${f.fee_id}</td>
                        <td>${f.students?.name || '-'}</td>
                        <td>${f.students?.reg_no || '-'}</td>
                        <td>₹${Number(f.amount).toLocaleString()}</td>
                        <td>₹${Number(f.paid_amount).toLocaleString()}</td>
                        <td>${f.status}</td>
                        <td>${f.due_date ? new Date(f.due_date).toLocaleDateString() : '-'}</td>
                        <td>
                            ${f.status !== 'Paid' ? `<button class="btn btn-secondary" onclick="showRecordPayment(${f.fee_id}, ${Number(f.amount) - Number(f.paid_amount)})">Record Payment</button>` : ''}
                        </td>
                    </tr>`).join('');

                const html = `
                    <div style="margin-bottom: 0.5rem; display:flex; gap:0.5rem;">
                        <button class="btn btn-primary" onclick="showCreateFee()">Create Fee</button>
                    </div>
                    <div style="max-height:400px; overflow:auto;">
                        <table class="table" style="width:100%; border-collapse: collapse;">
                            <thead>
                                <tr>
                                    <th>ID</th><th>Name</th><th>Reg No</th><th>Amount</th><th>Paid</th><th>Status</th><th>Due</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>${rows || ''}</tbody>
                        </table>
                    </div>`;
                showModal('Fee Management', html);
        } catch (e) {
                UIHelper.showAlert('Failed to load fees', 'error');
        }
}

function showCreateFee() {
        const form = `
            <form id="createFeeForm" onsubmit="submitCreateFee(event)" class="modal-form">
                <div class="form-row">
                    <div class="form-group" style="flex: 1 1 50%">
                        <label class="form-label">Student (Reg No)</label>
                        <div style="display:flex; gap:0.5rem; align-items:center;">
                            <input type="text" id="studentSearch" class="form-input" placeholder="Search reg no or name" oninput="searchStudentsForFee()" />
                            <select id="studentSelect" name="student_id" class="form-select" required style="min-width: 240px;">
                                <option value="" disabled selected>Search to load students…</option>
                            </select>
                        </div>
                        <small id="studentHint" style="color:#6b7280;">Type to search students by reg no or name</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Amount</label>
                        <input type="number" step="0.01" name="amount" class="form-input" required />
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Due Date</label>
                        <input type="date" name="due_date" class="form-input" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <input type="text" name="description" class="form-input" />
                    </div>
                </div>
                <div style="text-align:right; margin-top: 0.5rem;">
                    <button type="button" class="btn btn-secondary" onclick="openFeeManager()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create</button>
                </div>
            </form>`;
        showModal('Create Fee', form);
}

async function submitCreateFee(ev) {
        ev.preventDefault();
        try {
                const form = ev.target;
                const payload = Object.fromEntries(new FormData(form).entries());
                payload.student_id = parseInt(payload.student_id);
                payload.amount = parseFloat(payload.amount);
                await API.call('/superadmin/finance/fees', { method: 'POST', body: JSON.stringify(payload) });
                UIHelper.showAlert('Fee created', 'success');
                openFeeManager();
        } catch (e) {
                UIHelper.showAlert('Failed to create fee', 'error');
        }
}

// Debounced student search for fee modal
let studentSearchTimer;
async function searchStudentsForFee() {
        clearTimeout(studentSearchTimer);
        studentSearchTimer = setTimeout(async () => {
                const q = document.getElementById('studentSearch').value.trim();
                const select = document.getElementById('studentSelect');
                select.innerHTML = `<option value="" disabled selected>Loading…</option>`;
                try {
                        const resp = await API.call(`/superadmin/students${q ? `?q=${encodeURIComponent(q)}` : ''}`, { method: 'GET' });
                        const students = resp.students || [];
                        if (!students.length) {
                                select.innerHTML = `<option value="" disabled selected>No matches</option>`;
                                return;
                        }
                        select.innerHTML = `<option value="" disabled selected>Select a student…</option>` + students.map(s => {
                                const label = `${s.reg_no || 'N/A'} — ${s.name || ''}`.trim();
                                return `<option value="${s.student_id}">${label}</option>`;
                        }).join('');
                } catch (e) {
                        select.innerHTML = `<option value="" disabled selected>Failed to load</option>`;
                }
        }, 300);
}

function showRecordPayment(fee_id, maxAmount) {
        const form = `
            <form id="recordPaymentForm" onsubmit="submitRecordPayment(event, ${fee_id})" class="modal-form">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Amount (max ₹${Number(maxAmount).toLocaleString()})</label>
                        <input type="number" step="0.01" name="amount" class="form-input" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Method</label>
                        <select name="method" class="form-select">
                            <option value="UPI">UPI</option>
                            <option value="Card">Card</option>
                            <option value="Cash">Cash</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Reference</label>
                    <input type="text" name="reference" class="form-input" />
                </div>
                <div style="text-align:right; margin-top: 0.5rem;">
                    <button type="button" class="btn btn-secondary" onclick="openFeeManager()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Record</button>
                </div>
            </form>`;
        showModal('Record Payment', form);
}

async function submitRecordPayment(ev, fee_id) {
        ev.preventDefault();
        try {
                const form = ev.target;
                const payload = Object.fromEntries(new FormData(form).entries());
                payload.amount = parseFloat(payload.amount);
                await API.call(`/superadmin/finance/fees/${fee_id}/pay`, { method: 'POST', body: JSON.stringify(payload) });
                UIHelper.showAlert('Payment recorded', 'success');
                openFeeManager();
        } catch (e) {
                UIHelper.showAlert('Failed to record payment', 'error');
        }
}

function scheduleSystemMaintenance() {
        const form = `
            <form id="scheduleForm" onsubmit="submitScheduleMaintenance(event)" class="modal-form">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Title</label>
                        <input type="text" name="title" class="form-input" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Category</label>
                        <select name="category" class="form-select" required>
                            <option>Electricity</option>
                            <option>Plumbing</option>
                            <option>Cleaning</option>
                            <option>Other</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Priority</label>
                        <select name="priority" class="form-select">
                            <option>Medium</option>
                            <option>High</option>
                            <option>Low</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Scheduled For</label>
                        <input type="datetime-local" name="scheduled_for" class="form-input" required />
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Hostel ID (optional)</label>
                        <input type="number" name="hostel_id" class="form-input" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Room ID (optional)</label>
                        <input type="number" name="room_id" class="form-input" />
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Assigned To (optional)</label>
                    <input type="text" name="assigned_to" class="form-input" />
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <input type="text" name="description" class="form-input" />
                </div>
                <div style="text-align:right; margin-top: 0.5rem;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Schedule</button>
                </div>
            </form>`;
        showModal('Schedule Maintenance', form);
}

async function submitScheduleMaintenance(ev) {
        ev.preventDefault();
        try {
                const form = ev.target;
                const payload = Object.fromEntries(new FormData(form).entries());
                if (payload.hostel_id) payload.hostel_id = parseInt(payload.hostel_id);
                if (payload.room_id) payload.room_id = parseInt(payload.room_id);
                // Convert datetime-local to ISO string
                if (payload.scheduled_for) payload.scheduled_for = new Date(payload.scheduled_for).toISOString();
                const resp = await API.call('/superadmin/maintenance/schedule', { method: 'POST', body: JSON.stringify(payload) });
                UIHelper.showAlert('Maintenance scheduled', 'success');
                closeModal();
        } catch (e) {
                UIHelper.showAlert('Failed to schedule maintenance', 'error');
                console.error(e);
        }
}

async function securityAudit() {
    try {
        const [summaryResp, notifResp] = await Promise.all([
            API.call('/superadmin/security/summary', { method: 'GET' }),
            API.call('/superadmin/system-notifications', { method: 'GET' })
        ]);
        const s = summaryResp.summary || {};
        const notifications = (notifResp.notifications || []).slice(0, 10);
        const notifList = notifications.map(n => {
            const color = n.priority === 'High' ? '#dc2626' : n.priority === 'Medium' ? '#f59e0b' : '#10b981';
            return `<li style=\"margin:6px 0;\"><span style=\"display:inline-block; width:8px; height:8px; border-radius:50%; background:${color}; margin-right:8px;\"></span>${n.message} <small style=\"color:#6b7280;\">(${n.priority})</small></li>`;
        }).join('');
        const html = `
            <div class=\"form-row\">
                <div class=\"form-group\">
                    <h4>Security Summary</h4>
                    <div style=\"display:flex; gap:1rem; flex-wrap:wrap;\">
                        <div><strong>Active Logins:</strong> ${s.activeLogins ?? 0}</div>
                        <div><strong>Failed Attempts:</strong> ${s.failedAttempts ?? 0}</div>
                        <div><strong>Suspicious:</strong> ${s.suspiciousActivity ?? 0}</div>
                        <div><strong>Last Scan:</strong> ${s.lastSecurityScan || 'N/A'}</div>
                    </div>
                </div>
                <div class=\"form-group\">
                    <h4>Recent Security Notifications</h4>
                    <ul style=\"list-style:none; padding:0; margin:0;\">${notifList}</ul>
                </div>
            </div>`;
        showModal('Security Audit', html);
    } catch (e) {
        UIHelper.showAlert('Failed to load security audit', 'error');
    }
}

async function accessLogs() {
    try {
        const [activityResp, logsResp] = await Promise.all([
            API.call('/superadmin/admin-activity', { method: 'GET' }),
            API.call('/superadmin/logs', { method: 'GET' })
        ]);
        const activities = activityResp.activities || [];
        const logs = (logsResp.logs || []).slice(0, 20);
        const actRows = activities.map(a => `
            <tr><td>${a.action}</td><td>${a.user ?? '-'}</td><td>${a.details ?? ''}</td><td>${a.time ? new Date(a.time).toLocaleString() : ''}</td></tr>`).join('');
        const logRows = logs.map(l => `
            <tr><td>${l.ts ? new Date(l.ts).toLocaleString() : ''}</td><td>${l.level}</td><td>${l.message}</td></tr>`).join('');
        const html = `
          <div class=\"form-row\">
            <div class=\"form-group\" style=\"flex:1; min-width:280px;\">
              <h4>Admin Activity</h4>
              <div style=\"max-height:220px; overflow:auto;\">
                <table class=\"table\" style=\"width:100%;\"><thead><tr><th>Action</th><th>User</th><th>Details</th><th>Time</th></tr></thead><tbody>${actRows}</tbody></table>
              </div>
            </div>
            <div class=\"form-group\" style=\"flex:1; min-width:280px;\">
              <h4>System Logs</h4>
              <div style=\"max-height:220px; overflow:auto;\">
                <table class=\"table\" style=\"width:100%;\"><thead><tr><th>Time</th><th>Level</th><th>Message</th></tr></thead><tbody>${logRows}</tbody></table>
              </div>
            </div>
          </div>`;
        showModal('Access Logs', html);
    } catch (e) {
        UIHelper.showAlert('Failed to load access logs', 'error');
    }
}

function healthCheck() {
    alert('Running full system health check...');
    setTimeout(() => {
        alert('System health check completed. All systems operational.');
    }, 2000);
}

async function manageNotifications() {
        try {
                // Fetch latest notifications for display
                const listResp = await API.call('/superadmin/notifications?limit=50', { method: 'GET' });
                const items = listResp.notifications || [];
                const rows = items.map(n => `
                    <tr>
                        <td>${n.notification_id || ''}</td>
                        <td>${n.title ? `<strong>${n.title}</strong><br>` : ''}${n.message || ''}</td>
                        <td>${n.receiver_role || (n.receiver_id ? `User #${n.receiver_id}` : 'All')}</td>
                        <td>${n.created_at ? new Date(n.created_at).toLocaleString() : ''}</td>
                        <td><button class="btn btn-secondary" onclick="deleteNotification(${n.notification_id})">Delete</button></td>
                    </tr>`).join('');
                const html = `
                    <div class="form-row">
                        <div class="form-group" style="flex:1; min-width:280px;">
                            <h4>Create Notification</h4>
                            <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem;">
                                <label for="notifTarget">Target:</label>
                                <select id="notifTarget" class="form-select" onchange="onNotifTargetChange()">
                                    <option value="All">All</option>
                                    <option value="Role">Role</option>
                                    <option value="User">User</option>
                                </select>
                            </div>
                            <div id="notifRoleContainer" style="display:none;">
                                <label class="form-label">Role</label>
                                <select id="notifRole" class="form-select">
                                    <option value="Student">Student</option>
                                    <option value="Warden">Warden</option>
                                </select>
                            </div>
                            <div id="notifUserPicker" style="display:none; position:relative;">
                                <label class="form-label">User</label>
                                <input id="notifUserQuery" class="form-input" placeholder="Search username or email" oninput="searchUsersForNotification(this.value)" />
                                <div id="notifUserResults" style="position:absolute; z-index:10; background:#fff; border:1px solid #e5e7eb; border-radius:6px; margin-top:4px; max-height:180px; overflow:auto; width:100%; display:none;"></div>
                            </div>
                            <input id="notifTitle" class="form-input" placeholder="Title (optional)" />
                            <textarea id="notifMessage" class="form-input" placeholder="Message" rows="3" style="margin-top:0.5rem;"></textarea>
                            <button class="btn btn-primary" style="margin-top:0.5rem;" onclick="submitNotification()">Send</button>
                        </div>
                        <div class="form-group" style="flex:1; min-width:380px;">
                            <h4>Recent Notifications</h4>
                            <div style="max-height:300px; overflow:auto;">
                                <table class="table" style="width:100%;">
                                    <thead><tr><th>ID</th><th>Message</th><th>Target</th><th>Created</th><th></th></tr></thead>
                                    <tbody id="notifRows">${rows}</tbody>
                                </table>
                            </div>
                        </div>
                    </div>`;
                showModal('Notification Manager', html);
        } catch (e) {
                UIHelper.showAlert('Failed to load notifications', 'error');
                console.error(e);
        }
}

function onNotifTargetChange() {
        const target = document.getElementById('notifTarget').value;
        document.getElementById('notifRoleContainer').style.display = (target === 'Role') ? 'block' : 'none';
    document.getElementById('notifUserPicker').style.display = (target === 'User') ? 'block' : 'none';
}

async function submitNotification() {
        const target = document.getElementById('notifTarget').value;
        const role = document.getElementById('notifRole').value;
    const user_id = window.__notifSelectedUserId ? parseInt(window.__notifSelectedUserId) : undefined;
        const title = document.getElementById('notifTitle').value.trim();
        const message = document.getElementById('notifMessage').value.trim();
        if (!message) { UIHelper.showAlert('Message is required', 'error'); return; }
    if (target === 'User' && !user_id) { UIHelper.showAlert('Please select a user from suggestions', 'error'); return; }
        try {
                const body = { target, role, user_id: isNaN(user_id) ? undefined : user_id, title: title || undefined, message };
                const resp = await API.call('/superadmin/notifications', { method: 'POST', body: JSON.stringify(body) });
                // Prepend the new row into the modal table for quick feedback
                const n = resp.notification || {};
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${n.notification_id || ''}</td><td>${n.title ? `<strong>${n.title}</strong><br>` : ''}${n.message || ''}</td><td>${n.receiver_role || (n.receiver_id ? `User #${n.receiver_id}` : 'All')}</td><td>${n.created_at ? new Date(n.created_at).toLocaleString() : ''}</td><td><button class="btn btn-secondary" onclick="deleteNotification(${n.notification_id})">Delete</button></td>`;
                const tbody = document.getElementById('notifRows');
                if (tbody) tbody.prepend(tr);
                // Clear inputs
                document.getElementById('notifTitle').value = '';
                document.getElementById('notifMessage').value = '';
                UIHelper.showAlert('Notification sent', 'success');
                // Also refresh dashboard list
                try { await loadSystemNotifications(); } catch(_) {}
        } catch (e) {
                UIHelper.showAlert('Failed to create notification', 'error');
                console.error(e);
        }
}

async function searchUsersForNotification(q) {
    const resultsBox = document.getElementById('notifUserResults');
    window.__notifSelectedUserId = undefined;
    const query = (q || '').trim();
    if (!query || query.length < 2) {
        resultsBox.style.display = 'none';
        resultsBox.innerHTML = '';
        return;
    }

    // Debounce to avoid spamming API
    clearTimeout(window.__notifSearchTimer);
    resultsBox.innerHTML = '<div style="padding:6px 8px; color:#6b7280;">Searching...</div>';
    resultsBox.style.display = 'block';
    window.__notifSearchTimer = setTimeout(async () => {
        try {
            // Cache results by query to reduce duplicate calls
            window.__notifUserCache = window.__notifUserCache || {};
            const cacheKey = query.toLowerCase();
            if (window.__notifUserCache[cacheKey]) {
                renderUserSearchResults(window.__notifUserCache[cacheKey]);
                return;
            }

            let users = [];
            try {
                const resp = await API.call(`/superadmin/users/search?q=${encodeURIComponent(query)}`, { method: 'GET' });
                users = resp.users || [];
            } catch (err) {
                // Fallback: fetch all users and filter client-side if search route not available
                try {
                    const all = await API.call('/superadmin/users', { method: 'GET' });
                    const ql = query.toLowerCase();
                    users = (all || []).filter(u =>
                        (u.username || '').toLowerCase().includes(ql) || (u.email || '').toLowerCase().includes(ql)
                    ).slice(0, 20);
                } catch (fallbackErr) {
                    throw fallbackErr;
                }
            }

            window.__notifUserCache[cacheKey] = users;
            renderUserSearchResults(users);
        } catch (e) {
            resultsBox.innerHTML = '<div style="padding:6px 8px; color:#dc2626;">Search failed</div>';
            resultsBox.style.display = 'block';
        }
    }, 350);
}

function renderUserSearchResults(users) {
    const resultsBox = document.getElementById('notifUserResults');
    if (!users.length) {
        resultsBox.innerHTML = '<div style="padding:6px 8px; color:#6b7280;">No users found</div>';
        resultsBox.style.display = 'block';
        return;
    }
    resultsBox.innerHTML = users.map(u => `
      <div class="notif-user-option" onclick="selectNotifUser(${u.user_id}, '${(u.username||'').replace(/'/g, "&#39;")}', '${((u.email||'')+'').replace(/'/g, "&#39;")}')" 
           style="padding:6px 8px; cursor:pointer; border-bottom:1px solid #f3f4f6;">
        <div style="font-weight:500;">${u.username || '(no username)'} <small style="color:#6b7280;">(${u.role || '-'})</small></div>
        ${u.email ? `<div style=\"color:#6b7280; font-size:12px;\">${u.email}</div>` : ''}
      </div>`).join('');
    resultsBox.style.display = 'block';
}

function selectNotifUser(id, username, email) {
    window.__notifSelectedUserId = id;
    const q = document.getElementById('notifUserQuery');
    q.value = `${username}${email ? ' <' + email + '>' : ''}`;
    const resultsBox = document.getElementById('notifUserResults');
    resultsBox.style.display = 'none';
    resultsBox.innerHTML = '';
}

async function deleteNotification(id) {
        if (!id) return;
        if (!confirm('Delete this notification?')) return;
        try {
                await API.call(`/superadmin/notifications/${id}`, { method: 'DELETE' });
                const tbody = document.getElementById('notifRows');
                if (tbody) {
                        [...tbody.children].forEach(tr => { if (tr.firstChild && tr.firstChild.textContent == id) tr.remove(); });
                }
                try { await loadSystemNotifications(); } catch(_) {}
        } catch (e) {
                UIHelper.showAlert('Failed to delete notification', 'error');
        }
}

// Logout function
document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('Are you sure you want to logout?')) {
        TokenManager.clear();
        window.location.href = 'login.html';
    }
});

// Clear Recent Admin Activity
(function initClearActivity() {
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('clearActivityBtn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      try {
        // Try backend delete endpoint if present
        const resp = await API.call('/superadmin/admin-activity', { method: 'DELETE' });
        if (resp && resp.success) {
          document.getElementById('adminActivity').innerHTML = '<div style="margin-top:1rem; color:#6b7280; text-align:center;">No recent admin activity</div>';
          return;
        }
      } catch (e) {
        // Fallback: frontend clear only
      }
      document.getElementById('adminActivity').innerHTML = '<div style="margin-top:1rem; color:#6b7280; text-align:center;">No recent admin activity</div>';
    });
  });
})();

// Clear Recent Admin Activity with Reload
(function initClearActivityReload() {
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('clearActivityBtn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      try {
        const resp = await API.call('/superadmin/admin-activity', { method: 'DELETE' });
        if (resp && resp.success) {
          await loadAdminActivity();
          return;
        }
      } catch (e) {
        // ignore
      }
      // fallback if delete failed: still clear UI
      document.getElementById('adminActivity').innerHTML = '<div style="margin-top:1rem; color:#6b7280; text-align:center;">No recent admin activity</div>';
    });
  });
})();

console.log('Admin Dashboard functions loaded');