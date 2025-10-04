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
    window.location.href = resolveRoute('/login');
        return false;
    }
    
    // Check if user is a warden
    if (user.role !== 'Warden') {
        console.warn('Access denied. This page is for wardens only.');
        window.location.href = resolveRoute(getCorrectDashboard(user.role));
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

        const notificationsBtn = document.getElementById('openNotificationsBtn');
        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', openNotificationsModal);
        }
    },

    loadUserInfo() {
        const user = TokenManager.getUser();
        const userInfo = document.getElementById('userInfo');
        
        if (userInfo && user) {
            userInfo.innerHTML = `
                <h3>Welcome back, Warden ${user.username}!</h3>
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
            console.log('Loading warden dashboard stats...');
            
            const response = await API.call('/warden/stats', { method: 'GET' });
            console.log('Stats loaded:', response);

            document.getElementById('totalStudents').textContent = response.totalStudents || 0;
            document.getElementById('availableRooms').textContent = response.availableRooms || 0;
            document.getElementById('pendingRequests').textContent = response.pendingRequests || 0;
            document.getElementById('todayTasks').textContent = response.todayTasks || 0;

        } catch (error) {
            console.error('Error loading stats:', error);
            // Fallback to showing zeros
            document.getElementById('totalStudents').textContent = '0';
            document.getElementById('availableRooms').textContent = '0';
            document.getElementById('pendingRequests').textContent = '0';
            document.getElementById('todayTasks').textContent = '0';
        }
    },

    async loadRoomSummary() {
        try {
            console.log('Loading room summary...');
            
            const response = await API.call('/warden/room-summary', { method: 'GET' });
            console.log('Room summary loaded:', response);

            // Update display counters
            if (response.overall) {
                const availableRoomsEl = document.getElementById('availableRoomsDisplay');
                if (availableRoomsEl) {
                    availableRoomsEl.textContent = response.overall.vacantRooms || 0;
                }

                const occupancyPercentEl = document.getElementById('occupancyPercentDisplay');
                if (occupancyPercentEl) {
                    const occupancyPercent = response.overall.occupancyPercent || 0;
                    occupancyPercentEl.textContent = `${occupancyPercent}%`;
                }
            }

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
            console.error('Error loading room summary:', error);
            const roomSummaryDiv = document.getElementById('roomSummary');
            if (roomSummaryDiv) {
                roomSummaryDiv.innerHTML = '<p style="color: #e74c3c;">Failed to load room data</p>';
            }
        }
    },

    async loadMaintenanceQueue() {
        try {
            console.log('Loading maintenance queue...');
            
            const requests = await API.call('/warden/maintenance-queue', { method: 'GET' });
            console.log('Maintenance queue loaded:', requests);

            // Update display counters
            const pendingCount = requests ? requests.length : 0;
            const pendingCountEl = document.getElementById('pendingRequestsCount');
            if (pendingCountEl) {
                pendingCountEl.textContent = pendingCount;
            }

            // Get total requests this month from backend
            const totalCountEl = document.getElementById('totalRequestsCount');
            if (totalCountEl) {
                try {
                    const monthly = await API.call('/warden/maintenance-monthly', { method: 'GET' });
                    const total = monthly?.data?.totalThisMonth ?? 0;
                    totalCountEl.textContent = total;
                } catch (e) {
                    console.warn('Failed to load monthly maintenance total, falling back to pending count', e);
                    totalCountEl.textContent = pendingCount || 0;
                }
            }

            const maintenanceQueueDiv = document.getElementById('maintenanceQueue');
            if (maintenanceQueueDiv) {
                if (requests && requests.length > 0) {
                    const requestsHTML = requests.slice(0, 5).map(req => `
                        <div style="padding: 0.75rem; border-left: 3px solid ${req.priority === 'High' ? '#e74c3c' : req.priority === 'Medium' ? '#f39c12' : '#27ae60'}; margin: 0.5rem 0; background: #f8f9fa; border-radius: 4px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="flex: 1;">
                                    <strong>${req.description || req.category}</strong>
                                        <span style="color:#666;">${req.studentName} - Room ${req.roomNumber} | ${req.priority} Priority${req.status ? ' | ' + req.status : ''}${req.daysSinceCreated > 0 ? ` | ${req.daysSinceCreated} days ago` : ' | Today'}</span>
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
            console.error('Error loading maintenance queue:', error);
            const maintenanceQueueDiv = document.getElementById('maintenanceQueue');
            if (maintenanceQueueDiv) {
                maintenanceQueueDiv.innerHTML = '<p style="color: #e74c3c;">Failed to load maintenance requests</p>';
            }
        }
    },

    async loadStudentSummary() {
        try {
            console.log('Loading student summary...');
            
            // For now, get student count from stats and show basic info
            const stats = await API.call('/warden/stats', { method: 'GET' });
            console.log('Student stats loaded:', stats);

            // Update display counters
            const studentCountEl = document.getElementById('studentCountDisplay');
            if (studentCountEl) {
                studentCountEl.textContent = stats.totalStudents || 0;
            }

            const studentsWithRoomsEl = document.getElementById('studentsWithRoomsDisplay');
            if (studentsWithRoomsEl) {
                // Prefer backend-provided studentsWithRooms (active allotments) and fallback to occupiedRooms count
                const withRooms = typeof stats.studentsWithRooms === 'number' ? stats.studentsWithRooms : (stats.occupiedRooms || 0);
                studentsWithRoomsEl.textContent = withRooms || 0;
            }

            const studentSummaryDiv = document.getElementById('studentSummary');
            if (studentSummaryDiv) {
                studentSummaryDiv.innerHTML = `
                    <div style="margin: 1rem 0;">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.9rem;">
                            <p><strong>${stats.totalStudents || 0}</strong> total students</p>
                            <p><strong>${(typeof stats.studentsWithRooms === 'number' ? stats.studentsWithRooms : (stats.occupiedRooms || 0))}</strong> students with rooms</p>
                        </div>
                        <p style="margin-top: 0.5rem; font-size: 0.9rem; color: ${stats.pendingRequests > 0 ? '#e74c3c' : '#27ae60'};">
                            <strong>${stats.pendingRequests || 0}</strong> pending maintenance requests
                        </p>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error loading student summary:', error);
            const studentSummaryDiv = document.getElementById('studentSummary');
            if (studentSummaryDiv) {
                studentSummaryDiv.innerHTML = '<p style="color: #e74c3c;">Failed to load student data</p>';
            }
        }
    },

    async loadRecentActivity() {
        try {
            console.log('Loading recent activity...');
            
            const activityDiv = document.getElementById('recentActivity');
            if (activityDiv) {
                activityDiv.innerHTML = '<p style="color:#666;">Loading…</p>';
                const resp = await API.call('/warden/recent-activity', { method: 'GET' });
                const items = resp?.data?.items || [];
                if (!items.length) {
                    activityDiv.innerHTML = '<p style="color:#666; font-style:italic;">No recent activity</p>';
                } else {
                    const format = (it) => {
                        const time = new Date(it.at).toLocaleString();
                        if (it.type === 'application') return `Application · ${it.status} · ${it.detail} · ${time}`;
                        if (it.type === 'maintenance') return `Maintenance · ${it.detail} · ${time}`;
                        if (it.type === 'announcement') return `Announcement · ${it.detail} · ${time}`;
                        return `${it.type || 'Activity'} · ${it.detail || ''} · ${time}`;
                    };
                    activityDiv.innerHTML = items.map(x => `
                        <div style="padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                            <span style="color: #444; font-size: 0.9rem;">• ${format(x)}</span>
                        </div>
                    `).join('');
                }
            }

        } catch (error) {
            console.error('Error loading recent activity:', error);
            const activityDiv = document.getElementById('recentActivity');
            if (activityDiv) {
                activityDiv.innerHTML = '<p style="color: #e74c3c;">Failed to load activity data</p>';
            }
        }
    },

    async loadPendingApprovals() {
        try {
            console.log('Loading pending approvals...');
            
            const applications = await API.call('/warden/pending-applications', { method: 'GET' });
            console.log('Pending applications loaded:', applications);

            const approvalsDiv = document.getElementById('pendingApprovals');
            if (approvalsDiv) {
                if (applications && applications.length > 0) {
                    const approvalsHTML = applications.slice(0, 5).map((app, index) => `
                        <div style="padding: 0.75rem; border: 1px solid #e3f2fd; margin: 0.5rem 0; background: #f8f9fa; border-radius: 4px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="flex: 1;">
                                    <strong>Allotment Application</strong>
                                    <div style="font-size: 0.9rem; color: #666;">
                                        ${app.course} - Year ${app.academicYear} | ${app.roomTypePreference} room | Priority: <strong>${app.priority || '—'}</strong>
                                        ${app.daysSinceApplied > 0 ? ` | Applied ${app.daysSinceApplied} days ago` : ' | Applied today'}
                                    </div>
                                </div>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="openApproveApplicationModal('${app.applicationId}')">
                                        Approve
                                    </button>
                                    <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="rejectApplication('${app.applicationId}')">
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
            console.error('Error loading pending approvals:', error);
            const approvalsDiv = document.getElementById('pendingApprovals');
            if (approvalsDiv) {
                approvalsDiv.innerHTML = '<p style="color: #e74c3c;">Failed to load pending applications</p>';
            }
        }
    },

    async loadRecentAnnouncements() {
        try {
            const resp = await API.call('/notifications/role?limit=5', { method: 'GET' });
            const rows = resp?.data?.announcements || [];

            // Update display counters
            const countEl = document.getElementById('recentAnnouncementsCount');
            if (countEl) {
                countEl.textContent = rows.length;
            }

            const timeEl = document.getElementById('lastAnnouncementTime');
            if (timeEl) {
                if (rows.length > 0) {
                    const lastTime = new Date(rows[0].createdAt);
                    const now = new Date();
                    const diffHours = Math.floor((now - lastTime) / (1000 * 60 * 60));
                    timeEl.textContent = diffHours < 1 ? 'Just now' : diffHours < 24 ? `${diffHours}h ago` : `${Math.floor(diffHours / 24)}d ago`;
                } else {
                    timeEl.textContent = '--';
                }
            }

            const announcementsDiv = document.getElementById('recentAnnouncements');
            if (!announcementsDiv) return;
            
            if (!rows.length) {
                announcementsDiv.innerHTML = '<p style="color:#666; font-style: italic;">No announcements yet</p>';
                return;
            }
            announcementsDiv.innerHTML = rows.map(a => `
                <div style="padding:0.75rem; border:1px solid #e5e7eb; border-radius:8px; margin:0.5rem 0; background:#f8fafc;">
                    <div style="display:flex; justify-content:space-between; gap:1rem;">
                        <div style="flex:1;">
                            <div style="font-weight:600;">${a.title}</div>
                            <div style="font-size:0.9rem; color:#444;">${a.message}</div>
                            <div style="font-size:0.8rem; color:#666; margin-top:0.25rem;">By ${a.sender || 'System'} · ${new Date(a.createdAt).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading recent announcements:', error);
            const announcementsDiv = document.getElementById('recentAnnouncements');
            if (announcementsDiv) announcementsDiv.innerHTML = '<p style="color: #dc3545; font-style: italic;">Error loading announcements</p>';
        }
    }
};

// Dashboard Action Functions
function manageRooms() {
    openManageRoomsModal();
}

function allocateRoom() {
    openAllocateRoomModal();
}

function reviewRequests() {
    // Load full maintenance queue into modal with action buttons
    openMaintenanceQueueModal();
}

function viewMaintenanceHistory() {
    openMaintenanceHistoryModal();
}

function viewAllStudents() {
    openStudentsListModal();
}

function addStudent() {
    openAddStudentModal();
}

function createAnnouncement() {
    openCreateAnnouncementModal();
}

function viewAllAnnouncements() {
    openAnnouncementsListModal();
}

function occupancyReport() {
    openOccupancyReportModal();
}

function maintenanceReport() {
    openMaintenanceReportModal();
}

function studentReport() {
    openStudentReportModal();
}

function financialReport() {
    openFinancialReportModal();
}

function emergencyAlert() {
    const content = `
        <div class="form-row">
            <div class="form-group" style="grid-column:1 / -1;">
                <label class="form-label">Alert Title</label>
                <input id="eaTitle" type="text" class="form-input" placeholder="e.g., Emergency Evacuation" required />
            </div>
            <div class="form-group" style="grid-column:1 / -1;">
                <label class="form-label">Message</label>
                <textarea id="eaMsg" class="form-input" rows="4" placeholder="Briefly describe the emergency and actions required" required></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Audience</label>
                <select id="eaAudience" class="form-select">
                    <option value="All">All</option>
                    <option value="Student" selected>Students</option>
                    <option value="Warden">Wardens</option>
                    <option value="Admin">Admins</option>
                </select>
                <div class="form-help">Tip: For hostel-only, use “Notify My Hostel Students” in Bulk Notification.</div>
            </div>
        </div>`;
    showGeneralModal('Emergency Alert', content, [
        { label: 'Send Alert', primary: true, onClick: submitEmergencyAlert }
    ]);
}

function bulkNotification() {
    const content = `
        <div class="form-row">
            <div class="form-group" style="grid-column:1 / -1;">
                <label class="form-label">Title</label>
                <input id="bnTitle" type="text" class="form-input" placeholder="e.g., Hostel Meeting" required />
            </div>
            <div class="form-group" style="grid-column:1 / -1;">
                <label class="form-label">Message</label>
                <textarea id="bnMsg" class="form-input" rows="4" placeholder="Message to recipients" required></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Scope</label>
                <select id="bnScope" class="form-select">
                    <option value="my-hostel" selected>Notify My Hostel Students</option>
                    <option value="role">By Role (All/Student/Warden/Admin)</option>
                </select>
            </div>
            <div class="form-group" id="bnRoleRow" style="display:none;">
                <label class="form-label">Audience</label>
                <select id="bnRole" class="form-select">
                    <option value="All">All</option>
                    <option value="Student" selected>Student</option>
                    <option value="Warden">Warden</option>
                    <option value="Admin">Admin</option>
                </select>
            </div>
        </div>`;
    showGeneralModal('Bulk Notification', content, [
        { label: 'Send', primary: true, onClick: submitBulkNotification }
    ]);
    const scopeSel = document.getElementById('bnScope');
    const roleRow = document.getElementById('bnRoleRow');
    scopeSel.addEventListener('change', () => {
        roleRow.style.display = scopeSel.value === 'role' ? 'block' : 'none';
    });
}

// ---- Announcements ----
// ...existing code...
// ---- Reports & Analytics ----
// Simple in-memory cache for the latest fetched report data
let __reportCache = {
    occupancy: null,
    maintenance: null,
    students: null,
    finance: null,
};

// CSV download helper
function downloadCSV(filename, header, rows) {
    const esc = v => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = [header.map(esc).join(',')]
        .concat(rows.map(r => r.map(esc).join(',')))
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
async function openOccupancyReportModal() {
    const container = `<div id="occReport" class="modal-content-container"></div>`;
    showGeneralModal('Occupancy Analytics', container, [
        { label: 'Download PDF', onClick: () => exportOccupancyPDF(), primary: true },
        { label: 'Download CSV', onClick: () => exportOccupancyCSV(), primary: true },
        { label: 'Refresh', onClick: () => loadOccupancyReport(), primary: true }
    ]);
    await loadOccupancyReport();
}

async function loadOccupancyReport() {
    const el = document.getElementById('occReport');
    if (!el) return;
    el.innerHTML = '<p style="color:#666;">Loading...</p>';
    try {
        const resp = await API.call('/warden/analytics/occupancy', { method: 'GET' });
        const { overall, hostels } = resp?.data || {};
        __reportCache.occupancy = { overall, hostels };
        const rows = (hostels || []).map(h => `
            <tr>
                <td>${h.hostelName}</td>
                <td>${h.totalRooms}</td>
                <td>${h.vacantRooms}</td>
                <td>${h.occupiedRooms}</td>
                <td>${h.maintenanceRooms}</td>
                <td>${h.capacity}</td>
                <td>${h.activeStudents}</td>
                <td>${h.occupancyPercent}%</td>
            </tr>
        `).join('');
        el.innerHTML = `
            <div style="margin-bottom:0.5rem;">
                <strong>Overall:</strong> Rooms ${overall.totalRooms} · Vacant ${overall.vacantRooms} · Occupied ${overall.occupiedRooms} · Maint ${overall.maintenanceRooms} · Capacity ${overall.totalCapacity} · Active ${overall.activeStudents} · Occ ${overall.occupancyPercent}%
            </div>
            <div class="table-responsive">
              <table class="table">
                <thead><tr><th>Hostel</th><th>Total</th><th>Vacant</th><th>Occupied</th><th>Maint</th><th>Capacity</th><th>Active</th><th>Occ%</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
        `;
    } catch (e) {
        el.innerHTML = '<p style="color:#dc3545;">Failed to load occupancy analytics</p>';
    }
}

function exportOccupancyCSV() {
    const data = __reportCache.occupancy;
    if (!data || !data.hostels) { UIHelper.showAlert('Load the report first', 'info'); return; }
    const header = ['Hostel','Total Rooms','Vacant','Occupied','Maintenance','Capacity','Active Students','Occupancy %'];
    const rows = data.hostels.map(h => [h.hostelName, h.totalRooms, h.vacantRooms, h.occupiedRooms, h.maintenanceRooms, h.capacity, h.activeStudents, h.occupancyPercent]);
    downloadCSV('occupancy_report.csv', header, rows);
}

function exportOccupancyPDF() {
        const data = __reportCache.occupancy;
        if (!data || !data.hostels) { UIHelper.showAlert('Load the report first', 'info'); return; }
        const rows = data.hostels.map(h => `
            <tr>
                <td>${h.hostelName}</td>
                <td>${h.totalRooms}</td>
                <td>${h.vacantRooms}</td>
                <td>${h.occupiedRooms}</td>
                <td>${h.maintenanceRooms}</td>
                <td>${h.capacity}</td>
                <td>${h.activeStudents}</td>
                <td>${h.occupancyPercent}%</td>
            </tr>`).join('');
        const o = data.overall;
        const html = `
            <h1>Occupancy Analytics</h1>
            <div class="summary">Rooms ${o.totalRooms} · Vacant ${o.vacantRooms} · Occupied ${o.occupiedRooms} · Maint ${o.maintenanceRooms} · Capacity ${o.totalCapacity} · Active ${o.activeStudents} · Occ ${o.occupancyPercent}%</div>
            <table class="report-table">
                <thead><tr><th>Hostel</th><th>Total</th><th>Vacant</th><th>Occupied</th><th>Maint</th><th>Capacity</th><th>Active</th><th>Occ%</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>`;
        printReport('Occupancy_Analytics', html);
}

async function openMaintenanceReportModal() {
    const container = `<div id="mntReport" class="modal-content-container"></div>`;
    showGeneralModal('Maintenance Analytics (30 days)', container, [
        { label: 'Download PDF', onClick: () => exportMaintenancePDF(), primary: true },
        { label: 'Download CSV', onClick: () => exportMaintenanceCSV(), primary: true },
        { label: 'Refresh', onClick: () => loadMaintenanceReport(), primary: true }
    ]);
    await loadMaintenanceReport();
}

async function loadMaintenanceReport() {
    const el = document.getElementById('mntReport');
    if (!el) return;
    el.innerHTML = '<p style="color:#666;">Loading...</p>';
    try {
        const resp = await API.call('/warden/analytics/maintenance', { method: 'GET' });
        const { overall, perHostel } = resp?.data || {};
        __reportCache.maintenance = { overall, perHostel };
        const rows = (perHostel || []).map(h => `
            <tr>
                <td>${h.hostelName}</td>
                <td>${h.total}</td>
                <td>${h.pending}</td>
                <td>${h.inProgress}</td>
                <td>${h.completed}</td>
            </tr>
        `).join('');
        el.innerHTML = `
            <div style="margin-bottom:0.5rem;">
              <strong>Overall:</strong> Total ${overall.total_requests} · Pending ${overall.pending_requests} · In Progress ${overall.in_progress_requests} · Completed ${overall.completed_requests} · High ${overall.high_priority}
            </div>
            <div class="table-responsive">
              <table class="table">
                <thead><tr><th>Hostel</th><th>Total</th><th>Pending</th><th>In Progress</th><th>Completed</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
        `;
    } catch (e) {
        el.innerHTML = '<p style="color:#dc3545;">Failed to load maintenance analytics</p>';
    }
}

function exportMaintenanceCSV() {
    const data = __reportCache.maintenance;
    if (!data || !data.perHostel) { UIHelper.showAlert('Load the report first', 'info'); return; }
    const header = ['Hostel','Total','Pending','In Progress','Completed'];
    const rows = data.perHostel.map(h => [h.hostelName, h.total, h.pending, h.inProgress, h.completed]);
    downloadCSV('maintenance_report.csv', header, rows);
}

function exportMaintenancePDF() {
        const data = __reportCache.maintenance;
        if (!data || !data.perHostel) { UIHelper.showAlert('Load the report first', 'info'); return; }
        const rows = data.perHostel.map(h => `
            <tr>
                <td>${h.hostelName}</td>
                <td>${h.total}</td>
                <td>${h.pending}</td>
                <td>${h.inProgress}</td>
                <td>${h.completed}</td>
            </tr>`).join('');
        const o = data.overall;
        const html = `
            <h1>Maintenance Analytics (30 days)</h1>
            <div class="summary">Total ${o.total_requests} · Pending ${o.pending_requests} · In Progress ${o.in_progress_requests} · Completed ${o.completed_requests} · High ${o.high_priority} · Medium ${o.medium_priority} · Low ${o.low_priority}</div>
            <table class="report-table">
                <thead><tr><th>Hostel</th><th>Total</th><th>Pending</th><th>In Progress</th><th>Completed</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>`;
        printReport('Maintenance_Analytics', html);
}

async function openStudentReportModal() {
    const container = `<div id="stuReport" class="modal-content-container"></div>`;
    showGeneralModal('Student Analytics', container, [
        { label: 'Download PDF', onClick: () => exportStudentsPDF(), primary: true },
        { label: 'Download CSV', onClick: () => exportStudentsCSV(), primary: true },
        { label: 'Refresh', onClick: () => loadStudentReport(), primary: true }
    ]);
    await loadStudentReport();
}

async function loadStudentReport() {
    const el = document.getElementById('stuReport');
    if (!el) return;
    el.innerHTML = '<p style="color:#666;">Loading...</p>';
        try {
                const resp = await API.call('/warden/analytics/students', { method: 'GET' });
                const data = resp?.data || {};
                __reportCache.students = data;
                const byYear = data.byYear || {};
                const byDept = data.byDept || {};
                const byCategory = data.byCategory || {};
                const yMax = Math.max(1, ...Object.values(byYear));
                const dMax = Math.max(1, ...Object.values(byDept));
                const cMax = Math.max(1, ...Object.values(byCategory));

                const bar = (label, count, max) => `
                        <div style="margin:0.35rem 0;">
                            <div style="display:flex; justify-content:space-between; font-size:0.9rem;">
                                <span>${label}</span><span>${count}</span>
                            </div>
                            <div style="height:8px; background:#eee; border-radius:4px; overflow:hidden;">
                                <div style="height:100%; width:${Math.round((count/max)*100)}%; background:#3b82f6;"></div>
                            </div>
                        </div>`;

                const yearBars = Object.entries(byYear).sort((a,b)=>parseInt(a[0])-parseInt(b[0])).map(([y,c]) => bar(`Year ${y}`, c, yMax)).join('');
                const deptBars = Object.entries(byDept).sort((a,b)=>a[0].localeCompare(b[0])).map(([d,c]) => bar(d, c, dMax)).join('');
                const catBars = Object.entries(byCategory).map(([cat,c]) => bar(cat, c, cMax)).join('');

                el.innerHTML = `
                        <div style="margin-bottom:0.75rem; padding:0.5rem; background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px;">
                            <strong>Totals:</strong> Students ${data.totals?.students || 0} · Active Allotments ${data.totals?.activeAllotments || 0}
                        </div>
                        <div class="grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:1rem;">
                            <div style="border:1px solid #e5e7eb; border-radius:8px; padding:0.75rem;">
                                <div style="font-weight:600; margin-bottom:0.5rem;">By Year</div>
                                ${yearBars || '<div style="color:#666;">No data</div>'}
                            </div>
                            <div style="border:1px solid #e5e7eb; border-radius:8px; padding:0.75rem;">
                                <div style="font-weight:600; margin-bottom:0.5rem;">By Department</div>
                                ${deptBars || '<div style="color:#666;">No data</div>'}
                            </div>
                            <div style="border:1px solid #e5e7eb; border-radius:8px; padding:0.75rem;">
                                <div style="font-weight:600; margin-bottom:0.5rem;">By Category</div>
                                ${catBars || '<div style="color:#666;">No data</div>'}
                            </div>
                        </div>
                `;
        } catch (e) {
                el.innerHTML = '<p style="color:#dc3545;">Failed to load student analytics</p>';
        }
}

function exportStudentsCSV() {
        const data = __reportCache.students;
        if (!data) { UIHelper.showAlert('Load the report first', 'info'); return; }
        const rows = [];
        for (const [k,v] of Object.entries(data.byYear || {})) rows.push(['Year', `Year ${k}`, v]);
        for (const [k,v] of Object.entries(data.byDept || {})) rows.push(['Department', k, v]);
        for (const [k,v] of Object.entries(data.byCategory || {})) rows.push(['Category', k, v]);
        const header = ['Group', 'Key', 'Count'];
        downloadCSV('student_report.csv', header, rows);
}

function exportStudentsPDF() {
        const data = __reportCache.students;
        if (!data) { UIHelper.showAlert('Load the report first', 'info'); return; }
        const yearRows = Object.entries(data.byYear || {}).sort((a,b)=>parseInt(a[0])-parseInt(b[0])).map(([k,v]) => `<tr><td>Year ${k}</td><td>${v}</td></tr>`).join('');
        const deptRows = Object.entries(data.byDept || {}).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
        const catRows = Object.entries(data.byCategory || {}).map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
        const html = `
            <h1>Student Analytics</h1>
            <div class="summary">Students ${data.totals?.students || 0} · Active Allotments ${data.totals?.activeAllotments || 0}</div>
            <h2>By Year</h2>
            <table class="report-table"><thead><tr><th>Year</th><th>Count</th></tr></thead><tbody>${yearRows || '<tr><td colspan="2">No data</td></tr>'}</tbody></table>
            <h2>By Department</h2>
            <table class="report-table"><thead><tr><th>Department</th><th>Count</th></tr></thead><tbody>${deptRows || '<tr><td colspan="2">No data</td></tr>'}</tbody></table>
            <h2>By Category</h2>
            <table class="report-table"><thead><tr><th>Category</th><th>Count</th></tr></thead><tbody>${catRows || '<tr><td colspan="2">No data</td></tr>'}</tbody></table>`;
        printReport('Student_Analytics', html);
}

// Print helper: opens a new window with print-friendly HTML and triggers print
function printReport(title, bodyHtml) {
        const styles = `
            <style>
                :root { --text:#111; --muted:#555; --border:#ddd; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: var(--text); margin: 24px; }
                h1 { margin: 0 0 12px; }
                h2 { margin: 18px 0 8px; font-size: 16px; }
                .summary { margin: 8px 0 12px; color: var(--muted); }
                table.report-table { width: 100%; border-collapse: collapse; font-size: 12px; }
                table.report-table th, table.report-table td { border: 1px solid var(--border); padding: 6px 8px; text-align: left; }
                table.report-table thead th { background: #f3f4f6; }
                @page { margin: 16mm; }
            </style>`;
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${styles}</head><body>${bodyHtml}</body></html>`;
        const w = window.open('', '_blank');
        if (!w) { UIHelper.showAlert('Popup blocked. Please allow popups to export PDF.', 'error'); return; }
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); w.close(); }, 300);
}

// ---- Financial Report ----
async function openFinancialReportModal() {
    const container = `
        <div class="form-row" style="margin-bottom:0.5rem;">
            <div class="form-group">
                <label class="form-label">Expenses Period</label>
                <select id="finExpPeriod" class="form-select">
                    <option value="month" selected>This Month</option>
                    <option value="all">All Time</option>
                </select>
            </div>
        </div>
        <div id="finReport" class="modal-content-container"></div>`;
    showGeneralModal('Financial Report', container, [
        { label: 'Download PDF', onClick: () => exportFinancePDF(), primary: true },
        { label: 'Download CSV', onClick: () => exportFinanceCSV(), primary: true },
        { label: 'Refresh', onClick: () => loadFinancialReport(), primary: true }
    ]);
    const sel = document.getElementById('finExpPeriod');
    if (sel) sel.addEventListener('change', () => loadFinancialReport());
    await loadFinancialReport();
}

async function loadFinancialReport() {
    const el = document.getElementById('finReport');
    if (!el) return;
    el.innerHTML = '<p style="color:#666;">Loading...</p>';
    try {
        const period = document.getElementById('finExpPeriod')?.value || 'month';
        const [sumResp, feesResp, expResp] = await Promise.all([
            API.call('/warden/finance/summary', { method: 'GET' }),
            API.call('/warden/finance/fees', { method: 'GET' }),
            API.call(`/warden/finance/expenses?period=${encodeURIComponent(period)}`, { method: 'GET' })
        ]);
        const summary = sumResp?.summary || sumResp?.data?.summary || { total_billed: 0, total_paid: 0, pending: 0, overdue: 0, monthlyPayments: 0, feesCount: 0, maintenance_expenses: 0, maintenance_expenses_month: 0 };
        const fees = feesResp?.fees || feesResp?.data?.fees || [];
        const expenses = expResp?.expenses || expResp?.data?.expenses || [];
        __reportCache.finance = { summary, fees, expenses };

        const kpi = (label, value) => `<div style="padding:0.75rem; border:1px solid #e5e7eb; border-radius:8px; background:#f8fafc;"><div style="font-size:0.8rem; color:#666;">${label}</div><div style="font-size:1.1rem; font-weight:600;">₹ ${Number(value || 0).toLocaleString()}</div></div>`;
        const kpis = `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:0.75rem; margin-bottom:0.75rem;">
                ${kpi('Total Billed', summary.total_billed)}
                ${kpi('Total Paid', summary.total_paid)}
                ${kpi('Pending', summary.pending)}
                ${kpi('Overdue', summary.overdue)}
                ${kpi('Payments This Month', summary.monthlyPayments)}
                ${kpi('Maint. Expenses (Total)', summary.maintenance_expenses)}
                ${kpi('Maint. Expenses (This Month)', summary.maintenance_expenses_month)}
            </div>`;

        const rows = fees.map(f => `
            <tr>
                <td>${f.students?.name || '-'}</td>
                <td>${f.students?.reg_no || '-'}</td>
                <td>₹ ${Number(f.amount || 0).toLocaleString()}</td>
                <td>₹ ${Number(f.paid_amount || 0).toLocaleString()}</td>
                <td>₹ ${Math.max(0, Number(f.amount||0) - Number(f.paid_amount||0)).toLocaleString()}</td>
                <td>${f.status || '-'}</td>
                <td>${f.due_date ? new Date(f.due_date).toLocaleDateString() : '-'}</td>
                <td>${f.paid_at ? new Date(f.paid_at).toLocaleDateString() : '-'}</td>
            </tr>`).join('');

                const expRows = (expenses || []).map(x => `
                        <tr>
                                <td>₹ ${Number(x.amount || 0).toLocaleString()}</td>
                                <td>${x.vendor || '-'}</td>
                                <td>${x.description || '-'}</td>
                                <td>${x.hostelName || '-'}</td>
                                <td>${x.roomNo || '-'}</td>
                                <td>${x.category || '-'}</td>
                                <td>${x.status || '-'}</td>
                                <td>${x.paidAt ? new Date(x.paidAt).toLocaleDateString() : '-'}</td>
                                <td>${x.createdAt ? new Date(x.createdAt).toLocaleDateString() : '-'}</td>
                        </tr>`).join('');

                el.innerHTML = `
                        ${kpis}
                        <div style="margin:0.25rem 0; color:#666;">${fees.length} fee record(s)</div>
                        <div class="table-responsive">
                            <table class="table">
                                <thead><tr><th>Student</th><th>Reg No</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Due</th><th>Paid At</th></tr></thead>
                                <tbody>${rows}</tbody>
                            </table>
                        </div>
                        <div style="margin:0.75rem 0 0.25rem; font-weight:600;">Maintenance Expenses (${period === 'all' ? 'All Time' : 'This Month'})</div>
                        <div class="table-responsive">
                            <table class="table">
                                <thead><tr><th>Amount</th><th>Vendor</th><th>Description</th><th>Hostel</th><th>Room</th><th>Category</th><th>Status</th><th>Paid At</th><th>Created</th></tr></thead>
                                <tbody>${expRows}</tbody>
                            </table>
                        </div>
                        `;
        } catch (e) {
                console.error('Finance report load error:', e);
                el.innerHTML = '<p style="color:#dc3545;">Failed to load financial report</p>';
        }
}

function exportFinanceCSV() {
    const data = __reportCache.finance;
    if (!data) { UIHelper.showAlert('Load the report first', 'info'); return; }
    const header = ['Student','Reg No','Amount','Paid','Balance','Status','Due Date','Paid At'];
    const rows = (data.fees || []).map(f => [
        f.students?.name || '',
        f.students?.reg_no || '',
        Number(f.amount || 0),
        Number(f.paid_amount || 0),
        Math.max(0, Number(f.amount||0) - Number(f.paid_amount||0)),
        f.status || '',
        f.due_date || '',
        f.paid_at || ''
    ]);
    downloadCSV('finance_report.csv', header, rows);
}

function exportFinancePDF() {
    const data = __reportCache.finance;
    if (!data) { UIHelper.showAlert('Load the report first', 'info'); return; }
    const s = data.summary || { total_billed: 0, total_paid: 0, pending: 0, overdue: 0, monthlyPayments: 0, maintenance_expenses: 0, maintenance_expenses_month: 0 };
    const rows = (data.fees || []).map(f => `
        <tr>
            <td>${f.students?.name || ''}</td>
            <td>${f.students?.reg_no || ''}</td>
            <td>₹ ${Number(f.amount || 0).toLocaleString()}</td>
            <td>₹ ${Number(f.paid_amount || 0).toLocaleString()}</td>
            <td>₹ ${Math.max(0, Number(f.amount||0) - Number(f.paid_amount||0)).toLocaleString()}</td>
            <td>${f.status || ''}</td>
            <td>${f.due_date ? new Date(f.due_date).toLocaleDateString() : '-'}</td>
            <td>${f.paid_at ? new Date(f.paid_at).toLocaleDateString() : '-'}</td>
        </tr>`).join('');
    const period = (document.getElementById('finExpPeriod')?.value || 'month') === 'all' ? 'All Time' : 'This Month';
    const expRows = (data.expenses || []).map(x => `
        <tr>
            <td>₹ ${Number(x.amount || 0).toLocaleString()}</td>
            <td>${x.vendor || ''}</td>
            <td>${x.description || ''}</td>
            <td>${x.hostelName || ''}</td>
            <td>${x.roomNo || ''}</td>
            <td>${x.category || ''}</td>
            <td>${x.status || ''}</td>
            <td>${x.paidAt ? new Date(x.paidAt).toLocaleDateString() : '-'}</td>
            <td>${x.createdAt ? new Date(x.createdAt).toLocaleDateString() : '-'}</td>
        </tr>`).join('');
    const html = `
        <h1>Financial Report</h1>
        <div class="summary">Total Billed ₹ ${Number(s.total_billed).toLocaleString()} · Total Paid ₹ ${Number(s.total_paid).toLocaleString()} · Pending ₹ ${Number(s.pending).toLocaleString()} · Overdue ₹ ${Number(s.overdue).toLocaleString()} · Payments This Month ₹ ${Number(s.monthlyPayments).toLocaleString()} · Maint Exp (Total) ₹ ${Number(s.maintenance_expenses || 0).toLocaleString()} · Maint Exp (This Month) ₹ ${Number(s.maintenance_expenses_month || 0).toLocaleString()}</div>
        <table class="report-table">
            <thead><tr><th>Student</th><th>Reg No</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Due</th><th>Paid At</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <h2>Maintenance Expenses (${period})</h2>
        <table class="report-table">
            <thead><tr><th>Amount</th><th>Vendor</th><th>Description</th><th>Hostel</th><th>Room</th><th>Category</th><th>Status</th><th>Paid At</th><th>Created</th></tr></thead>
            <tbody>${expRows || '<tr><td colspan="9">No expenses</td></tr>'}</tbody>
        </table>`;
    printReport('Financial_Report', html);
}
function openCreateAnnouncementModal() {
    const content = `
        <div class="form-row">
            <div class="form-group" style="grid-column: 1 / -1;">
                <label class="form-label">Title</label>
                <input id="anTitle" type="text" class="form-input" maxlength="120" required />
            </div>
            <div class="form-group" style="grid-column: 1 / -1;">
                <label class="form-label">Message</label>
                <textarea id="anMessage" class="form-input" rows="4" maxlength="1000" required></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Audience</label>
                <select id="anAudience" class="form-select">
                    <option value="All">All</option>
                    <option value="Student">Students</option>
                    <option value="Warden">Wardens</option>
                    <option value="Admin">Admins</option>
                    <option value="User">Specific User</option>
                </select>
            </div>
            <div class="form-group" id="anUserRow" style="display:none; grid-column: 1 / -1;">
                <label class="form-label">Search User</label>
                <input id="anUserSearch" type="text" class="form-input" placeholder="Type username or email..." />
                <div id="anUserResults" class="dropdown" style="position:relative;">
                    <div id="anUserList" style="position:absolute; z-index:10; background:#fff; border:1px solid #e5e7eb; width:100%; display:none; max-height:200px; overflow:auto;"></div>
                </div>
                <input id="anUserSelected" type="hidden" />
                <div id="anUserHint" class="form-help">Pick a user from the suggestions.</div>
            </div>
        </div>
        <p class="form-help">Announcements are visible in the dashboard for the selected audience.</p>
    `;
    showGeneralModal('Create Announcement', content, [
        { label: 'Publish', primary: true, onClick: submitCreateAnnouncement }
    ]);
    const audSel = document.getElementById('anAudience');
    const userRow = document.getElementById('anUserRow');
    audSel.addEventListener('change', () => {
        userRow.style.display = audSel.value === 'User' ? 'block' : 'none';
    });

    // Wire search
    const searchInput = document.getElementById('anUserSearch');
    const list = document.getElementById('anUserList');
    const hidden = document.getElementById('anUserSelected');
    searchInput.addEventListener('input', debounce(async () => {
        const q = searchInput.value.trim();
        if (!q) { list.style.display = 'none'; list.innerHTML=''; hidden.value=''; return; }
        try {
            const res = await API.call(`/notifications/users?q=${encodeURIComponent(q)}&limit=8`, { method: 'GET' });
            const users = res?.data?.users || [];
            if (!users.length) { list.innerHTML = '<div style="padding:0.5rem; color:#666;">No results</div>'; list.style.display='block'; return; }
            list.innerHTML = users.map(u => `<div class="dropdown-item" data-uid="${u.user_id}" data-uname="${u.username}" style="padding:0.5rem; cursor:pointer;">${u.username} <span style="color:#666;">${u.email ? '· '+u.email : ''}</span></div>`).join('');
            list.style.display = 'block';
            Array.from(list.children).forEach(el => {
                el.addEventListener('click', () => {
                    const uname = el.getAttribute('data-uname');
                    hidden.value = uname;
                    searchInput.value = uname;
                    list.style.display = 'none';
                });
            });
        } catch (e) {
            list.innerHTML = '<div style="padding:0.5rem; color:#dc3545;">Search failed</div>';
            list.style.display = 'block';
        }
    }, 300));
}

async function submitCreateAnnouncement() {
    const title = document.getElementById('anTitle')?.value?.trim();
    const message = document.getElementById('anMessage')?.value?.trim();
    const audience = document.getElementById('anAudience')?.value;
    const receiver_username = document.getElementById('anUserSelected')?.value?.trim();
    if (!title || !message) {
        UIHelper.showAlert('Title and message are required', 'error');
        return;
    }
    if (audience === 'User' && !receiver_username) {
        UIHelper.showAlert('Pick a user from suggestions for Specific User audience', 'error');
        return;
    }
    const payload = { title, message, audience };
    if (audience === 'User') payload.receiver_username = receiver_username;
    try {
        const resp = await API.call('/notifications/announce', { method: 'POST', body: JSON.stringify(payload) });
        if (resp?.success) {
            UIHelper.showAlert('Announcement published', 'success');
            closeGeneralModal();
            await WardenDashboard.loadRecentAnnouncements();
            await WardenDashboard.loadRecentActivity();
        }
    } catch (e) {
        UIHelper.showAlert(e.message || 'Failed to publish announcement', 'error');
    }
}

async function openAnnouncementsListModal() {
    const container = `<div id="anList" class="modal-content-container"></div>`;
    showGeneralModal('All Announcements', container, [
        { label: 'Refresh', onClick: () => loadAnnouncementsIntoList(), primary: true }
    ]);
    await loadAnnouncementsIntoList();
}

async function loadAnnouncementsIntoList() {
    const listEl = document.getElementById('anList');
    if (!listEl) return;
    listEl.innerHTML = '<p style="color:#666;">Loading...</p>';
    try {
        const resp = await API.call('/notifications/role?limit=50', { method: 'GET' });
        const rows = resp?.data?.announcements || [];
        if (!rows.length) {
            listEl.innerHTML = '<p style="color:#666; font-style:italic;">No announcements</p>';
            return;
        }
        listEl.innerHTML = rows.map(a => `
            <div style="padding:0.75rem; border:1px solid #e5e7eb; border-radius:8px; margin:0.5rem 0; background:#fff;">
                <div style="display:flex; justify-content:space-between; gap:1rem;">
                    <div style="flex:1;">
                        <div style="font-weight:600;">${a.title}</div>
                        <div style="font-size:0.95rem; color:#333;">${a.message}</div>
                        <div style="font-size:0.8rem; color:#666; margin-top:0.25rem;">By ${a.sender || 'System'} · ${new Date(a.createdAt).toLocaleString()} · Audience: ${a.audience}</div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        listEl.innerHTML = '<p style="color:#dc3545;">Failed to load announcements</p>';
    }
}

function roomInspection() {
    const content = `
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Date</label>
                <input id="riDate" type="date" class="form-input" required />
            </div>
            <div class="form-group">
                <label class="form-label">Notes</label>
                <input id="riNotes" type="text" class="form-input" placeholder="Optional" />
            </div>
        </div>
        <p class="form-help">This creates an announcement for your hostel’s students with inspection details.</p>`;
    showGeneralModal('Schedule Inspection', content, [
        { label: 'Schedule', primary: true, onClick: submitRoomInspection }
    ]);
}

function updateRules() {
    const content = `
        <div class="form-row">
            <div class="form-group" style="grid-column:1 / -1;">
                <label class="form-label">Rules Update Title</label>
                <input id="ruTitle" type="text" class="form-input" placeholder="e.g., New Quiet Hours" required />
            </div>
            <div class="form-group" style="grid-column:1 / -1;">
                <label class="form-label">Summary / Key Changes</label>
                <textarea id="ruMsg" class="form-input" rows="4" placeholder="Describe the rule changes" required></textarea>
            </div>
            <div class="form-group" style="grid-column:1 / -1;">
                <label class="form-label">Full Rules (HTML allowed)</label>
                <textarea id="ruHtml" class="form-input" rows="10" placeholder="Paste or type the full rules content (HTML supported). Leave empty to only send announcement."></textarea>
                <div class="form-help">Tip: You can paste HTML or plain text. Students will see the content in the Rules modal. If left blank, only an announcement will be sent.</div>
            </div>
        </div>`;
    showGeneralModal('Update Rules', content, [
        { label: 'Publish', primary: true, onClick: submitUpdateRules }
    ]);
}

async function submitEmergencyAlert() {
    const title = document.getElementById('eaTitle')?.value?.trim();
    const message = document.getElementById('eaMsg')?.value?.trim();
    const audience = document.getElementById('eaAudience')?.value || 'Student';
    if (!title || !message) { UIHelper.showAlert('Title and Message are required', 'error'); return; }
    try {
        const body = { title, message, audience };
        const resp = await API.call('/notifications/announce', { method: 'POST', body: JSON.stringify(body) });
        if (resp?.success) {
            UIHelper.showAlert('Emergency alert sent', 'success');
            closeGeneralModal();
            await WardenDashboard.loadRecentAnnouncements?.();
            await WardenDashboard.loadRecentActivity();
        }
    } catch (e) {
        UIHelper.showAlert(e.message || 'Failed to send alert', 'error');
    }
}

async function submitBulkNotification() {
    const title = document.getElementById('bnTitle')?.value?.trim();
    const message = document.getElementById('bnMsg')?.value?.trim();
    const scope = document.getElementById('bnScope')?.value || 'my-hostel';
    const role = document.getElementById('bnRole')?.value || 'Student';
    if (!title || !message) { UIHelper.showAlert('Title and Message are required', 'error'); return; }
    try {
        let resp;
        if (scope === 'my-hostel') {
            resp = await API.call('/notifications/announce/my-hostel', { method: 'POST', body: JSON.stringify({ title, message }) });
        } else {
            resp = await API.call('/notifications/announce', { method: 'POST', body: JSON.stringify({ title, message, audience: role }) });
        }
        if (resp?.success) {
            UIHelper.showAlert('Notification sent', 'success');
            closeGeneralModal();
            await WardenDashboard.loadRecentAnnouncements?.();
            await WardenDashboard.loadRecentActivity();
        }
    } catch (e) {
        UIHelper.showAlert(e.message || 'Failed to send notification', 'error');
    }
}

async function submitRoomInspection() {
    const date = document.getElementById('riDate')?.value;
    const notes = document.getElementById('riNotes')?.value?.trim() || '';
    if (!date) { UIHelper.showAlert('Please pick a date', 'error'); return; }
    const title = 'Room Inspection Notice';
    const message = `Room inspection scheduled on ${new Date(date).toLocaleDateString()}` + (notes ? ` — ${notes}` : '');
    try {
        const resp = await API.call('/notifications/announce/my-hostel', { method: 'POST', body: JSON.stringify({ title, message }) });
        if (resp?.success) {
            UIHelper.showAlert('Inspection scheduled and announced', 'success');
            closeGeneralModal();
            await WardenDashboard.loadRecentAnnouncements?.();
            await WardenDashboard.loadRecentActivity();
        }
    } catch (e) {
        UIHelper.showAlert(e.message || 'Failed to schedule inspection', 'error');
    }
}

async function submitUpdateRules() {
    const title = document.getElementById('ruTitle')?.value?.trim();
    const message = document.getElementById('ruMsg')?.value?.trim();
    const html = document.getElementById('ruHtml')?.value?.trim();
    if (!title || !message) { UIHelper.showAlert('Title and Summary are required', 'error'); return; }
    try {
        // If full HTML provided, save to settings first
        if (html) {
            await API.call('/rules/warden', { method: 'POST', body: JSON.stringify({ html }) });
        }
        const resp = await API.call('/notifications/announce', { method: 'POST', body: JSON.stringify({ title, message, audience: 'Student' }) });
        if (resp?.success) {
            UIHelper.showAlert(html ? 'Rules saved and announced' : 'Rules announcement sent', 'success');
            closeGeneralModal();
            await WardenDashboard.loadRecentAnnouncements?.();
            await WardenDashboard.loadRecentActivity();
        }
    } catch (e) {
        UIHelper.showAlert(e.message || 'Failed to publish rules', 'error');
    }
}

function reviewApprovals() {
    // Load full pending applications list into modal with approve/reject
    openApprovalsModal();
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
            await WardenDashboard.loadRecentActivity();
            // If modal open, refresh list
            if (document.getElementById('generalModal')?.style.display === 'block' && document.getElementById('mqList')) {
                await loadMaintenanceQueueList();
            }
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
            await WardenDashboard.loadRecentActivity();
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
            await WardenDashboard.loadRecentActivity();
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

// Reusable general modal helpers (matching student dashboard conventions)
let __modalPrevFocusEl = null;

function setBackgroundInert(enable) {
    const modal = document.getElementById('generalModal');
    if (!modal || !modal.parentElement) return;
    // Inert all body children except the modal
    Array.from(document.body.children).forEach(el => {
        if (el === modal) return;
        if (enable) {
            el.setAttribute('inert', '');
        } else {
            el.removeAttribute('inert');
        }
    });
}

function showGeneralModal(title, content, actions = []) {
    const titleEl = document.getElementById('generalModalTitle');
    const contentEl = document.getElementById('generalModalContent');
    const actionsEl = document.getElementById('generalModalActions');
    if (!titleEl || !contentEl || !actionsEl) return;
    // Allow HTML so inline SVGs in titles render
    titleEl.innerHTML = title;
    contentEl.innerHTML = content;
    // Reset actions
    actionsEl.innerHTML = '';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-primary';
    closeBtn.textContent = 'Close';
    closeBtn.onclick = closeGeneralModal;
    actionsEl.appendChild(closeBtn);
    // Additional actions
    for (const act of actions) {
        const btn = document.createElement('button');
        let variant = 'btn-secondary';
        if (act.danger) variant = 'btn-danger';
        else if (act.success) variant = 'btn-success';
        else if (act.primary) variant = 'btn-primary';
        btn.className = `btn ${variant}`;
        btn.textContent = act.label;
        btn.onclick = act.onClick;
        if (act.primary || act.success) btn.setAttribute('data-primary', 'true');
        actionsEl.appendChild(btn);
    }
    const modal = document.getElementById('generalModal');
    __modalPrevFocusEl = document.activeElement;
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    setBackgroundInert(true);
    // Move focus inside the modal (prefer close icon, then primary action, then modal content)
    const focusTarget = modal.querySelector('.close,[data-primary],.modal-content button, [role="button"], button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusTarget && typeof focusTarget.focus === 'function') {
        focusTarget.focus();
    }
}

function closeGeneralModal() {
    const modal = document.getElementById('generalModal');
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
    setBackgroundInert(false);
    // Restore focus to the previously focused element if still in DOM
    if (__modalPrevFocusEl && document.contains(__modalPrevFocusEl)) {
        try { __modalPrevFocusEl.focus(); } catch (_) {}
    }
}

async function openMaintenanceQueueModal() {
    const controls = `
        <div class="form-row" style="margin-bottom:0.75rem; display:flex; gap:0.75rem; align-items:flex-end;">
            <div class="form-group">
                <label class="form-label">Status</label>
                <select id="mqStatus" class="form-select">
                    <option>All</option>
                    <option>Pending</option>
                    <option>In Progress</option>
                </select>
            </div>
        </div>
        <div id="mqList" class="modal-content-container"></div>`;
    showGeneralModal('Maintenance Requests', controls, [
        { label: 'Refresh', onClick: () => loadMaintenanceQueueList(), primary: true }
    ]);
    document.getElementById('mqStatus').addEventListener('change', loadMaintenanceQueueList);
    await loadMaintenanceQueueList();
}

async function loadMaintenanceQueueList() {
    const status = document.getElementById('mqStatus')?.value || 'All';
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const listEl = document.getElementById('mqList');
    if (!listEl) return;
    listEl.innerHTML = '<p style="color:#666;">Loading…</p>';
    try {
        const requests = await API.call(`/warden/maintenance-queue${qs}`, { method: 'GET' });
        if (!requests || !requests.length) {
            listEl.innerHTML = '<p style="color:#666; font-style:italic;">No requests</p>';
            return;
        }
        listEl.innerHTML = requests.map(req => `
            <div style="padding:0.75rem; border:1px solid #e5e7eb; border-left:4px solid ${req.priority === 'High' ? '#e74c3c' : req.priority === 'Medium' ? '#f39c12' : '#27ae60'}; border-radius:8px; margin:0.5rem 0; background:#fff;">
                <div style="display:flex; justify-content:space-between; gap:1rem; align-items:center;">
                    <div style="flex:1;">
                        <div style="font-weight:600;">${req.description || req.category}</div>
                        <div style="font-size:0.9rem; color:#666;">${req.studentName} · Room ${req.roomNumber} · ${req.priority} · <strong>${req.status || ''}</strong> · ${req.daysSinceCreated > 0 ? req.daysSinceCreated + ' days ago' : 'Today'}</div>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                        ${req.status === 'Pending' ? `<button class="btn btn-primary" onclick="approveRequest(${req.requestId})">Start</button>` : ''}
                        ${req.status === 'In Progress' ? `<button class="btn btn-success" onclick="openCompleteMaintenanceModal(${req.requestId})"><span aria-hidden="true" class="icon" style="display:inline-flex;vertical-align:middle;margin-right:6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></span>Mark Completed</button>` : ''}
                    </div>
                </div>
            </div>`).join('');
    } catch (e) {
        listEl.innerHTML = '<p style="color:#e74c3c;">Failed to load maintenance requests.</p>';
    }
}

function openCompleteMaintenanceModal(requestId) {
    const body = `
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Expense Amount (₹)</label>
                <input id="cmAmount" type="number" step="0.01" min="0" class="form-input" placeholder="e.g., 500" />
            </div>
            <div class="form-group">
                <label class="form-label">Paid At (optional)</label>
                <input id="cmPaidAt" type="date" class="form-input" />
            </div>
            <div class="form-group" style="grid-column:1 / -1;">
                <label class="form-label">Vendor (optional)</label>
                <input id="cmVendor" type="text" class="form-input" placeholder="e.g., ABC Services" />
            </div>
            <div class="form-group" style="grid-column:1 / -1;">
                <label class="form-label">Description (optional)</label>
                <textarea id="cmDesc" rows="3" class="form-input" placeholder="Notes about the expense"></textarea>
            </div>
        </div>
        <p class="form-help">Leaving amount empty will only mark the request as Completed without recording an expense.</p>`;
    showGeneralModal('Complete Maintenance', body, [
        { label: 'Complete', success: true, onClick: () => submitCompleteMaintenance(requestId) }
    ]);
}

async function submitCompleteMaintenance(requestId) {
    const amountRaw = document.getElementById('cmAmount')?.value;
    const desc = document.getElementById('cmDesc')?.value?.trim();
    const vendor = document.getElementById('cmVendor')?.value?.trim();
    const paidAt = document.getElementById('cmPaidAt')?.value;
    const payload = {};
    if (amountRaw !== '' && amountRaw !== undefined && amountRaw !== null) payload.amount = Number(amountRaw);
    if (desc) payload.description = desc;
    if (vendor) payload.vendor = vendor;
    if (paidAt) payload.paid_at = paidAt;
    try {
        const resp = await API.call(`/warden/complete-maintenance/${requestId}`, { method: 'POST', body: JSON.stringify(payload) });
        if (resp?.success) {
            UIHelper.showAlert('Maintenance marked as completed' + (payload.amount ? ' and expense saved' : ''), 'success');
            closeGeneralModal();
            await WardenDashboard.loadMaintenanceQueue();
            await WardenDashboard.loadStats();
            await WardenDashboard.loadRecentActivity();
            // If modal still open (reopened), refresh
            if (document.getElementById('generalModal')?.style.display === 'block' && document.getElementById('mqList')) {
                await loadMaintenanceQueueList();
            }
        } else {
            UIHelper.showAlert(resp?.message || 'Failed to complete maintenance', 'error');
        }
    } catch (e) {
        UIHelper.showAlert(e?.message || 'Error completing maintenance', 'error');
    }
}

async function openMaintenanceHistoryModal() {
    const controls = `
        <div class="form-row" style="margin-bottom:1rem;">
            <div class="form-group">
                <label class="form-label">Status</label>
                <select id="mhStatus" class="form-select">
                    <option>All</option>
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                </select>
            </div>
        </div>
        <div id="mhList" class="modal-content-container"></div>
    `;
    showGeneralModal('Maintenance History', controls, [
        { label: 'Refresh', onClick: () => loadMaintenanceHistory(), primary: true }
    ]);
    document.getElementById('mhStatus').addEventListener('change', loadMaintenanceHistory);
    await loadMaintenanceHistory();
}

async function loadMaintenanceHistory() {
    const status = document.getElementById('mhStatus')?.value || 'All';
    const qs = new URLSearchParams();
    if (status && status !== 'All') qs.set('status', status);
    qs.set('limit', '50');
    try {
        const data = await API.call(`/warden/maintenance-history?${qs.toString()}`, { method: 'GET' });
        const rows = data?.data?.requests || [];
        const listEl = document.getElementById('mhList');
        if (!listEl) return;
        if (!rows.length) {
            listEl.innerHTML = '<p style="color:#666; font-style:italic;">No records</p>';
            return;
        }
        listEl.innerHTML = rows.map(r => `
            <div style="padding:0.75rem; border:1px solid #e5e7eb; border-radius:8px; margin:0.5rem 0;">
                <div style="display:flex; justify-content:space-between; gap:1rem;">
                    <div style="flex:1;">
                        <div style="font-weight:600;">${r.description || r.category}</div>
                        <div style="font-size:0.9rem; color:#666;">${r.studentName || ''} · Room ${r.roomNumber || '-'} · ${r.category} · ${r.priority} · ${r.status}</div>
                    </div>
                    <div style="text-align:right; font-size:0.85rem; color:#666;">${new Date(r.createdAt).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        const listEl = document.getElementById('mhList');
        if (listEl) listEl.innerHTML = '<p style="color:#e74c3c;">Failed to load history.</p>';
    }
}

async function openApprovalsModal() {
    try {
        const applications = await API.call('/warden/pending-applications', { method: 'GET' });
        const list = (applications || []).map(app => `
            <div style="padding: 0.75rem; border:1px solid #e3f2fd; border-radius:8px; margin:0.5rem 0; background:#f8fafc;">
                <div style="display:flex; justify-content:space-between; gap:1rem; align-items:center;">
                    <div style="flex:1;">
                        <div style="font-weight:600;">${app.course} · Year ${app.academicYear} · ${app.roomTypePreference}</div>
                        <div style="font-size:0.9rem; color:#666;">Priority: <strong>${app.priority || '—'}</strong> (score ${app.priorityScore ?? '—'}) · Applied ${app.daysSinceApplied > 0 ? app.daysSinceApplied + ' days ago' : 'today'}</div>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                        <button class="btn btn-primary" onclick="openApproveApplicationModal('${app.applicationId}')">Approve</button>
                        <button class="btn btn-secondary" onclick="rejectApplication('${app.applicationId}')">Reject</button>
                    </div>
                </div>
            </div>
        `).join('');
        const html = applications && applications.length ? list : '<p style="color:#666; font-style:italic;">No pending applications</p>';
        showGeneralModal('Pending Applications', html);
    } catch (e) {
        showGeneralModal('Pending Applications', '<p style="color:#e74c3c;">Failed to load applications.</p>');
    }
}

async function openApproveApplicationModal(applicationId) {
    // Build modal to optionally allocate a room on approval
    const body = `
        <div class="form-row">
            <div class="form-group" style="grid-column:1 / -1;">
                <label class="form-label">Allocate Room (optional)</label>
                <select id="aaRoom" class="form-select"><option value="">Do not allocate</option></select>
            </div>
            <div class="form-group" style="grid-column:1 / -1; margin-top:0.25rem;">
                <label class="form-label">Auto-allocate if none selected</label>
                <div>
                    <input type="checkbox" id="aaAuto" /> <label for="aaAuto">Pick best available room automatically</label>
                </div>
            </div>
        </div>
        <p class="form-help">Tip: Leave as "Do not allocate" to only approve the application.</p>`;
    showGeneralModal('Approve Application', body, [
        { label: 'Approve Only', primary: false, onClick: () => approveApplication(applicationId) },
        { label: 'Approve & Allocate', primary: true, onClick: () => approveAndAllocate(applicationId) }
    ]);
    // Preload available rooms for convenience
    await preloadRoomsForApprove();
}

async function preloadRoomsForApprove() {
    try {
        const data = await API.call('/warden/rooms/available', { method: 'GET' });
        const rooms = data?.data?.rooms || [];
        const sel = document.getElementById('aaRoom');
        if (!sel) return;
        sel.innerHTML = '<option value="">Do not allocate</option>' + rooms.map(r => `<option value="${r.roomId}">${r.roomNo} · ${r.hostelName || ''} ${r.hostelType ? '(' + r.hostelType + ')' : ''} · Spots: ${r.availableSpots}</option>`).join('');
    } catch (_) {}
}

async function approveAndAllocate(applicationId) {
    const roomIdVal = document.getElementById('aaRoom')?.value || '';
    const auto = document.getElementById('aaAuto')?.checked || false;
    try {
        const body = roomIdVal ? { roomId: parseInt(roomIdVal) } : (auto ? { autoAllocate: true } : {});
        const response = await API.call(`/warden/approve-application/${applicationId}`, { method: 'POST', body: JSON.stringify(body) });
        if (response?.success) {
            UIHelper.showAlert(roomIdVal ? 'Application approved and room allocated' : 'Application approved', 'success');
            closeGeneralModal();
            await WardenDashboard.loadPendingApprovals();
            await WardenDashboard.loadStats();
        } else {
            UIHelper.showAlert(response?.message || 'Failed to approve application', 'error');
        }
    } catch (e) {
        const msg = e?.message || '';
        if (msg.includes('Student profile not found')) {
            // Offer quick create student flow and then retry
            openQuickCreateStudentForApplication(applicationId);
            return;
        }
        UIHelper.showAlert(msg || 'Error approving application', 'error');
    }
}

// Quick-create student for an application, then retry approve & allocate
async function openQuickCreateStudentForApplication(applicationId) {
    try {
        // Fetch application + user info to prefill
        const resp = await API.call(`/warden/applications/${applicationId}`, { method: 'GET' });
        const app = resp?.application || {};
        const user = resp?.user || {};
        const content = `
            <div class="form-row">
                <div class="form-group" style="grid-column:1 / -1;">
                    <div class="alert" style="background:#fff3cd; color:#664d03; border:1px solid #ffecb5; padding:0.5rem; border-radius:6px; margin-bottom:0.5rem;">
                        No student profile found for this applicant. Create one to proceed with allocation.
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Name</label>
                    <input id="qcsName" type="text" class="form-input" placeholder="Full name" required />
                </div>
                <div class="form-group">
                    <label class="form-label">Reg No</label>
                    <input id="qcsReg" type="text" class="form-input" placeholder="Registration number" required />
                </div>
                <div class="form-group">
                    <label class="form-label">Year of Study</label>
                    <select id="qcsYear" class="form-select">
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Department (optional)</label>
                    <input id="qcsDept" type="text" class="form-input" placeholder="e.g., CSE" />
                </div>
                <div class="form-group">
                    <label class="form-label">Category (optional)</label>
                    <select id="qcsCat" class="form-select">
                        <option value="">—</option>
                        <option>General</option>
                        <option>OBC</option>
                        <option>SC</option>
                        <option>ST</option>
                        <option>Other</option>
                    </select>
                </div>
            </div>
            <p class="form-help">Linked user: <strong>${user?.username || 'Unknown'}</strong> (${user?.email || 'no email'})</p>
        `;
        showGeneralModal('Create Student Profile', content, [
            { label: 'Create & Continue', primary: true, onClick: () => submitQuickCreateStudentForApplication(applicationId, user?.user_id || null) }
        ]);
    } catch (_) {
        const content = '<p style="color:#e74c3c;">Failed to load application details.</p>';
        showGeneralModal('Create Student Profile', content);
    }
}

async function submitQuickCreateStudentForApplication(applicationId, userId) {
    const name = document.getElementById('qcsName')?.value?.trim();
    const reg = document.getElementById('qcsReg')?.value?.trim();
    const year = document.getElementById('qcsYear')?.value;
    const dept = document.getElementById('qcsDept')?.value?.trim();
    const cat = document.getElementById('qcsCat')?.value;
    if (!name || !reg || !year) {
        UIHelper.showAlert('Name, Reg No, and Year of Study are required', 'error');
        return;
    }
    // Try to preserve chosen room for allocation retry
    const roomIdVal = document.getElementById('aaRoom')?.value || '';
    try {
        const payload = {
            user_id: userId || null,
            name,
            reg_no: reg,
            year_of_study: parseInt(year),
            department: dept || undefined,
            category: cat || undefined
        };
        const resp = await API.call('/warden/students', { method: 'POST', body: JSON.stringify(payload) });
        if (resp?.success) {
            UIHelper.showAlert('Student profile created. Proceeding to allocate…', 'success');
            // Retry approve & allocate with previously selected room
            // Close current modal and reopen approve modal or directly call approve
            closeGeneralModal();
            // Reopen the approve modal to keep UX consistent and then auto-trigger
            await openApproveApplicationModal(applicationId);
            if (roomIdVal) {
                const sel = document.getElementById('aaRoom');
                if (sel) sel.value = roomIdVal;
                await approveAndAllocate(applicationId);
            }
        } else {
            UIHelper.showAlert(resp?.message || 'Failed to create student', 'error');
        }
    } catch (e) {
        UIHelper.showAlert(e?.message || 'Error creating student', 'error');
    }
}

// ---- Students: View All ----
async function openStudentsListModal() {
    const content = `
        <div class="form-row" style="margin-bottom:1rem;">
            <div class="form-group">
                <label class="form-label">Name</label>
                <input id="stuSearchName" type="text" class="form-input" placeholder="Search by name" />
            </div>
            <div class="form-group">
                <label class="form-label">Reg No</label>
                <input id="stuSearchReg" type="text" class="form-input" placeholder="Search by reg no" />
            </div>
            <div class="form-group">
                <label class="form-label">Year</label>
                <select id="stuSearchYear" class="form-select">
                    <option value="">All</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                </select>
            </div>
        </div>
        <div id="studentsList" class="modal-content-container"></div>
    `;
    showGeneralModal('Students', content, [
        { label: 'Refresh', onClick: () => loadStudentsIntoList(), primary: true }
    ]);
    document.getElementById('stuSearchName').addEventListener('input', debounce(loadStudentsIntoList, 300));
    document.getElementById('stuSearchReg').addEventListener('input', debounce(loadStudentsIntoList, 300));
    document.getElementById('stuSearchYear').addEventListener('change', loadStudentsIntoList);
    await loadStudentsIntoList();
}

async function loadStudentsIntoList() {
    const name = document.getElementById('stuSearchName')?.value || '';
    const reg = document.getElementById('stuSearchReg')?.value || '';
    const year = document.getElementById('stuSearchYear')?.value || '';
    const qs = new URLSearchParams();
    if (name) qs.set('name', name);
    if (reg) qs.set('reg_no', reg);
    if (year) qs.set('year', year);
    try {
        const data = await API.call(`/warden/students${qs.toString() ? '?' + qs.toString() : ''}`, { method: 'GET' });
        const rows = data?.data?.students || [];
        const listEl = document.getElementById('studentsList');
        if (!listEl) return;
        if (!rows.length) {
            listEl.innerHTML = '<p style="color:#666; font-style:italic;">No students found</p>';
            return;
        }
        listEl.innerHTML = rows.map(s => `
            <div style="padding:0.75rem; border:1px solid #e5e7eb; border-radius:8px; margin:0.5rem 0; display:flex; justify-content:space-between; gap:1rem;">
                <div style="flex:1;">
                    <div style="font-weight:600;">${s.name} · ${s.regNo}</div>
                    <div style="font-size:0.9rem; color:#666;">Year ${s.yearOfStudy}${s.department ? ' · ' + s.department : ''}${typeof s.sgpa === 'number' ? ' · SGPA ' + s.sgpa : ''}</div>
                </div>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn btn-primary" onclick="openStudentDetails(${s.studentId})">Details</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        const listEl = document.getElementById('studentsList');
        if (listEl) listEl.innerHTML = '<p style="color:#e74c3c;">Failed to load students.</p>';
    }
}

async function openStudentDetails(studentId) {
    try {
        const res = await API.call(`/warden/students/${studentId}`, { method: 'GET' });
        const st = res?.data?.student;
        const alloc = res?.data?.allocation;
        const info = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                <div>
                    <div><strong>Name:</strong> ${st.name}</div>
                    <div><strong>Reg No:</strong> ${st.reg_no}</div>
                    <div><strong>Year:</strong> ${st.year_of_study}</div>
                    <div><strong>Dept:</strong> ${st.department || '-'}</div>
                </div>
                <div>
                    <div><strong>Category:</strong> ${st.category || '-'}</div>
                    <div><strong>KEAM Rank:</strong> ${st.keam_rank ?? '-'}</div>
                    <div><strong>SGPA:</strong> ${st.sgpa ?? '-'}</div>
                    <div><strong>User:</strong> ${st.username || '-'} ${st.email ? ' · ' + st.email : ''}</div>
                </div>
            </div>
            <div style="margin-top:1rem; padding:0.75rem; background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px;">
                <div style="font-weight:600; margin-bottom:0.5rem;">Current Allocation</div>
                ${alloc ? `Room ${alloc.rooms?.room_no || alloc.room_no || ''} · ${alloc.rooms?.hostels?.hostel_name || alloc.hostels?.hostel_name || ''} (${alloc.rooms?.hostels?.hostel_type || alloc.hostels?.hostel_type || ''}) · Status ${alloc.status}` : '<em>No active room</em>'}
            </div>
        `;

        const actions = [];
        if (alloc && alloc.status === 'Active') {
            actions.push({ label: 'Vacate Room', danger: true, onClick: () => vacateStudentRoom(studentId) });
        } else {
            actions.push({ label: 'Allocate Room', primary: true, onClick: () => { closeGeneralModal(); openAllocateRoomModal(); } });
        }
        showGeneralModal('Student Details', info, actions);
    } catch (e) {
        UIHelper.showAlert('Failed to load student details', 'error');
    }
}

async function vacateStudentRoom(studentId) {
    if (!confirm('Vacate this student\'s current room?')) return;
    try {
        const resp = await API.call(`/warden/students/${studentId}/vacate`, { method: 'POST' });
        if (resp?.success) {
            UIHelper.showAlert('Room vacated', 'success');
            closeGeneralModal();
            await WardenDashboard.loadRoomSummary();
            await WardenDashboard.loadStats();
        }
    } catch (e) {
        UIHelper.showAlert(e.message || 'Failed to vacate', 'error');
    }
}

// ---- Students: Add Student ----
async function openAddStudentModal() {
    const form = `
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Name</label>
                <input id="stName" type="text" class="form-input" required />
            </div>
            <div class="form-group">
                <label class="form-label">Reg No</label>
                <input id="stReg" type="text" class="form-input" required />
            </div>
            <div class="form-group">
                <label class="form-label">Year of Study</label>
                <select id="stYear" class="form-select" required>
                    <option value="">Select</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">Department</label>
                <input id="stDept" type="text" class="form-input" />
            </div>
            <div class="form-group">
                <label class="form-label">Category</label>
                <select id="stCat" class="form-select">
                    <option value="">Select</option>
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">KEAM Rank</label>
                <input id="stRank" type="number" class="form-input" min="0" />
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label class="form-label">SGPA</label>
                <input id="stSgpa" type="number" step="0.01" min="0" max="10" class="form-input" />
            </div>
            <div class="form-group">
                <label class="form-label">Distance Category</label>
                <select id="stDist" class="form-select">
                    <option value="">Select</option>
                    <option value="<25km"><25km</option>
                    <option value="25-50km">25-50km</option>
                    <option value=">50km">>50km</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Backlogs</label>
                <input id="stBacklogs" type="number" min="0" class="form-input" />
            </div>
        </div>
        <p class="form-help">Tip: Category and Distance Category are restricted to specific values. Student accounts created here will auto-link when the student registers using the same Register Number.</p>
    `;
    showGeneralModal('Add Student', form, [
        { label: 'Create', primary: true, onClick: submitAddStudent }
    ]);
}

async function submitAddStudent() {
    const name = document.getElementById('stName')?.value?.trim();
    const reg_no = document.getElementById('stReg')?.value?.trim();
    const year_of_study = document.getElementById('stYear')?.value;
    const department = document.getElementById('stDept')?.value?.trim();
    const category = document.getElementById('stCat')?.value;
    const keam_rank_raw = document.getElementById('stRank')?.value;
    const sgpa_raw = document.getElementById('stSgpa')?.value;
    const distance_category = document.getElementById('stDist')?.value;
    const backlogs_raw = document.getElementById('stBacklogs')?.value;

    if (!name || !reg_no || !year_of_study) {
        UIHelper.showAlert('Name, Reg No and Year are required', 'error');
        return;
    }

    // Allowed sets
    const allowedCategories = ['General','OBC','SC','ST','Other'];
    const allowedDistances = ['<25km','25-50km','>50km'];

    if (category && !allowedCategories.includes(category)) {
        UIHelper.showAlert('Invalid category selected', 'error');
        return;
    }
    if (distance_category && !allowedDistances.includes(distance_category)) {
        UIHelper.showAlert('Invalid distance category selected', 'error');
        return;
    }

    // Coerce numeric fields
    let payload = {
        name,
        reg_no,
        year_of_study: parseInt(year_of_study),
        department: department || undefined,
        category: category || undefined,
        distance_category: distance_category || undefined,
    };

    if (keam_rank_raw !== undefined && keam_rank_raw !== null && keam_rank_raw !== '') {
        const kr = parseInt(keam_rank_raw);
        if (Number.isNaN(kr) || kr < 0) {
            UIHelper.showAlert('KEAM Rank must be a non-negative integer', 'error');
            return;
        }
        payload.keam_rank = kr;
    }

    if (backlogs_raw !== undefined && backlogs_raw !== null && backlogs_raw !== '') {
        const bl = parseInt(backlogs_raw);
        if (Number.isNaN(bl) || bl < 0) {
            UIHelper.showAlert('Backlogs must be a non-negative integer', 'error');
            return;
        }
        payload.backlogs = bl;
    }

    if (sgpa_raw !== undefined && sgpa_raw !== null && sgpa_raw !== '') {
        const sg = parseFloat(sgpa_raw);
        if (Number.isNaN(sg) || sg < 0 || sg > 10) {
            UIHelper.showAlert('SGPA must be a number between 0 and 10', 'error');
            return;
        }
        payload.sgpa = sg;
    }

    try {
        const resp = await API.call('/warden/students', { method: 'POST', body: JSON.stringify(payload) });
        if (resp?.success) {
            UIHelper.showAlert('Student created', 'success');
            closeGeneralModal();
            // If students list modal is open next, it will fetch fresh on open
        }
    } catch (e) {
        UIHelper.showAlert(e.message || 'Failed to create student', 'error');
    }
}

// ---- Manage Rooms Modal ----
async function openManageRoomsModal() {
    // Filters UI
    const filterHtml = `
        <div class="form-row" style="margin-bottom:1rem;">
            <div class="form-group">
                <label class="form-label">Status</label>
                <select id="roomFilterStatus" class="form-select">
                    <option value="">All</option>
                    <option value="Vacant">Vacant</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Under Maintenance">Under Maintenance</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Search Room No</label>
                <input id="roomFilterSearch" type="text" class="form-input" placeholder="e.g., A-101" />
            </div>
        </div>
        <div id="roomsList" class="modal-content-container"></div>
    `;
    showGeneralModal('Manage Rooms', filterHtml, [
        { label: 'Refresh', onClick: () => loadRoomsIntoList(), primary: true }
    ]);
    // initial load
    await loadRoomsIntoList();
    // attach filter listeners
    document.getElementById('roomFilterStatus').addEventListener('change', loadRoomsIntoList);
    document.getElementById('roomFilterSearch').addEventListener('input', debounce(loadRoomsIntoList, 300));
}

async function loadRoomsIntoList() {
    const status = document.getElementById('roomFilterStatus')?.value || '';
    const search = document.getElementById('roomFilterSearch')?.value || '';
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (search) qs.set('search', search);
    try {
        const data = await API.call(`/warden/rooms${qs.toString() ? '?' + qs.toString() : ''}`, { method: 'GET' });
        const rooms = data?.data?.rooms || [];
        const listEl = document.getElementById('roomsList');
        if (!listEl) return;
        if (!rooms.length) {
            listEl.innerHTML = '<p style="color:#666; font-style:italic;">No rooms found</p>';
            return;
        }
        listEl.innerHTML = rooms.map(r => `
            <div style="padding:0.75rem; border:1px solid #e5e7eb; border-radius:8px; margin:0.5rem 0; display:flex; justify-content:space-between; align-items:center; gap:1rem;">
                <div style="flex:1;">
                    <div style="font-weight:600;">${r.roomNo} · ${r.hostelName || ''} ${r.hostelType ? '(' + r.hostelType + ')' : ''}</div>
                    <div style="font-size:0.9rem; color:#666;">Capacity: ${r.capacity || '-'} · Status: ${r.status}</div>
                </div>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn btn-primary" onclick="setRoomStatus(${r.roomId}, 'Under Maintenance')">Set Maintenance</button>
                    <button class="btn btn-primary" onclick="setRoomStatus(${r.roomId}, 'Vacant')">Mark Vacant</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        document.getElementById('roomsList').innerHTML = '<p style="color:#e74c3c;">Failed to load rooms.</p>';
    }
}

async function setRoomStatus(roomId, status) {
    try {
        await API.call(`/warden/rooms/${roomId}/status`, { method: 'POST', body: JSON.stringify({ status }) });
        await loadRoomsIntoList();
        await WardenDashboard.loadRoomSummary();
    } catch (e) {
        UIHelper.showAlert(e.message || 'Failed to update room status', 'error');
    }
}

// ---- Allocate Room Modal ----
async function openAllocateRoomModal() {
    const content = `
        <div class="form-row">
            <div class="form-group" style="grid-column:1 / -1;">
                <label class="form-label">Approved Applications</label>
                <select id="allocApprovedApp" class="form-select"><option value="">Select approved applicant (optional)</option></select>
                <div class="form-help">Pick an approved applicant to auto-fill student/room preferences, or allocate by Reg No.</div>
            </div>
            <div class="form-group">
                <label class="form-label">Student Reg No</label>
                <input id="allocRegNo" type="text" class="form-input" placeholder="e.g., 22CS001" />
            </div>
            <div class="form-group">
                <label class="form-label">Available Room</label>
                <select id="allocRoomId" class="form-select"><option value="">Loading...</option></select>
            </div>
            <div class="form-group" style="grid-column:1 / -1;">
                <label class="form-label">Auto-allocate</label>
                <div>
                    <input type="checkbox" id="allocAuto" /> <label for="allocAuto">Pick best available room automatically</label>
                </div>
            </div>
        </div>
    `;
    showGeneralModal('Allocate Room', content, [
        { label: 'Allocate', primary: true, onClick: submitAllocateRoom },
    ]);
    await Promise.all([populateAvailableRooms(), populateApprovedApplications()]);
}

async function populateAvailableRooms() {
    try {
        const data = await API.call('/warden/rooms/available', { method: 'GET' });
        const rooms = data?.data?.rooms || [];
        const sel = document.getElementById('allocRoomId');
        if (!sel) return;
        if (!rooms.length) {
            sel.innerHTML = '<option value="">No available rooms</option>';
            return;
        }
        sel.innerHTML = '<option value="">Select a room</option>' + rooms.map(r => `
            <option value="${r.roomId}">${r.roomNo} · ${r.hostelName || ''} ${r.hostelType ? '(' + r.hostelType + ')' : ''} · Spots: ${r.availableSpots}</option>
        `).join('');
    } catch (e) {
        const sel = document.getElementById('allocRoomId');
        if (sel) sel.innerHTML = '<option value="">Failed to load rooms</option>';
    }
}

async function submitAllocateRoom() {
    const regNo = document.getElementById('allocRegNo')?.value?.trim();
    const roomId = document.getElementById('allocRoomId')?.value;
    const appId = document.getElementById('allocApprovedApp')?.value || '';
    const auto = document.getElementById('allocAuto')?.checked || false;
    try {
        let resp;
        if (appId) {
            const payload = roomId ? { applicationId: appId, roomId: parseInt(roomId) } : (auto ? { applicationId: appId, autoAllocate: true } : null);
            if (!payload) {
                UIHelper.showAlert('Select a room or enable Auto-allocate', 'error');
                return;
            }
            resp = await API.call('/warden/allocate-room/by-application', { method: 'POST', body: JSON.stringify(payload) });
        } else {
            if (!regNo) {
                UIHelper.showAlert('Provide student Reg No or choose an approved applicant', 'error');
                return;
            }
            if (!roomId && !auto) {
                UIHelper.showAlert('Select a room or enable Auto-allocate', 'error');
                return;
            }
            if (auto) {
                UIHelper.showAlert('Auto-allocate is only supported for approved applications. Please select a room.', 'info');
                return;
            }
            resp = await API.call('/warden/allocate-room', { method: 'POST', body: JSON.stringify({ studentRegNo: regNo, roomId: parseInt(roomId) }) });
        }
        if (resp?.success) {
            UIHelper.showAlert('Room allocated successfully', 'success');
            closeGeneralModal();
            await WardenDashboard.loadRoomSummary();
            await WardenDashboard.loadStats();
        }
    } catch (e) {
        UIHelper.showAlert(e.message || 'Allocation failed', 'error');
    }
}

async function populateApprovedApplications() {
    try {
        const data = await API.call('/warden/approved-applications', { method: 'GET' });
        const apps = data?.data?.applications || [];
        const sel = document.getElementById('allocApprovedApp');
        if (!sel) return;
        if (!apps.length) {
            sel.innerHTML = '<option value="">No approved applications</option>';
            return;
        }
        sel.innerHTML = '<option value="">Select approved applicant (optional)</option>' + apps.map(a => {
            const tag = a.studentRegNo ? `${a.studentRegNo}` : (a.username || 'user#' + a.userId);
            const info = `${a.course || ''} ${a.academicYear ? '· Y' + a.academicYear : ''}`.trim();
            return `<option value="${a.applicationId}">${tag} ${info ? '· ' + info : ''}</option>`;
        }).join('');
    } catch (e) {
        const sel = document.getElementById('allocApprovedApp');
        if (sel) sel.innerHTML = '<option value="">Failed to load approved applications</option>';
    }
}

// Notification modal functions
function openNotificationsModal() {
    try {
        const modal = document.getElementById('notificationsModal');
        const body = document.getElementById('notificationsModalBody');
        const listEl = document.getElementById('recentAnnouncements');
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

// small debounce utility
function debounce(fn, wait) {
    let t;
    return function(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}