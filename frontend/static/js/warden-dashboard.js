// Warden Dashboard JavaScript

// Initialize the warden dashboard
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    WardenDashboard.init();
});

function checkAuthentication() {
    const token = TokenManager.getToken();
    const user = TokenManager.getUser();
    
    if (!token || !user) {
        console.warn('No authentication found');
    window.location.href = '/login';
        return false;
    }
    
    // Check if user is a warden
    if (user.role !== 'Warden') {
        console.warn('Access denied. This page is for wardens only.');
        window.location.href = getCorrectDashboard(user.role);
        return false;
    }
    
    return true;
}

// Helper function to get correct dashboard URL
function getCorrectDashboard(role) {
    switch (role) {
        case 'Student':
            return '/student';
        case 'Warden':
            return '/warden';
        case 'SuperAdmin':
        case 'Admin':
            return '/admin';
        default:
            return '/';
    }
}

const WardenDashboard = {
    init() {
        this.loadUserInfo();
        this.loadStats();
        this.loadRoomSummary();
        this.loadMaintenanceQueue();
        this.loadStudentSummary();
        this.loadRecentActivity();
        this.loadPendingApprovals();
        this.loadRecentAnnouncements();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    Auth.logout();
                }
            });
        }
    },

    loadUserInfo() {
        const user = TokenManager.getUser();
        const userInfo = document.getElementById('userInfo');
        
        if (userInfo && user) {
            userInfo.innerHTML = `
                <h3>Welcome back, Warden ${user.username}! 👨‍💼</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
                    <div>
                        <p><strong>Username:</strong> ${user.username}</p>
                        <p><strong>Email:</strong> ${user.email || 'Not provided'}</p>
                    </div>
                    <div>
                        <p><strong>Phone:</strong> ${user.phone || 'Not provided'}</p>
                        <p><strong>Role:</strong> ${user.role}</p>
                    </div>
                </div>
            `;
        }
    },

    async loadStats() {
        try {
            console.log('📊 Loading warden dashboard stats...');
            
            const response = await API.call('/warden/stats', { method: 'GET' });
            console.log('✅ Stats loaded:', response);

            document.getElementById('totalStudents').textContent = response.totalStudents || 0;
            document.getElementById('availableRooms').textContent = response.availableRooms || 0;
            document.getElementById('pendingRequests').textContent = response.pendingRequests || 0;
            document.getElementById('todayTasks').textContent = response.todayTasks || 0;

        } catch (error) {
            console.error('❌ Error loading stats:', error);
            // Fallback to showing zeros
            document.getElementById('totalStudents').textContent = '0';
            document.getElementById('availableRooms').textContent = '0';
            document.getElementById('pendingRequests').textContent = '0';
            document.getElementById('todayTasks').textContent = '0';
        }
    },

    async loadRoomSummary() {
        try {
            console.log('🏠 Loading room summary...');
            
            const response = await API.call('/warden/room-summary', { method: 'GET' });
            console.log('✅ Room summary loaded:', response);

            const roomSummaryDiv = document.getElementById('roomSummary');
            if (roomSummaryDiv && response.overall) {
                const { overall } = response;
                roomSummaryDiv.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 1rem 0;">
                        <div style="text-align: center; padding: 1rem; background: #e8f5e8; border-radius: 8px;">
                            <h4 style="margin: 0; color: #27ae60;">${overall.occupiedRooms || 0}</h4>
                            <p style="margin: 0; font-size: 0.9rem;">Occupied</p>
                        </div>
                        <div style="text-align: center; padding: 1rem; background: #e3f2fd; border-radius: 8px;">
                            <h4 style="margin: 0; color: #3498db;">${overall.vacantRooms || 0}</h4>
                            <p style="margin: 0; font-size: 0.9rem;">Available</p>
                        </div>
                    </div>
                    <p style="font-size: 0.9rem; color: #666;">
                        ${overall.maintenanceRooms || 0} rooms under maintenance | ${overall.occupancyRate || 0}% occupancy
                    </p>
                `;
            }

        } catch (error) {
            console.error('❌ Error loading room summary:', error);
            const roomSummaryDiv = document.getElementById('roomSummary');
            if (roomSummaryDiv) {
                roomSummaryDiv.innerHTML = '<p style="color: #e74c3c;">Failed to load room data</p>';
            }
        }
    },

    async loadMaintenanceQueue() {
        try {
            console.log('🔧 Loading maintenance queue...');
            
            const requests = await API.call('/warden/maintenance-queue', { method: 'GET' });
            console.log('✅ Maintenance queue loaded:', requests);

            const maintenanceQueueDiv = document.getElementById('maintenanceQueue');
            if (maintenanceQueueDiv) {
                if (requests && requests.length > 0) {
                    const requestsHTML = requests.slice(0, 5).map(req => `
                        <div style="padding: 0.75rem; border-left: 3px solid ${req.priority === 'High' ? '#e74c3c' : req.priority === 'Medium' ? '#f39c12' : '#27ae60'}; margin: 0.5rem 0; background: #f8f9fa; border-radius: 4px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="flex: 1;">
                                    <strong>${req.description || req.category}</strong>
                                    <div style="font-size: 0.9rem; color: #666;">
                                        ${req.studentName} - Room ${req.roomNumber} | ${req.priority} Priority
                                        ${req.daysSinceCreated > 0 ? ` | ${req.daysSinceCreated} days ago` : ' | Today'}
                                    </div>
                                </div>
                                <button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="approveRequest(${req.requestId})">
                                    Approve
                                </button>
                            </div>
                        </div>
                    `).join('');
                    
                    maintenanceQueueDiv.innerHTML = requestsHTML + 
                        (requests.length > 5 ? `<p style="text-align: center; margin: 1rem 0;"><button class="btn btn-secondary" onclick="reviewRequests()">View All ${requests.length} Requests</button></p>` : '');
                } else {
                    maintenanceQueueDiv.innerHTML = '<p style="color: #666; font-style: italic;">No pending requests</p>';
                }
            }

        } catch (error) {
            console.error('❌ Error loading maintenance queue:', error);
            const maintenanceQueueDiv = document.getElementById('maintenanceQueue');
            if (maintenanceQueueDiv) {
                maintenanceQueueDiv.innerHTML = '<p style="color: #e74c3c;">Failed to load maintenance requests</p>';
            }
        }
    },

    async loadStudentSummary() {
        try {
            console.log('👥 Loading student summary...');
            
            // For now, get student count from stats and show basic info
            const stats = await API.call('/warden/stats', { method: 'GET' });
            console.log('✅ Student stats loaded:', stats);

            const studentSummaryDiv = document.getElementById('studentSummary');
            if (studentSummaryDiv) {
                studentSummaryDiv.innerHTML = `
                    <div style="margin: 1rem 0;">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.9rem;">
                            <p>👥 <strong>${stats.totalStudents || 0}</strong> total students</p>
                            <p>� <strong>${stats.occupiedRooms || 0}</strong> students with rooms</p>
                        </div>
                        <p style="margin-top: 0.5rem; font-size: 0.9rem; color: ${stats.pendingRequests > 0 ? '#e74c3c' : '#27ae60'};">
                            📋 <strong>${stats.pendingRequests || 0}</strong> pending maintenance requests
                        </p>
                    </div>
                `;
            }

        } catch (error) {
            console.error('❌ Error loading student summary:', error);
            const studentSummaryDiv = document.getElementById('studentSummary');
            if (studentSummaryDiv) {
                studentSummaryDiv.innerHTML = '<p style="color: #e74c3c;">Failed to load student data</p>';
            }
        }
    },

    async loadRecentActivity() {
        try {
            console.log('📋 Loading recent activity...');
            
            const activityDiv = document.getElementById('recentActivity');
            if (activityDiv) {
                // For now, show a summary of current status
                const stats = await API.call('/warden/stats', { method: 'GET' });
                
                const activities = [
                    `${stats.totalStudents || 0} students currently in system`,
                    `${stats.occupiedRooms || 0} rooms currently occupied`,
                    `${stats.availableRooms || 0} rooms available for allocation`,
                    `${stats.pendingRequests || 0} maintenance requests pending review`,
                    `${stats.pendingApplications || 0} allotment applications pending approval`
                ];
                
                const activityHTML = activities.map(activity => `
                    <div style="padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                        <span style="color: #666; font-size: 0.9rem;">• ${activity}</span>
                    </div>
                `).join('');
                
                activityDiv.innerHTML = activityHTML;
            }

        } catch (error) {
            console.error('❌ Error loading recent activity:', error);
            const activityDiv = document.getElementById('recentActivity');
            if (activityDiv) {
                activityDiv.innerHTML = '<p style="color: #e74c3c;">Failed to load activity data</p>';
            }
        }
    },

    async loadPendingApprovals() {
        try {
            console.log('📋 Loading pending approvals...');
            
            const applications = await API.call('/warden/pending-applications', { method: 'GET' });
            console.log('✅ Pending applications loaded:', applications);

            const approvalsDiv = document.getElementById('pendingApprovals');
            if (approvalsDiv) {
                if (applications && applications.length > 0) {
                    const approvalsHTML = applications.slice(0, 5).map((app, index) => `
                        <div style="padding: 0.75rem; border: 1px solid #e3f2fd; margin: 0.5rem 0; background: #f8f9fa; border-radius: 4px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="flex: 1;">
                                    <strong>Allotment Application</strong>
                                    <div style="font-size: 0.9rem; color: #666;">
                                        ${app.course} - Year ${app.academicYear} | ${app.roomTypePreference} room
                                        ${app.daysSinceApplied > 0 ? ` | Applied ${app.daysSinceApplied} days ago` : ' | Applied today'}
                                    </div>
                                </div>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="approveApplication('${app.applicationId}')">
                                        Approve
                                    </button>
                                    <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="rejectApplication('${app.applicationId}')">
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('');
                    
                    approvalsDiv.innerHTML = approvalsHTML + 
                        (applications.length > 5 ? `<p style="text-align: center; margin: 1rem 0;"><button class="btn btn-secondary" onclick="reviewApprovals()">View All ${applications.length} Applications</button></p>` : '');
                } else {
                    approvalsDiv.innerHTML = '<p style="color: #666; font-style: italic;">No pending applications</p>';
                }
            }

        } catch (error) {
            console.error('❌ Error loading pending approvals:', error);
            const approvalsDiv = document.getElementById('pendingApprovals');
            if (approvalsDiv) {
                approvalsDiv.innerHTML = '<p style="color: #e74c3c;">Failed to load pending applications</p>';
            }
        }
    },

    async loadRecentAnnouncements() {
        try {
            // TODO: Implement announcements API endpoint
            // For now, show placeholder message
            console.log('📢 Loading announcements (placeholder)...');
            
            const announcementsDiv = document.getElementById('recentAnnouncements');
            if (announcementsDiv) {
                announcementsDiv.innerHTML = `
                    <div style="padding: 1rem; text-align: center; color: #666; font-style: italic; background: #f8f9fa; border-radius: 4px;">
                        <i class="fas fa-bullhorn" style="margin-bottom: 0.5rem; display: block; font-size: 1.5rem; color: #ccc;"></i>
                        Announcements system coming soon!
                        <div style="font-size: 0.8rem; margin-top: 0.25rem;">
                            This will show hostel announcements and notices.
                        </div>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error loading recent announcements:', error);
            const announcementsDiv = document.getElementById('recentAnnouncements');
            if (announcementsDiv) {
                announcementsDiv.innerHTML = '<p style="color: #dc3545; font-style: italic;">Error loading announcements</p>';
            }
        }
    }
};

// Dashboard Action Functions
function manageRooms() {
    UIHelper.showAlert('Room management interface coming soon!', 'info');
}

function allocateRoom() {
    UIHelper.showAlert('Room allocation form coming soon!', 'info');
}

function reviewRequests() {
    UIHelper.showAlert('Maintenance request review interface coming soon!', 'info');
}

function viewMaintenanceHistory() {
    UIHelper.showAlert('Maintenance history view coming soon!', 'info');
}

function viewAllStudents() {
    UIHelper.showAlert('Student management interface coming soon!', 'info');
}

function addStudent() {
    UIHelper.showAlert('Add student form coming soon!', 'info');
}

function createAnnouncement() {
    UIHelper.showAlert('Announcement creation form coming soon!', 'info');
}

function viewAllAnnouncements() {
    UIHelper.showAlert('All announcements view coming soon!', 'info');
}

function occupancyReport() {
    UIHelper.showAlert('Occupancy report generation coming soon!', 'info');
}

function maintenanceReport() {
    UIHelper.showAlert('Maintenance report generation coming soon!', 'info');
}

function studentReport() {
    UIHelper.showAlert('Student report generation coming soon!', 'info');
}

function financialReport() {
    UIHelper.showAlert('Financial report generation coming soon!', 'info');
}

function emergencyAlert() {
    UIHelper.showAlert('Emergency alert system coming soon!', 'info');
}

function bulkNotification() {
    UIHelper.showAlert('Bulk notification system coming soon!', 'info');
}

function roomInspection() {
    UIHelper.showAlert('Room inspection scheduler coming soon!', 'info');
}

function updateRules() {
    UIHelper.showAlert('Rules update interface coming soon!', 'info');
}

function reviewApprovals() {
    UIHelper.showAlert('Approval review interface coming soon!', 'info');
}

async function approveRequest(requestId) {
    try {
        console.log(`🔧 Approving maintenance request ${requestId}...`);
        
        const response = await API.call(`/warden/approve-maintenance/${requestId}`, {
            method: 'POST'
        });
        
        if (response.success) {
            UIHelper.showAlert('Maintenance request approved successfully!', 'success');
            // Refresh the maintenance queue and stats
            await WardenDashboard.loadMaintenanceQueue();
            await WardenDashboard.loadStats();
        } else {
            UIHelper.showAlert('Failed to approve maintenance request', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error approving maintenance request:', error);
        UIHelper.showAlert('Error approving maintenance request', 'error');
    }
}

async function approveApplication(applicationId) {
    try {
        console.log(`📋 Approving application ${applicationId}...`);
        
        const response = await API.call(`/warden/approve-application/${applicationId}`, {
            method: 'POST'
        });
        
        if (response.success) {
            UIHelper.showAlert('Application approved successfully!', 'success');
            // Refresh the pending approvals and stats
            await WardenDashboard.loadPendingApprovals();
            await WardenDashboard.loadStats();
        } else {
            UIHelper.showAlert('Failed to approve application', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error approving application:', error);
        UIHelper.showAlert('Error approving application', 'error');
    }
}

async function rejectApplication(applicationId) {
    try {
        const reason = prompt('Please provide a reason for rejection (optional):') || '';
        
        console.log(`📋 Rejecting application ${applicationId}...`);
        
        const response = await API.call(`/warden/reject-application/${applicationId}`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
        
        if (response.success) {
            UIHelper.showAlert('Application rejected successfully!', 'info');
            // Refresh the pending approvals and stats
            await WardenDashboard.loadPendingApprovals();
            await WardenDashboard.loadStats();
        } else {
            UIHelper.showAlert('Failed to reject application', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error rejecting application:', error);
        UIHelper.showAlert('Error rejecting application', 'error');
    }
}

function approveItem(itemIndex) {
    UIHelper.showAlert(`Approval item ${itemIndex + 1} approved!`, 'success');
}

function rejectItem(itemIndex) {
    UIHelper.showAlert(`Approval item ${itemIndex + 1} rejected!`, 'info');
}