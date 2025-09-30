// Ensure API calls work when page is opened via file:// by prefixing localhost
const API_ORIGIN = (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:')
    ? 'http://localhost:3000'
    : '';
const apiUrl = (path) => `${API_ORIGIN}${path}`;

// Initialize the student dashboard
document.addEventListener('DOMContentLoaded', async () => {
    if (checkAuthentication()) {
        // Check if student profile exists
        await checkStudentProfile();
        StudentDashboard.init();
    }
});

function checkAuthentication() {
    const token = TokenManager.getToken();
    const user = TokenManager.getUser();
    
    if (!token || !user) {
        console.warn('No authentication found');
        window.location.href = 'login.html';
        return false;
    }
    
    // Check if user is a student
    if (user.role !== 'Student') {
        console.warn('Access denied. This page is for students only.');
        window.location.href = getCorrectDashboard(user.role);
        return false;
    }
    
    return true;
}

// Check if student profile exists
async function checkStudentProfile() {
    try {
        const response = await fetch(apiUrl('/api/auth/student-profile'), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TokenManager.getToken()}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data.profile) {
                if (result.data.profile.isStudent === false) {
                    // Student profile doesn't exist
                    alert('⚠️ Please complete your student profile to access hostel services.');
                    window.location.href = 'student-profile-setup.html';
                    return false;
                } else {
                    // Profile exists
                    return true;
                }
            }
        }
        
        if (response.status === 404) {
            // User not found
            alert('❌ User account not found. Please contact administration.');
            window.location.href = 'login.html';
            return false;
        } else if (!response.ok) {
            // Other errors
            console.error('❌ Error checking student profile:', response.status);
            const error = await response.json();
            alert('❌ Error checking profile. Please try again.');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('❌ Network error checking student profile:', error);
        // Continue anyway in case of network issues
        return true;
    }
}

// Helper function to get correct dashboard URL
function getCorrectDashboard(role) {
    switch (role) {
        case 'Student':
            return 'student-dashboard.html';
        case 'Warden':
            return 'warden-dashboard.html';
        case 'SuperAdmin':
        case 'Admin':
            return 'admin-dashboard.html';
        default:
            return 'dashboard.html';
    }
}

const StudentDashboard = {
    init() {
        this.loadUserInfo();
        this.loadRoomInfo();
        this.loadMaintenanceRequests();
        this.loadNotifications();
        this.loadRecentActivity();
        this.setupEventListeners();
        
        // Check allotment status to show/hide allotment registration card
        // Card is visible by default, will be hidden if student is already allocated
        checkAllotmentStatus();
    },

    setupEventListeners() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    TokenManager.clear();
                    window.location.href = 'login.html';
                }
            });
        }
    },

    async loadUserInfo() {
        try {
            // First try to get data from API
            const response = await fetch(apiUrl('/api/auth/student-profile'), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${TokenManager.getToken()}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data.profile) {
                    const profile = result.data.profile;
                    
                    if (profile.isStudent === false) {
                        // User exists but is not set up as a student
                        const updateElement = (id, value) => {
                            const element = document.getElementById(id);
                            if (element) element.textContent = value || 'Not available';
                        };
                        
                        updateElement('studentName', profile.username);
                        updateElement('studentId', 'Not registered');
                        updateElement('course', 'Not registered');
                        updateElement('yearOfStudy', 'Not registered');
                        updateElement('phone', profile.phone);
                        updateElement('email', profile.email);
                        
                        // Update TokenManager with user data
                        TokenManager.setUser(profile);
                        return;
                    }
                    
                    // Update individual info fields with database data
                    const updateElement = (id, value) => {
                        const element = document.getElementById(id);
                        if (element) element.textContent = value || 'Not provided';
                    };
                    
                    updateElement('studentName', profile.name || profile.fullName || profile.username);
                    updateElement('studentId', profile.reg_no || profile.student_id);
                    updateElement('course', profile.department);
                    updateElement('yearOfStudy', profile.year_of_study);
                    updateElement('phone', profile.phone);
                    updateElement('email', profile.email);
                    
                    // Update TokenManager with fresh data
                    TokenManager.setUser(profile);
                    return;
                }
            } else {
                // API call failed, but not necessarily an error - could be authentication issue
            }
            
            // Fallback to TokenManager data if API fails
            const user = TokenManager.getUser();
            
            if (user) {
                const updateElement = (id, value) => {
                    const element = document.getElementById(id);
                    if (element) element.textContent = value || 'Not provided';
                };
                
                updateElement('studentName', user.name || user.fullName || user.username);
                updateElement('studentId', user.id || user.studentId || user.reg_no);
                updateElement('course', user.course || user.department);
                updateElement('yearOfStudy', user.year || user.yearOfStudy || user.year_of_study);
                updateElement('phone', user.phone);
                updateElement('email', user.email);
            }
        } catch (error) {
            console.error('Error loading user info:', error);
            // Fallback to TokenManager data on error
            const user = TokenManager.getUser();
            if (user) {
                const updateElement = (id, value) => {
                    const element = document.getElementById(id);
                    if (element) element.textContent = value || 'Not provided';
                };
                
                updateElement('studentName', user.name || user.fullName || user.username);
                updateElement('studentId', user.id || user.studentId || user.reg_no);
                updateElement('course', user.course || user.department);
                updateElement('yearOfStudy', user.year || user.yearOfStudy || user.year_of_study);
                updateElement('phone', user.phone);
                updateElement('email', user.email);
            }
        }
    },

    async loadRoomInfo() {
        try {
            const roomInfoDiv = document.getElementById('roomInfo');
            if (roomInfoDiv) {
                // Show loading state
                roomInfoDiv.innerHTML = `
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Room Number:</span>
                            <span class="info-value" id="detailRoomNumber">Loading...</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Hostel:</span>
                            <span class="info-value" id="detailHostelName">Loading...</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Room Type:</span>
                            <span class="info-value" id="roomType">Loading...</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Occupancy:</span>
                            <span class="info-value" id="occupancy">Loading...</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Floor:</span>
                            <span class="info-value" id="floor">Loading...</span>
                        </div>
                    </div>
                `;
                
                // Fetch room data from API
                const response = await fetch(apiUrl('/api/allotment/my-room'), {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${TokenManager.getToken()}`
                    }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data.hasAllocation) {
                        const allocation = result.data.allocation;
                        
                        // Update room info with real data
                        document.getElementById('detailRoomNumber').textContent = allocation.roomNumber;
                        document.getElementById('detailHostelName').textContent = allocation.hostelName;
                        document.getElementById('roomType').textContent = `${allocation.capacity}-person room`;
                        document.getElementById('occupancy').textContent = `${allocation.capacity} max`;
                        document.getElementById('floor').textContent = `Floor ${allocation.floor}`;
                    } else {
                        // No allocation found - this is normal, not an error
                        roomInfoDiv.innerHTML = `
                            <div class="info-message" style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
                                <div style="font-size: 2rem; margin-bottom: 10px;">🏠</div>
                                <h4 style="color: #495057; margin-bottom: 10px;">No Room Assigned</h4>
                                <p style="color: #6c757d; margin-bottom: 15px;">
                                    You haven't been assigned a hostel room yet.
                                </p>
                                <p style="color: #6c757d; font-size: 0.9em;">
                                    Please contact the hostel administration for room allocation or check if room allocation applications are open.
                                </p>
                            </div>
                        `;
                    }
                } else {
                    // Actual API error
                    const errorResult = await response.json().catch(() => ({ message: 'Unknown error' }));
                    console.error('❌ API error loading room info:', errorResult);
                    throw new Error(errorResult.message || 'Failed to fetch room data from server');
                }
            }
        } catch (error) {
            console.error('Error loading room info:', error);
            const roomInfoDiv = document.getElementById('roomInfo');
            if (roomInfoDiv) {
                roomInfoDiv.innerHTML = `
                    <div class="error-message" style="text-align: center; padding: 20px; background: #fff5f5; border-radius: 8px; border: 1px solid #fed7d7;">
                        <div style="font-size: 2rem; margin-bottom: 10px;">⚠️</div>
                        <h4 style="color: #e53e3e; margin-bottom: 10px;">Connection Error</h4>
                        <p style="color: #c53030; margin-bottom: 15px;">
                            Unable to load room information from server.
                        </p>
                        <button class="btn btn-outline" onclick="StudentDashboard.loadRoomInfo()" style="background: white; border: 1px solid #e53e3e; color: #e53e3e;">
                            🔄 Try Again
                        </button>
                    </div>
                `;
            }
        }
    },

    async loadMaintenanceRequests() {
        try {
            const maintenanceDiv = document.getElementById('maintenanceRequests');
            if (maintenanceDiv) {
                // Show loading state
                maintenanceDiv.innerHTML = `
                    <div class="loading-message">
                        <p>Loading maintenance requests...</p>
                    </div>
                `;
                
                // Fetch maintenance requests from API
                const response = await fetch(apiUrl('/api/maintenance/my-requests'), {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${TokenManager.getToken()}`
                    }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data.requests) {
                        const requests = result.data.requests;
                        
                        if (requests.length === 0) {
                            // No requests found
                            maintenanceDiv.innerHTML = `
                                <p style="color: #6c757d; text-align: center; margin: 1rem 0;">
                                    📭 No maintenance requests yet.
                                </p>
                                <button class="btn btn-primary" onclick="newMaintenanceRequest()" style="width: 100%;">
                                    🔧 Submit New Request
                                </button>
                            `;
                        } else {
                            // Display requests
                            const requestsHTML = requests.map(request => {
                                const statusColor = {
                                    'Pending': '#e74c3c',
                                    'In Progress': '#f39c12', 
                                    'Completed': '#27ae60',
                                    'Cancelled': '#95a5a6'
                                }[request.status] || '#95a5a6';
                                
                                return `
                                    <div style="padding: 0.75rem; border-left: 3px solid ${statusColor}; margin: 0.5rem 0; background: #f8f9fa; border-radius: 4px;">
                                        <strong>${request.title}</strong>
                                        <div style="font-size: 0.9rem; color: #555; margin: 0.25rem 0;">
                                            ${request.description}
                                        </div>
                                        <div style="font-size: 0.9rem; color: #6c757d; margin-top: 0.25rem;">
                                            Status: ${request.status} | Date: ${new Date(request.date).toLocaleDateString()}
                                            ${request.roomNumber ? ` | Room: ${request.roomNumber}` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('');
                            
                            maintenanceDiv.innerHTML = `
                                ${requestsHTML}
                                <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                                    <button class="btn btn-primary" onclick="newMaintenanceRequest()" style="flex: 1;">New Request</button>
                                </div>
                            `;
                        }
                    } else {
                        throw new Error(result.message || 'Failed to load maintenance requests');
                    }
                } else {
                    // Actual API error
                    const errorResult = await response.json().catch(() => ({ message: 'Unknown error' }));
                    console.error('❌ API error loading maintenance requests:', errorResult);
                    throw new Error(errorResult.message || 'Failed to fetch maintenance requests from server');
                }
            }
        } catch (error) {
            console.error('Error loading maintenance requests:', error);
            const maintenanceDiv = document.getElementById('maintenanceRequests');
            if (maintenanceDiv) {
                maintenanceDiv.innerHTML = `
                    <div class="error-message" style="text-align: center; padding: 20px; background: #fff5f5; border-radius: 8px; border: 1px solid #fed7d7;">
                        <div style="font-size: 2rem; margin-bottom: 10px;">⚠️</div>
                        <h4 style="color: #e53e3e; margin-bottom: 10px;">Connection Error</h4>
                        <p style="color: #c53030; margin-bottom: 15px;">
                            Unable to load maintenance requests from server.
                        </p>
                        <button class="btn btn-outline" onclick="StudentDashboard.loadMaintenanceRequests()" style="background: white; border: 1px solid #e53e3e; color: #e53e3e;">
                            🔄 Try Again
                        </button>
                    </div>
                `;
            }
        }
    },

    async loadNotifications() {
        try {
            const notificationsDiv = document.getElementById('notifications');
            if (notificationsDiv) {
                // Show loading state
                notificationsDiv.innerHTML = `
                    <div class="loading-message">
                        <p>Loading notifications...</p>
                    </div>
                `;
                
                // Fetch notifications from API
                const response = await fetch(apiUrl('/api/notifications/my-notifications'), {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${TokenManager.getToken()}`
                    }
                });
                
                
                if (response.ok) {
                    const result = await response.json();
                    
                    if (result.success && result.data.notifications) {
                        const notifications = result.data.notifications;
                        
                        if (notifications.length === 0) {
                            notificationsDiv.innerHTML = '<p style="color: #666; font-style: italic;">No new notifications</p>';
                            updateNotificationBadge(0);
                            return;
                        }
                        
                        // Display notifications with appropriate styling
                        const notificationsHTML = notifications.map(notif => {
                            const typeColors = {
                                'success': '#27ae60',
                                'warning': '#f39c12', 
                                'info': '#3498db',
                                'error': '#e74c3c'
                            };
                            
                            const typeIcons = {
                                'success': '✅',
                                'warning': '⚠️',
                                'info': 'ℹ️',
                                'error': '❌'
                            };
                            
                            const color = typeColors[notif.type] || '#3498db';
                            const icon = typeIcons[notif.type] || 'ℹ️';
                            
                            return `
                                <div style="padding: 0.75rem; border-left: 3px solid ${color}; margin: 0.5rem 0; background: #f8f9fa; border-radius: 4px;">
                                    <strong>${icon} ${notif.title}</strong>
                                    <div style="font-size: 0.9rem; margin-top: 0.25rem; color: #555;">${notif.message}</div>
                                    <div style="font-size: 0.8rem; color: #666; margin-top: 0.25rem;">
                                        ${new Date(notif.date).toLocaleDateString()}
                                    </div>
                                </div>
                            `;
                        }).join('');
                        
                        notificationsDiv.innerHTML = notificationsHTML;
                        
                        // Update notification badge
                        const unreadCount = notifications.filter(n => !n.isRead).length;
                        updateNotificationBadge(unreadCount || notifications.length);
                    } else {
                        throw new Error(result.message || 'Failed to load notifications');
                    }
                } else {
                    // API error - show fallback message
                    throw new Error('Failed to fetch notifications from server');
                }
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
            const notificationsDiv = document.getElementById('notifications');
            if (notificationsDiv) {
                notificationsDiv.innerHTML = `
                    <div class="error-message" style="text-align: center; padding: 15px; background: #fff5f5; border-radius: 8px; border: 1px solid #fed7d7;">
                        <p style="color: #e53e3e; margin-bottom: 10px;">Unable to load notifications</p>
                        <button class="btn btn-outline" onclick="StudentDashboard.loadNotifications()" style="background: white; border: 1px solid #e53e3e; color: #e53e3e; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                            🔄 Try Again
                        </button>
                    </div>
                `;
            }
            
            // Set badge to 0 on error
            updateNotificationBadge(0);
        }
    },

    async loadRecentActivity() {
        try {
            const response = await fetch(apiUrl('/api/activity/recent'), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${TokenManager.getToken()}`
                }
            });
            let activities = [];
            if (response.ok) {
                const result = await response.json();
                activities = result.activities || [];
            } else {
                activities = ['Could not load recent activity.'];
            }
            const activityDiv = document.getElementById('recentActivity');
            if (activityDiv) {
                const activityHTML = activities.map((activity, index) => `
                    <div style="padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                        <span style="color: #666; font-size: 0.9rem;">• ${activity}</span>
                    </div>
                `).join('');
                activityDiv.innerHTML = activityHTML;
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }
};

// Dashboard Action Functions
function viewRoomDetails() {
    const roomNumber = document.getElementById('detailRoomNumber').textContent;
    const hostelName = document.getElementById('detailHostelName').textContent;
    
    
    let roomDetailsHTML = '';
    
    if (roomNumber === 'Not Assigned') {
        roomDetailsHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🏠</div>
                <h4 style="color: #e67e22; margin-bottom: 1rem;">No Room Assigned</h4>
                <p style="color: #7f8c8d; margin-bottom: 2rem;">You haven't been assigned to a hostel room yet.</p>
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <strong>💡 Next Steps:</strong><br>
                    Apply for hostel allotment if available, or contact the hostel administration for assistance.
                </div>
                <button class="btn btn-primary" onclick="closeRoomDetailsModal(); openAllotmentModal();" style="margin-right: 10px;">
                    Apply for Allotment
                </button>
                <button class="btn btn-secondary" onclick="closeRoomDetailsModal(); contactWarden();">
                    Contact Warden
                </button>
            </div>
        `;
    } else {
        roomDetailsHTML = `
            <div style="text-align: left;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
                    <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #3498db;">
                        <h5 style="color: #3498db; margin-bottom: 0.5rem;">🏠 Basic Information</h5>
                        <p><strong>Room Number:</strong> ${roomNumber}</p>
                        <p><strong>Hostel:</strong> ${hostelName}</p>
                        <p><strong>Floor:</strong> ${document.getElementById('floor').textContent}</p>
                    </div>
                    <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #27ae60;">
                        <h5 style="color: #27ae60; margin-bottom: 0.5rem;">👥 Occupancy Details</h5>
                        <p><strong>Room Type:</strong> ${document.getElementById('roomType').textContent}</p>
                        <p><strong>Current Occupancy:</strong> ${document.getElementById('occupancy').textContent}</p>
                        <p><strong>Status:</strong> <span style="color: #27ae60;">✅ Allocated</span></p>
                    </div>
                </div>
                
                <div style="background: #e8f4fd; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #74b9ff;">
                    <h5 style="color: #0984e3; margin-bottom: 1rem;">📋 Room Facilities</h5>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div>
                            <p>✅ Furnished with bed and study table</p>
                            <p>✅ Wardrobe and storage space</p>
                            <p>✅ 24/7 electricity supply</p>
                        </div>
                        <div>
                            <p>✅ High-speed Wi-Fi</p>
                            <p>✅ Attached/shared bathroom</p>
                            <p>✅ Common area access</p>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 1.5rem; padding: 1rem; background: #fff3cd; border-radius: 8px;">
                    <strong>📞 Need Help?</strong> Contact your floor warden for any room-related issues or maintenance requests.
                </div>
            </div>
        `;
    }
    
    // Populate modal content and show it
    document.getElementById('roomDetailsContent').innerHTML = roomDetailsHTML;
    document.getElementById('roomDetailsModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeRoomDetailsModal() {
    document.getElementById('roomDetailsModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// General purpose modal functions
function showGeneralModal(title, content, actions = []) {
    document.getElementById('generalModalTitle').textContent = title;
    document.getElementById('generalModalContent').innerHTML = content;
    
    // Clear and add action buttons
    const actionsDiv = document.getElementById('generalModalActions');
    actionsDiv.innerHTML = '';
    actions.forEach(action => {
        const button = document.createElement('button');
        button.className = `btn ${action.class || 'btn-primary'}`;
        button.textContent = action.text;
        button.onclick = action.onclick;
        button.style.marginLeft = '10px';
        actionsDiv.appendChild(button);
    });
    
    document.getElementById('generalModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeGeneralModal() {
    document.getElementById('generalModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function newMaintenanceRequest() {
    const requestTypes = [
        '⚡ Electrical Issue', '🚰 Plumbing Issue', '🪑 Furniture Repair', 
        '🧹 Cleaning Request', '❄️ AC/Heating Issue', '🔧 Other'
    ];
    
    const options = requestTypes.map(type => `<option value="${type}">${type}</option>`).join('');
    
    const formHtml = `
        <form id="maintenanceForm" class="modal-form">
            <div class="form-group">
                <label class="form-label">Request Type:</label>
                <select id="requestType" required class="form-select">
                    <option value="">Select Request Type</option>
                    ${options}
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Room Number:</label>
                <input type="text" id="roomNumber" required class="form-input" placeholder="Enter your room number (e.g., A-201)">
            </div>
            
            <div class="form-group">
                <label class="form-label">Description:</label>
                <textarea id="requestDescription" required class="form-textarea" placeholder="Please provide detailed information about the issue, including its location and severity..."></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Priority Level:</label>
                <select id="requestPriority" required class="form-select">
                    <option value="">Select Priority</option>
                    <option value="low">🟢 Low - Can wait a few days</option>
                    <option value="medium">🟡 Medium - Should be addressed soon</option>
                    <option value="high">🟠 High - Needs attention within 24 hours</option>
                    <option value="urgent">🔴 Urgent - Requires immediate attention</option>
                </select>
            </div>
            
            <div class="note-box info">
                <small>
                    <strong>Note:</strong> For urgent issues affecting safety or security, please also contact the warden immediately. 
                    You will receive a tracking number once your request is submitted.
                </small>
            </div>
            
            <div class="btn-group">
                <button type="button" onclick="closeGeneralModal()" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary">🔧 Submit Request</button>
            </div>
        </form>
    `;
    
    showGeneralModal('🔧 New Maintenance Request', formHtml);
    
    // Add form submission handler
    setTimeout(() => {
        const maintenanceForm = document.getElementById('maintenanceForm');
        if (maintenanceForm) {
            maintenanceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const type = document.getElementById('requestType').value;
                const roomNumber = document.getElementById('roomNumber').value;
                const description = document.getElementById('requestDescription').value;
                const priority = document.getElementById('requestPriority').value;
                
                if (type && roomNumber && description && priority) {
                    const requestId = `REQ${Date.now()}`;
                    const successHtml = `
                        <div class="success-container">
                            <div class="success-icon">✅</div>
                            <h4 class="success-title">Request Submitted Successfully!</h4>
                            <div class="success-details">
                                <p><strong>Request ID:</strong> #${requestId}</p>
                                <p><strong>Type:</strong> ${type}</p>
                                <p><strong>Room:</strong> ${roomNumber}</p>
                                <p><strong>Priority:</strong> ${priority.charAt(0).toUpperCase() + priority.slice(1)}</p>
                                <p><strong>Status:</strong> Pending Review</p>
                            </div>
                            <p style="color: #6c757d; margin-bottom: 1rem;">
                                You will receive updates on your request via email and dashboard notifications. 
                                Expected response time based on priority: ${priority === 'urgent' ? '1-2 hours' : priority === 'high' ? '4-8 hours' : '24-48 hours'}.
                            </p>
                            <button onclick="closeGeneralModal()" class="btn btn-success">Close</button>
                        </div>
                    `;
                    showGeneralModal('✅ Request Submitted', successHtml);
                } else {
                    // Show validation error within modal
                    const existingError = document.querySelector('.error-message');
                    if (existingError) existingError.remove();
                    
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message';
                    errorDiv.style.cssText = 'background: #f8d7da; color: #721c24; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #dc3545;';
                    errorDiv.innerHTML = '<strong>Error:</strong> Please fill in all required fields.';
                    maintenanceForm.insertBefore(errorDiv, maintenanceForm.firstChild);
                }
            });
        }
    }, 100);
}

function viewAllRequests() {
    const sampleRequests = [
        { id: '#REQ001', type: 'Electrical Issue', status: 'In Progress', date: '2025-09-18', priority: 'High' },
        { id: '#REQ002', type: 'Plumbing Issue', status: 'Completed', date: '2025-09-15', priority: 'Medium' },
        { id: '#REQ003', type: 'Furniture Repair', status: 'Pending', date: '2025-09-17', priority: 'Low' }
    ];
    
    const requestsHtml = `
        <div class="modal-content-container">
            <p style="margin-bottom: 1.5rem; color: #7f8c8d;">Here are all your maintenance requests:</p>
            ${sampleRequests.map(req => `
                <div class="request-item ${req.priority.toLowerCase()}">
                    <div class="request-header">
                        <strong class="request-id">${req.id} - ${req.type}</strong>
                        <span class="status-badge status-${req.status.toLowerCase().replace(' ', '')}">${req.status}</span>
                    </div>
                    <div style="font-size: 0.9rem; color: #7f8c8d;">
                        <span>Priority: <strong class="priority-${req.priority.toLowerCase()}">${req.priority}</strong></span> | 
                        <span>Date: ${req.date}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    const actions = [
        {
            text: 'New Request',
            class: 'btn-primary',
            onclick: () => { closeGeneralModal(); newMaintenanceRequest(); }
        }
    ];
    
    showGeneralModal('📋 All Maintenance Requests', requestsHtml, actions);
}

async function viewAllNotifications() {
    try {
        console.log('🔔 Loading all notifications modal...');
        
        // Show loading modal first
        showGeneralModal('📢 All Notifications', `
            <div class="loading-message" style="text-align: center; padding: 20px;">
                <p>Loading notifications...</p>
            </div>
        `);
        
        // Fetch notifications from API
        const response = await fetch(apiUrl('/api/notifications/my-notifications'), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TokenManager.getToken()}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('🔔 All notifications API response:', result);
            
            if (result.success && result.data.notifications) {
                const notifications = result.data.notifications;
                
                if (notifications.length === 0) {
                    const emptyHtml = `
                        <div class="modal-content-container" style="text-align: center; padding: 30px;">
                            <div style="font-size: 3rem; margin-bottom: 15px;">📭</div>
                            <h3 style="color: #495057; margin-bottom: 10px;">No Notifications</h3>
                            <p style="color: #6c757d;">You're all caught up! No new notifications at this time.</p>
                        </div>
                    `;
                    showGeneralModal('📢 All Notifications', emptyHtml);
                    return;
                }
                
                const notificationsHtml = `
                    <div class="modal-content-container">
                        <p style="margin-bottom: 1.5rem; color: #7f8c8d;">Your recent notifications:</p>
                        ${notifications.map(notif => {
                            const typeClass = `notification-${notif.type}`;
                            const urgentClass = notif.priority === 'high' ? 'urgent' : '';
                            const typeIcons = {
                                'success': '✅',
                                'warning': '⚠️',
                                'info': 'ℹ️',
                                'error': '❌'
                            };
                            const icon = typeIcons[notif.type] || 'ℹ️';
                            
                            return `
                                <div class="notification-item ${typeClass} ${urgentClass}">
                                    <div class="notification-meta">
                                        <strong style="color: #2c3e50;">${icon} ${notif.title}</strong>
                                        <div>
                                            <span class="notification-date">${new Date(notif.date).toLocaleDateString()}</span>
                                            ${notif.priority === 'high' ? '<span class="urgent-badge">URGENT</span>' : ''}
                                        </div>
                                    </div>
                                    <p style="margin: 0.5rem 0 0 0; color: #555; line-height: 1.4;">${notif.message}</p>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
                
                showGeneralModal('📢 All Notifications', notificationsHtml);
            } else {
                throw new Error(result.message || 'Failed to load notifications');
            }
        } else {
            throw new Error('Failed to fetch notifications from server');
        }
    } catch (error) {
        console.error('Error loading all notifications:', error);
        const errorHtml = `
            <div class="modal-content-container" style="text-align: center; padding: 30px;">
                <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
                <h3 style="color: #e53e3e; margin-bottom: 10px;">Connection Error</h3>
                <p style="color: #c53030; margin-bottom: 20px;">Unable to load notifications from server.</p>
                <button class="btn btn-primary" onclick="viewAllNotifications()" style="background: #e53e3e; border: 1px solid #e53e3e;">
                    🔄 Try Again
                </button>
            </div>
        `;
                showGeneralModal('� All Notifications', errorHtml);
    }
}

// Wrapper function for the notification bell icon
function viewNotifications() {
    // Call the existing viewAllNotifications function
    viewAllNotifications();
    
    // Hide the notification badge when notifications are viewed
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.style.display = 'none';
        badge.textContent = '0';
    }
}

// Function to update notification badge count
function updateNotificationBadge(count = 0) {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count.toString();
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

function editProfile() {
    console.log('👤 editProfile function called');
    
    // Pre-fill the form with current user data
    const user = TokenManager.getUser();
    if (user) {
        document.getElementById('editUsername').value = user.username || '';
        document.getElementById('editEmail').value = user.email || '';
        document.getElementById('editPhone').value = user.phone || '';
        document.getElementById('editFullName').value = user.fullName || user.name || '';
    }
    
    // Show the modal
    document.getElementById('editProfileModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Setup form submission handler
    const profileForm = document.getElementById('editProfileForm');
    if (profileForm && !profileForm.hasAttribute('data-handler-added')) {
        profileForm.setAttribute('data-handler-added', 'true');
        profileForm.addEventListener('submit', handleProfileSubmission);
    }
}

function closeEditProfileModal() {
    document.getElementById('editProfileModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Clear any error/success messages
    const form = document.getElementById('editProfileForm');
    const existingMessage = form.querySelector('.form-error, .form-success');
    if (existingMessage) existingMessage.remove();
}

async function handleProfileSubmission(event) {
    console.log('Profile form submitted!', event);
    event.preventDefault();
    
    const formData = new FormData(event.target);
    // Find the submit button in the modal footer since it's outside the form
    const submitBtn = document.querySelector('button[form="editProfileForm"]') || 
                     document.querySelector('#editProfileModal button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : 'Update Profile';
    
    try {
        // Show loading state
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span>Saving...';
        }
        
        // Clear previous alerts
        dashClearAlerts();
        
        // Collect form data
        const profileData = {
            username: formData.get('username'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            fullName: formData.get('fullName')
        };
        
        // Validate required fields
        if (!profileData.username || !profileData.email || !profileData.phone || !profileData.fullName) {
            // Show error directly in modal without alert
            const errorDiv = document.createElement('div');
            errorDiv.className = 'form-error';
            errorDiv.style.color = '#e74c3c';
            errorDiv.style.backgroundColor = '#fdeaea';
            errorDiv.style.border = '1px solid #e74c3c';
            errorDiv.style.padding = '10px';
            errorDiv.style.borderRadius = '5px';
            errorDiv.style.marginBottom = '15px';
            errorDiv.textContent = 'All fields are required.';
            
            const form = document.getElementById('editProfileForm');
            const existingError = form.querySelector('.form-error');
            if (existingError) existingError.remove();
            form.insertBefore(errorDiv, form.firstChild);
            return;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(profileData.email)) {
            // Show error directly in modal without alert
            const errorDiv = document.createElement('div');
            errorDiv.className = 'form-error';
            errorDiv.style.color = '#e74c3c';
            errorDiv.style.backgroundColor = '#fdeaea';
            errorDiv.style.border = '1px solid #e74c3c';
            errorDiv.style.padding = '10px';
            errorDiv.style.borderRadius = '5px';
            errorDiv.style.marginBottom = '15px';
            errorDiv.textContent = 'Please enter a valid email address.';
            
            const form = document.getElementById('editProfileForm');
            const existingError = form.querySelector('.form-error');
            if (existingError) existingError.remove();
            form.insertBefore(errorDiv, form.firstChild);
            return;
        }
        
        // Call backend API to update profile
        const response = await fetch(apiUrl('/api/auth/profile'), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TokenManager.getToken()}`
            },
            body: JSON.stringify(profileData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            // Show error directly in modal without alert
            const errorDiv = document.createElement('div');
            errorDiv.className = 'form-error';
            errorDiv.style.color = '#e74c3c';
            errorDiv.style.backgroundColor = '#fdeaea';
            errorDiv.style.border = '1px solid #e74c3c';
            errorDiv.style.padding = '10px';
            errorDiv.style.borderRadius = '5px';
            errorDiv.style.marginBottom = '15px';
            errorDiv.textContent = result.message || 'Failed to update profile';
            
            const form = document.getElementById('editProfileForm');
            const existingError = form.querySelector('.form-error');
            if (existingError) existingError.remove();
            form.insertBefore(errorDiv, form.firstChild);
            return;
        }
        
        // Update local user data
        const currentUser = TokenManager.getUser();
        const updatedUser = { ...currentUser, ...profileData };
        TokenManager.setUser(updatedUser);
        
        // Refresh user info display
        StudentDashboard.loadUserInfo();
        
        // Show success message directly in modal
        const successDiv = document.createElement('div');
        successDiv.className = 'form-success';
        successDiv.style.color = '#27ae60';
        successDiv.style.backgroundColor = '#eafaf1';
        successDiv.style.border = '1px solid #27ae60';
        successDiv.style.padding = '10px';
        successDiv.style.borderRadius = '5px';
        successDiv.style.marginBottom = '15px';
        successDiv.textContent = 'Profile updated successfully!';
        
        const form = document.getElementById('editProfileForm');
        const existingMessage = form.querySelector('.form-error, .form-success');
        if (existingMessage) existingMessage.remove();
        form.insertBefore(successDiv, form.firstChild);
        
        // Auto-close modal after 2 seconds
        setTimeout(() => {
            closeEditProfileModal();
        }, 2000);
        
    } catch (error) {
        console.error('Profile update error:', error);
        // Show error directly in modal without alert
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.style.color = '#e74c3c';
        errorDiv.style.backgroundColor = '#fdeaea';
        errorDiv.style.border = '1px solid #e74c3c';
        errorDiv.style.padding = '10px';
        errorDiv.style.borderRadius = '5px';
        errorDiv.style.marginBottom = '15px';
        errorDiv.textContent = 'Failed to connect to server. Please try again.';
        
        const form = document.getElementById('editProfileForm');
        const existingError = form.querySelector('.form-error');
        if (existingError) existingError.remove();
        form.insertBefore(errorDiv, form.firstChild);
    } finally {
        // Reset button safely
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}


function changePassword() {
    document.getElementById('changePasswordModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Setup form submission handler
    const passwordForm = document.getElementById('changePasswordForm');
    if (passwordForm && !passwordForm.hasAttribute('data-handler-added')) {
        passwordForm.setAttribute('data-handler-added', 'true');
        passwordForm.addEventListener('submit', handlePasswordSubmission);
    }
}

function openChangePasswordModal() {
    console.log('🔐 openChangePasswordModal function called');
    
    // Show the modal
    document.getElementById('changePasswordModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Setup form submission handler
    const passwordForm = document.getElementById('changePasswordForm');
    if (passwordForm && !passwordForm.hasAttribute('data-handler-added')) {
        passwordForm.setAttribute('data-handler-added', 'true');
        passwordForm.addEventListener('submit', handlePasswordSubmission);
    }
}

function closePasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    document.getElementById('changePasswordForm').reset();
    dashClearAlerts();
}

function togglePasswordVisibility(fieldId) {
    const field = document.getElementById(fieldId);
    const toggleButton = field.nextElementSibling;
    const eyeOpen = toggleButton.querySelector('.eye-open');
    const eyeClosed = toggleButton.querySelector('.eye-closed');
    
    if (field.type === 'password') {
        field.type = 'text';
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = 'block';
    } else {
        field.type = 'password';
        eyeOpen.style.display = 'block';
        eyeClosed.style.display = 'none';
    }
}

async function handlePasswordSubmission(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');
    const submitBtn = document.getElementById('changePasswordBtn');

    // Clear previous alerts
    dashClearAlerts();

    // Validation
    if (newPassword !== confirmPassword) {
    dashShowAlert('New passwords do not match!', 'error');
        return;
    }

    if (newPassword.length < 6) {
    dashShowAlert('New password must be at least 6 characters long!', 'error');
        return;
    }

    if (currentPassword === newPassword) {
    dashShowAlert('New password must be different from current password!', 'error');
        return;
    }

    try {
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span>Changing Password...';

        // Call backend API to change password
        const response = await fetch(apiUrl('/api/auth/change-password'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TokenManager.getToken()}`
            },
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });

        const result = await response.json();

        if (!response.ok) {
            // Show specific error from backend
            dashShowAlert(result.message || 'Password change failed', 'error');
            
            // If current password is wrong, focus on that field
            if (result.message && result.message.toLowerCase().includes('current password')) {
                document.getElementById('currentPassword').focus();
                document.getElementById('currentPassword').select();
            }
            return;
        }

        // Show success message
    dashShowAlert(result.message || 'Password changed successfully!', 'success');

        // Auto-close modal after 2 seconds
        setTimeout(() => {
            closePasswordModal();
        }, 2000);

    } catch (error) {
        console.error('Password change error:', error);
    dashShowAlert('Failed to connect to server. Please try again.', 'error');
    } finally {
        // Reset button
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Change Password';
    }
}

function dashShowAlert(message, type = 'info') {
    console.log('🚨 showAlert called with:', { message: message.substring(0, 100), type });
    
    // Remove existing alerts
    dashClearAlerts();

    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    console.log('Alert element created with class:', alert.className);
    
    // Handle HTML content
    if (message.includes('<')) {
        alert.innerHTML = message;
    } else {
        alert.textContent = message;
    }

    // Try to insert alert in active modal first, then fallback to main container
    const activeModal = document.querySelector('.modal[style*="block"]');
    if (activeModal) {
    console.log('Inserting alert into active modal');
        const modalContent = activeModal.querySelector('.modal-content');
        modalContent.insertBefore(alert, modalContent.firstChild);
    } else {
        console.log('No active modal, inserting into main container');
        // Insert alert in main container if no modal is active
        const container = document.querySelector('.container');
        if (container) {
            console.log('Found container, inserting alert');
            container.insertBefore(alert, container.firstChild);
        } else {
            console.log('No container found, inserting into body');
            // Fallback: insert at top of body
            document.body.insertBefore(alert, document.body.firstChild);
        }
    }

    console.log('Alert inserted, setting timeout');
    
    // Auto-remove error alerts after 8 seconds, others after 5 seconds
    const timeout = (type === 'error' || type === 'warning') ? 8000 : 5000;
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
            console.log('Alert removed after timeout');
        }
    }, timeout);
}

function dashClearAlerts() {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    });
}

function reportIssue() {
    const formHtml = `
        <form id="reportIssueForm" class="modal-form">
            <div class="form-group">
                <label class="form-label">Issue Category:</label>
                <select id="issueCategory" required class="form-select">
                    <option value="">Select Category</option>
                    <option value="security">🔒 Security Concern</option>
                    <option value="harassment">🚫 Harassment/Bullying</option>
                    <option value="theft">🕵️ Theft/Missing Items</option>
                    <option value="noise">🔊 Noise Complaint</option>
                    <option value="safety">⚠️ Safety Hazard</option>
                    <option value="maintenance">🔧 Maintenance Issue</option>
                    <option value="other">📝 Other</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Description:</label>
                <textarea id="issueDescription" required class="form-textarea large" placeholder="Please provide detailed information about the issue, including when it occurred and any relevant details..."></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Location:</label>
                <input type="text" id="issueLocation" required class="form-input" placeholder="Room number, floor, or specific area where this occurred">
            </div>
            
            <div class="form-group">
                <label class="form-checkbox-container">
                    <input type="checkbox" id="anonymousReport" class="form-checkbox">
                    Submit anonymously (your identity will not be disclosed)
                </label>
            </div>
            
            <div class="note-box warning">
                <small>
                    <strong>Note:</strong> All reports are taken seriously and will be investigated promptly. 
                    For urgent security issues, please also contact campus security immediately.
                </small>
            </div>
            
            <div class="btn-group">
                <button type="button" onclick="closeGeneralModal()" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-danger">🚨 Submit Report</button>
            </div>
        </form>
    `;
    
    showGeneralModal('⚠️ Report Issue', formHtml);
    
    // Add form submission handler
    setTimeout(() => {
        const reportForm = document.getElementById('reportIssueForm');
        if (reportForm) {
            reportForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const category = document.getElementById('issueCategory').value;
                const description = document.getElementById('issueDescription').value;
                const location = document.getElementById('issueLocation').value;
                const anonymous = document.getElementById('anonymousReport').checked;
                if (category && description && location) {
                    try {
                        const response = await fetch(apiUrl('/api/issues/report'), {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${TokenManager.getToken()}`
                            },
                            body: JSON.stringify({
                                category,
                                description,
                                location,
                                anonymous
                            })
                        });
                        if (response.ok) {
                            const result = await response.json();
                            const reportId = result.reportId || `RPT${Date.now()}`;
                            const successHtml = `
                                <div class="success-container">
                                    <div class="success-icon">✅</div>
                                    <h4 class="success-title">Report Submitted Successfully!</h4>
                                    <div class="success-details">
                                        <p><strong>Report ID:</strong> #${reportId}</p>
                                        <p><strong>Status:</strong> Under Review</p>
                                        <p><strong>Expected Response:</strong> Within 24-48 hours</p>
                                    </div>
                                    ${anonymous ? 
                                        '<p style="color: #6c757d;">Your identity will remain anonymous throughout the investigation.</p>' : 
                                        '<p style="color: #6c757d;">You may be contacted for follow-up if additional information is needed.</p>'
                                    }
                                    <button onclick="closeGeneralModal()" class="btn btn-success">Close</button>
                                </div>
                            `;
                            showGeneralModal('✅ Report Submitted', successHtml);
                        } else {
                            const errorMsg = await response.text();
                            alert('Error submitting report: ' + errorMsg);
                        }
                    } catch (err) {
                        alert('Network error submitting report. Please try again.');
                    }
                } else {
                    // Show validation error within modal
                    const existingError = document.querySelector('.error-message');
                    if (existingError) existingError.remove();
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message';
                    errorDiv.style.cssText = 'background: #f8d7da; color: #721c24; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #dc3545;';
                    errorDiv.innerHTML = '<strong>Error:</strong> Please fill in all required fields.';
                    reportForm.insertBefore(errorDiv, reportForm.firstChild);
                }
            });
        }
    }, 100);
}

function viewHostelRules() {
    const rulesHtml = `
        <div class="modal-content-container">
            <div class="info-card orange">
                <h5 style="color: #e67e22; margin-bottom: 0.5rem;">🕘 Timing Rules:</h5>
                <ul class="styled-list">
                    <li>Hostel gates close at 10:00 PM on weekdays</li>
                    <li>Weekend curfew extended to 11:00 PM</li>
                    <li>Late entry requires prior permission</li>
                </ul>
            </div>
            
            <div class="info-card blue">
                <h5 style="color: #3498db; margin-bottom: 0.5rem;">👥 Visitor Policy:</h5>
                <ul class="styled-list">
                    <li>Visitors allowed only in common areas</li>
                    <li>Visitor timings: 9:00 AM - 6:00 PM</li>
                    <li>All visitors must register at reception</li>
                </ul>
            </div>
            
            <div class="info-card pink">
                <h5 style="color: #e74c3c; margin-bottom: 0.5rem;">🚫 Prohibited Items:</h5>
                <ul class="styled-list">
                    <li>Alcohol and illegal substances</li>
                    <li>Cooking appliances (except electric kettles)</li>
                    <li>Pets and animals</li>
                    <li>Loud music equipment</li>
                </ul>
            </div>
            
            <div class="info-card green">
                <h5 style="color: #27ae60; margin-bottom: 0.5rem;">🧹 Cleanliness:</h5>
                <ul class="styled-list">
                    <li>Keep rooms and common areas clean</li>
                    <li>Dispose waste in designated bins</li>
                    <li>Weekly room inspections</li>
                </ul>
            </div>
            
            <div class="info-card yellow">
                <h5 style="color: #856404; margin-bottom: 0.5rem;">💰 Penalties:</h5>
                <ul class="styled-list" style="color: #856404;">
                    <li>Late entry: Warning (1st time), ₹100 fine (repeat)</li>
                    <li>Damage to property: Repair cost + ₹500 fine</li>
                    <li>Noise complaints: ₹200 fine</li>
                </ul>
            </div>
        </div>
    `;
    
    showGeneralModal('📋 Hostel Rules & Regulations', rulesHtml);
}

function contactWarden() {
    const contactInfo = `
        <div class="modal-content-container">
            <div class="info-card blue">
                <h5>🏠 Boys Hostel A - Mr. Rajesh Kumar</h5>
                <div class="contact-info">
                    <div>
                        <p><strong>📞 Phone:</strong> +91 9876543210</p>
                        <p><strong>✉️ Email:</strong> warden.boysA@college.edu</p>
                    </div>
                    <div>
                        <p><strong>📍 Office:</strong> Ground Floor, Boys Hostel A</p>
                        <p><strong>🕐 Hours:</strong> 9:00 AM - 6:00 PM</p>
                    </div>
                </div>
                <div class="btn-group">
                    <a href="tel:+919876543210" class="btn btn-success btn-small action-link">Call</a>
                    <a href="mailto:warden.boysA@college.edu" class="btn btn-primary btn-small action-link">Email</a>
                </div>
            </div>
            
            <div class="info-card purple">
                <h5>🏠 Boys Hostel B - Mr. Suresh Patel</h5>
                <div class="contact-info">
                    <div>
                        <p><strong>📞 Phone:</strong> +91 9876543211</p>
                        <p><strong>✉️ Email:</strong> warden.boysB@college.edu</p>
                    </div>
                    <div>
                        <p><strong>📍 Office:</strong> Ground Floor, Boys Hostel B</p>
                        <p><strong>🕐 Hours:</strong> 9:00 AM - 6:00 PM</p>
                    </div>
                </div>
                <div class="btn-group">
                    <a href="tel:+919876543211" class="btn btn-success btn-small action-link">Call</a>
                    <a href="mailto:warden.boysB@college.edu" class="btn btn-primary btn-small action-link">Email</a>
                </div>
            </div>
            
            <div class="info-card pink">
                <h5>🏠 Girls Hostel A - Mrs. Priya Sharma</h5>
                <div class="contact-info">
                    <div>
                        <p><strong>📞 Phone:</strong> +91 9876543212</p>
                        <p><strong>✉️ Email:</strong> warden.girlsA@college.edu</p>
                    </div>
                    <div>
                        <p><strong>📍 Office:</strong> Ground Floor, Girls Hostel A</p>
                        <p><strong>🕐 Hours:</strong> 9:00 AM - 6:00 PM</p>
                    </div>
                </div>
                <div class="btn-group">
                    <a href="tel:+919876543212" class="btn btn-success btn-small action-link">Call</a>
                    <a href="mailto:warden.girlsA@college.edu" class="btn btn-primary btn-small action-link">Email</a>
                </div>
            </div>
            
            <div class="info-card orange">
                <h5>🏠 Girls Hostel B - Mrs. Meena Gupta</h5>
                <div class="contact-info">
                    <div>
                        <p><strong>📞 Phone:</strong> +91 9876543213</p>
                        <p><strong>✉️ Email:</strong> warden.girlsB@college.edu</p>
                    </div>
                    <div>
                        <p><strong>📍 Office:</strong> Ground Floor, Girls Hostel B</p>
                        <p><strong>🕐 Hours:</strong> 9:00 AM - 6:00 PM</p>
                    </div>
                </div>
                <div class="btn-group">
                    <a href="tel:+919876543213" class="btn btn-success btn-small action-link">Call</a>
                    <a href="mailto:warden.girlsB@college.edu" class="btn btn-primary btn-small action-link">Email</a>
                </div>
            </div>
            
            <div class="emergency-card">
                <h5>🚨 Emergency Contact</h5>
                <p>For urgent issues after office hours</p>
                <a href="tel:+919876543200" class="btn btn-danger btn-large">📞 +91 9876543200</a>
            </div>
        </div>
    `;
    
    showGeneralModal('📞 Contact Warden', contactInfo);
}

function viewFacilities() {
    const facilitiesHtml = `
        <div class="modal-content-container">
            <div class="info-card blue">
                <h5>🛏️ Room Facilities</h5>
                <div class="grid-auto">
                    <ul class="styled-list">
                        <li>Furnished rooms with bed, study table, and wardrobe</li>
                        <li>24/7 electricity and water supply</li>
                    </ul>
                    <ul class="styled-list">
                        <li>High-speed Wi-Fi connectivity</li>
                        <li>Attached bathrooms (select rooms)</li>
                    </ul>
                </div>
            </div>
            
            <div class="info-card orange">
                <h5>🍽️ Dining Facilities</h5>
                <div class="grid-2">
                    <div>
                        <h6 style="color: #e67e22; margin-bottom: 0.5rem;">Meal Options:</h6>
                        <ul class="styled-list compact">
                            <li>Nutritious vegetarian meals</li>
                            <li>Non-vegetarian options</li>
                            <li>Special dietary requirements</li>
                        </ul>
                    </div>
                    <div>
                        <h6 style="color: #e67e22; margin-bottom: 0.5rem;">Timings:</h6>
                        <ul class="styled-list compact">
                            <li>Breakfast: 7:00 AM - 9:00 AM</li>
                            <li>Lunch: 12:00 PM - 2:00 PM</li>
                            <li>Dinner: 7:00 PM - 9:00 PM</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="info-card green">
                <h5>🏃‍♂️ Recreation & Sports</h5>
                <div class="grid-auto-200">
                    <div>
                        <h6 style="color: #27ae60; margin-bottom: 0.5rem;">Indoor:</h6>
                        <ul class="styled-list compact">
                            <li>Common room with TV</li>
                            <li>Indoor games room</li>
                            <li>Fully equipped gym</li>
                        </ul>
                    </div>
                    <div>
                        <h6 style="color: #27ae60; margin-bottom: 0.5rem;">Outdoor:</h6>
                        <ul class="styled-list compact">
                            <li>Basketball court</li>
                            <li>Badminton court</li>
                            <li>Cricket ground</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="info-card pink">
                <h5>🔧 Essential Services</h5>
                <div class="grid-auto">
                    <ul class="styled-list">
                        <li>24/7 security & CCTV surveillance</li>
                        <li>Laundry and cleaning services</li>
                        <li>Medical first aid facility</li>
                    </ul>
                    <ul class="styled-list">
                        <li>Maintenance and repair services</li>
                        <li>Postal and courier services</li>
                        <li>Reading room and library</li>
                    </ul>
                </div>
            </div>
            
            <div class="info-card gradient">
                <h5>✨ Additional Amenities</h5>
                <div class="facility-tags">
                    <span class="facility-tag">🚗 Parking Facility</span>
                    <span class="facility-tag">🏠 Guest Rooms</span>
                    <span class="facility-tag">💳 ATM Facility</span>
                    <span class="facility-tag">📝 Stationery Shop</span>
                </div>
            </div>
        </div>
    `;
    
    showGeneralModal('🏢 Hostel Facilities', facilitiesHtml);
}

// Allotment Registration Functions
function openAllotmentModal() {
    const modal = document.getElementById('allotmentModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Auto-fill form fields from dashboard data
        setTimeout(() => {
            copyDashboardToForm();
        }, 300);
        
            // Load hostels from database (use API helper to include auth header)
            loadHostelOptions();
    }
}

// Simple auto-fill using only database data
// Copy data from dashboard spans to form inputs
function copyDashboardToForm() {
    console.log('🔄 Starting copyDashboardToForm (using TokenManager data)...');
    
    // Get user data from TokenManager as primary source
    const user = TokenManager.getUser();
    console.log('� TokenManager user data:', user);
    
    if (!user) {
        console.error('❌ No user data available in TokenManager');
        return;
    }
    
    // Fill the form input fields using more specific selectors
    const fillFormField = (inputId, value) => {
        const formInput = document.querySelector(`#allotmentForm #${inputId}`);
        console.log(`🔧 Trying to fill ${inputId}: formInput=${!!formInput}, value="${value}" (${typeof value})`);
        
        if (formInput && value !== undefined && value !== null && value !== 'Loading...' && value !== 'Not provided' && value !== '') {
            formInput.value = String(value);
            formInput.removeAttribute('placeholder');
            console.log(`✅ Successfully filled ${inputId} with: "${formInput.value}"`);
        } else {
            console.log(`❌ Could not fill ${inputId}: element=${!!formInput}, value="${value}" (${typeof value})`);
            
            // If form input exists but value is invalid, try to clear any existing invalid value
            if (formInput && (value === undefined || value === null || value === '')) {
                formInput.value = '';
                console.log(`🧹 Cleared ${inputId} due to invalid value`);
            }
        }
    };
    
    // Fill the basic form fields using TokenManager data
    console.log('📝 Filling form fields from TokenManager...');
    console.log('📞 Phone number from TokenManager:', user.phone);
    fillFormField('studentId', user.reg_no || user.student_id || user.id);
    fillFormField('studentName', user.name || user.fullName || user.username);
    fillFormField('course', user.department || user.course);
    fillFormField('yearOfStudy', user.year_of_study || user.year);
    fillFormField('phoneNumber', user.phone ? user.phone.replace(/\s+/g, '') : '');
    fillFormField('studentEmail', user.email);
    
    // Fill academic score based on year of study from TokenManager
    const userYear = user.year_of_study || user.year;
    if (userYear) {
        const year = parseInt(userYear);
        if (year === 1 && user.keam_rank) {
            // For 1st year students, use KEAM rank
            fillFormField('academicScore', user.keam_rank);
            console.log('✅ Used KEAM rank for 1st year student');
        } else if (year > 1 && user.sgpa) {
            // For 2nd year and above, use SGPA
            fillFormField('academicScore', user.sgpa);
            console.log('✅ Used SGPA for upper year student');
        } else {
            console.log('❌ No academic score available or year not determined');
        }
    }
    
    // Fill distance information if available in user data
    if (user) {
        // Check if user has distance data
        if (user.distance_from_home || user.distanceFromHome) {
            fillFormField('distanceFromHome', user.distance_from_home || user.distanceFromHome);
            fillFormField('distanceUnit', user.distance_unit || user.distanceUnit || 'km');
            console.log('✅ Used existing distance data from user profile');
        } else if (user.distance_category) {
            // Handle distance category mapping (if it exists)
            const distanceMap = {
                '<25km': { distance: '20', unit: 'km' },
                '25-50km': { distance: '35', unit: 'km' }, 
                '>50km': { distance: '75', unit: 'km' }
            };
            const mapping = distanceMap[user.distance_category];
            if (mapping) {
                fillFormField('distanceFromHome', mapping.distance);
                fillFormField('distanceUnit', mapping.unit);
                console.log(`✅ Used distance category mapping: ${user.distance_category}`);
            }
        } else {
            // Set default distance unit to km if no distance data exists
            fillFormField('distanceUnit', 'km');
            console.log('✅ Set default distance unit to km');
        }
    }
}


function closeAllotmentModal() {
    const modal = document.getElementById('allotmentModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        // Clear form
        document.getElementById('allotmentForm').reset();
        dashClearAlerts();
    }
}


// Load hostel options from database
async function loadHostelOptions() {
    try {
        console.log('🏨 Loading hostel options...');
        // Use the centralized API.call which adds Authorization header when token is present
        const hostels = await API.call('/allotment/hostels', { method: 'GET' });
        console.log(`✅ Loaded ${hostels.length} hostel options`);
        // Populate hostel select with returned hostels
        const select = document.getElementById('hostelPreference');
        if (select) {
            // Keep the default placeholder option
            select.innerHTML = '<option value="">Select Hostel</option>';
            if (Array.isArray(hostels) && hostels.length > 0) {
                hostels.forEach(h => {
                    const opt = document.createElement('option');
                    opt.value = h.id || h.hostel_id || h.hostelId;
                    opt.textContent = h.name || h.hostel_name || `Hostel ${opt.value}`;
                    select.appendChild(opt);
                });
            } else {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = 'No hostels available';
                select.appendChild(opt);
            }
        }
    } catch (error) {
        console.error('❌ Error loading hostels:', error);
        dashShowAlert('Error loading hostel options', 'error');
    }
}

function viewAllotmentGuidelines() {
    const guidelinesHtml = `
        <div class="modal-content-container">
            <div class="info-card light-blue">
                <h5 style="color: #1976d2; margin-bottom: 1rem;">📋 Application Guidelines</h5>
                <ul class="styled-list spaced">
                    <li>All fields marked with <span style="color: #e74c3c;">*</span> are mandatory</li>
                    <li>Room allotment is subject to availability at time of processing</li>
                    <li>Preferences are considered but cannot be guaranteed</li>
                    <li>Medical needs require proper documentation from registered physician</li>
                </ul>
            </div>
            
            <div class="info-card orange">
                <h5 style="color: #f57c00; margin-bottom: 1rem;">💰 Payment & Timeline</h5>
                <ul class="styled-list spaced">
                    <li>Fee payment must be completed within <strong>7 days</strong> of allotment confirmation</li>
                    <li>Late payment may result in forfeiture of allotted room</li>
                    <li>Refund policy applies as per college guidelines</li>
                </ul>
            </div>
            
            <div class="info-card green">
                <h5 style="color: #388e3c; margin-bottom: 1rem;">🔄 Change Requests</h5>
                <ul class="styled-list spaced">
                    <li>Room change requests can be submitted after <strong>30 days</strong> of initial allotment</li>
                    <li>Valid reasons required for room change approval</li>
                    <li>Subject to room availability and administrative approval</li>
                </ul>
            </div>
            
            <div class="info-card pink">
                <h5 style="color: #c2185b; margin-bottom: 1rem;">📞 Contact Support</h5>
                <ul class="styled-list spaced">
                    <li>For technical issues with the application form</li>
                    <li>For questions about room preferences</li>
                    <li>For medical accommodation requests</li>
                </ul>
                <div class="btn-group center">
                    <a href="mailto:hostel@college.edu" class="btn btn-danger">📧 Contact Hostel Office</a>
                </div>
            </div>
        </div>
    `;
    
    showGeneralModal('📋 Hostel Allotment Guidelines', guidelinesHtml);
}

// Handle allotment form submission
document.addEventListener('DOMContentLoaded', () => {
    const allotmentForm = document.getElementById('allotmentForm');
    if (allotmentForm) {
        allotmentForm.addEventListener('submit', handleAllotmentSubmission);
    }
});

async function handleAllotmentSubmission(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submitAllotmentBtn');
    const originalText = submitBtn.textContent;
    
    try {
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span>Submitting...';
        
        // Clear previous alerts
        dashClearAlerts();
        
        // Ensure auto-fill has completed before validation
        console.log('🔄 Running auto-fill before validation...');
        copyDashboardToForm();
        
        // Small delay to ensure DOM updates
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Validate form
        if (!validateAllotmentForm()) {
            return;
        }
        
        // Collect form data
        const formData = collectAllotmentFormData();
        // Add correct performance_type for backend
        let performance_type;
        if (formData.yearOfStudy === '1') {
            performance_type = 'keam_rank';
        } else {
            performance_type = 'cgpa';
        }
        // Build payload for backend
        const payload = {
            ...formData,
            performance_type: performance_type,
            performance_score: formData.academicScore
        };
        console.log('📤 Sending form data to backend:', payload);

        // Submit to backend
        const response = await fetch(apiUrl('/api/allotment/register'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TokenManager.getToken()}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log('📥 Backend response:', { status: response.status, result: result });

        if (response.ok) {
            dashShowAlert('Allotment application submitted successfully! You will be notified once processed.', 'success');
            setTimeout(() => {
                closeAllotmentModal();
                // Refresh dashboard to show updated status
                location.reload();
            }, 2000);
        } else {
            dashShowAlert(result.message || 'Failed to submit application. Please try again.', 'error');
        }
        
    } catch (error) {
        console.error('Allotment submission error:', error);
        dashShowAlert('Network error. Please check your connection and try again.', 'error');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function validateAllotmentForm() {
    console.log('🔍 Starting form validation...');
    const requiredFields = [
        'studentId', 'studentName', 'course', 'yearOfStudy', 'academicScore', 'phoneNumber', 'studentEmail',
        'emergencyContactName', 'emergencyContactPhone', 'relationship', 'homeAddress', 
        'distanceFromHome', 'distanceUnit', 'hostelPreference', 'roomType'
    ];
    
    for (const fieldId of requiredFields) {
        // Use more specific selector to avoid ID conflicts with dashboard elements
        const field = document.querySelector(`#allotmentForm #${fieldId}`) || document.getElementById(fieldId);
        console.log(`🔍 Validating field '${fieldId}':`, {
            element: field,
            tagName: field?.tagName,
            type: field?.type,
            id: field?.id,
            name: field?.name,
            value: field?.value,
            form: field?.form?.id,
            selector: `#allotmentForm #${fieldId}`
        });
        
        if (!field) {
            console.error(`Field with ID '${fieldId}' not found in form`);
            dashShowAlert(`Required field '${fieldId}' is missing from the form.`, 'error');
            return false;
        }
        
        const value = field.value;
        console.log(`📝 Checking field '${fieldId}': value="${value}", length=${value?.length}`);
        
        if (!value || !value.trim()) {
            const label = field.previousElementSibling;
            const fieldName = label ? label.textContent.replace(' *', '') : fieldId;
            console.error(`❌ Validation failed for '${fieldId}': empty or whitespace only`);
            dashShowAlert(`Please fill in the ${fieldName} field.`, 'error');
            field.focus();
            return false;
        }
    }
    
    // Validate academic score based on year
    const year = document.getElementById('yearOfStudy').value;
    const academicScore = document.getElementById('academicScore').value.trim();
    
    if (year === '1') {
        // For 1st year, validate rank (should be a positive integer)
        if (!/^\d+$/.test(academicScore) || parseInt(academicScore) <= 0) {
            dashShowAlert('Please enter a valid entrance exam rank (positive number).', 'error');
            document.getElementById('academicScore').focus();
            return false;
        }
    } else {
        // For other years, validate CGPA (should be between 0 and 10)
        const cgpa = parseFloat(academicScore);
        if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
            dashShowAlert('Please enter a valid CGPA between 0 and 10.', 'error');
            document.getElementById('academicScore').focus();
            return false;
        }
    }
    
    // Check if terms are agreed
    const agreeTerms = document.getElementById('agreeTerms');
    if (!agreeTerms.checked) {
        dashShowAlert('Please agree to the hostel terms and conditions.', 'error');
        agreeTerms.focus();
        return false;
    }
    
    // Validate phone numbers
    const phoneRegex = /^[\+]?[1-9][\d]{9,14}$/;
    const phoneNumber = document.getElementById('phoneNumber').value.replace(/\s+/g, ''); // Remove spaces
    const emergencyPhone = document.getElementById('emergencyContactPhone').value.replace(/\s+/g, ''); // Remove spaces
    
    console.log('📞 Phone validation:', {
        originalPhoneNumber: document.getElementById('phoneNumber').value,
        cleanedPhoneNumber: phoneNumber,
        phoneLength: phoneNumber?.length,
        phoneRegexTest: phoneRegex.test(phoneNumber),
        regex: phoneRegex.toString()
    });
    
    if (!phoneRegex.test(phoneNumber)) {
        dashShowAlert('Please enter a valid phone number.', 'error');
        document.getElementById('phoneNumber').focus();
        return false;
    }
    
    if (!phoneRegex.test(emergencyPhone)) {
        dashShowAlert('Please enter a valid emergency contact phone number.', 'error');
        document.getElementById('emergencyContactPhone').focus();
        return false;
    }
    
    return true;
}

function collectAllotmentFormData() {
    // Helper function to safely get element value from the modal form
    const getFormValue = (id, defaultValue = '') => {
        // Prefer modal form input
        let element = document.querySelector(`#allotmentForm #${id}`);
        if (!element) {
            // Fallback to global ID
            element = document.getElementById(id);
        }
        if (!element) {
            console.error(`Element with ID '${id}' not found in collectAllotmentFormData`);
            return defaultValue;
        }
        return element.value || defaultValue;
    };

    return {
        studentId: getFormValue('studentId').trim(),
        studentName: getFormValue('studentName').trim(),
        course: getFormValue('course').trim(),
        yearOfStudy: getFormValue('yearOfStudy'),
        academicScore: getFormValue('academicScore').trim(),
        phoneNumber: getFormValue('phoneNumber').trim(),
        studentEmail: getFormValue('studentEmail').trim(),
        emergencyContactName: getFormValue('emergencyContactName').trim(),
        emergencyContactPhone: getFormValue('emergencyContactPhone').trim(),
        relationship: getFormValue('relationship'),
        homeAddress: getFormValue('homeAddress').trim(),
        distanceFromHome: parseFloat(getFormValue('distanceFromHome', '0')),
        distanceUnit: getFormValue('distanceUnit'),
        medicalInfo: getFormValue('medicalInfo').trim() || null,
        specialRequests: getFormValue('specialRequests').trim() || null,
        hostelPreference: getFormValue('hostelPreference'),
        roomType: getFormValue('roomType'),
        floorPreference: getFormValue('floorPreference') || null,
        additionalNotes: getFormValue('additionalNotes').trim() || null
    };
}

// Check allotment status and show/hide allotment card
async function checkAllotmentStatus() {
    console.log('🔍 Checking allotment status...');
    const token = TokenManager.getToken();
    console.log('🔑 Token available:', !!token);
    
    try {
        const response = await fetch(apiUrl('/api/allotment/status'), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('📄 Allotment data:', data);
            updateAllotmentDisplay(data);
        } else {
            const errorText = await response.text();
            console.error('❌ Failed to fetch allotment status:', response.status, errorText);
            // Show allotment card and hide maintenance card by default if can't fetch status
            console.log('📝 Showing allotment card due to API error');
            const allotmentCard = document.getElementById('allotmentCard');
            const maintenanceCard = document.getElementById('maintenanceCard');
            if (allotmentCard) {
                allotmentCard.style.display = 'block';
            }
            if (maintenanceCard) {
                maintenanceCard.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('❌ Error checking allotment status:', error);
        // Show allotment card and hide maintenance card by default if error
        console.log('📝 Showing allotment card due to network error');
        const allotmentCard = document.getElementById('allotmentCard');
        const maintenanceCard = document.getElementById('maintenanceCard');
        if (allotmentCard) {
            allotmentCard.style.display = 'block';
        }
        if (maintenanceCard) {
            maintenanceCard.style.display = 'none';
        }
    }
}

function updateAllotmentDisplay(allotmentData) {
    console.log('🏠 Updating allotment display with data:', allotmentData);
    const allotmentCard = document.getElementById('allotmentCard');
    const maintenanceCard = document.getElementById('maintenanceCard');
    const roomDetails = document.getElementById('roomDetails');
    
    if (!allotmentCard) {
        console.error('❌ Allotment card element not found!');
        return;
    }
    
    if (allotmentData.isAllocated) {
        console.log('✅ Student is allocated - hiding allotment card, showing maintenance');
        // Student is already allocated - hide allotment card and show room details
        allotmentCard.style.display = 'none';
        
        // Show maintenance card for allocated students
        if (maintenanceCard) {
            maintenanceCard.style.display = 'block';
        }
        
        // Update room information
        document.getElementById('detailRoomNumber').textContent = allotmentData.roomNumber || 'Not Available';
        document.getElementById('detailHostelName').textContent = allotmentData.hostelName || 'Not Available';
        document.getElementById('roomType').textContent = allotmentData.roomType || '---';
        document.getElementById('occupancy').textContent = allotmentData.occupancy || '---';
        document.getElementById('floor').textContent = allotmentData.floor || '---';
        
        // Update quick stats
        document.getElementById('roomNumber').textContent = allotmentData.roomNumber || '---';
        document.getElementById('hostelName').textContent = allotmentData.hostelName || '---';
        
    } else {
        console.log('📝 Student is not allocated - showing allotment card, hiding maintenance');
        // Student is not allocated - show allotment card
        allotmentCard.style.display = 'block';
        
        // Hide maintenance card for non-allocated students
        if (maintenanceCard) {
            maintenanceCard.style.display = 'none';
        }
        
        if (allotmentData.applicationStatus) {
            console.log('📋 Application status found:', allotmentData.applicationStatus);
            // Application is in progress
            const statusText = allotmentData.applicationStatus === 'pending' ? 'Application Pending' : 
                              allotmentData.applicationStatus === 'processing' ? 'Under Review' : 'Not Allocated';
            const statusClass = allotmentData.applicationStatus === 'pending' ? 'status-processing' : 'status-pending';
            
            const statusBadge = allotmentCard.querySelector('.status-badge');
            const cardText = allotmentCard.querySelector('p');
            const primaryBtn = allotmentCard.querySelector('.btn-primary');
            
            if (statusBadge) statusBadge.textContent = statusText;
            if (statusBadge) statusBadge.className = `status-badge ${statusClass}`;
            if (cardText) cardText.textContent = 'Your allotment application is being processed.';
            if (primaryBtn) primaryBtn.textContent = 'View Application Status';
        } else {
            console.log('📝 No application status - showing default allotment card');
        }
    }
}

// Toggle academic field based on year selection
function toggleAcademicField() {
    const yearSelect = document.getElementById('yearOfStudy');
    const academicScoreLabel = document.getElementById('academicScoreLabel');
    const academicScoreInput = document.getElementById('academicScore');
    const academicScoreHelp = document.getElementById('academicScoreHelp');
    
    if (yearSelect && academicScoreLabel && academicScoreInput && academicScoreHelp) {
        const selectedYear = yearSelect.value;
        
        if (selectedYear === '1') {
            academicScoreLabel.textContent = 'Entrance Exam Rank *';
            academicScoreInput.placeholder = 'Enter your entrance exam rank';
            academicScoreHelp.textContent = 'Enter your rank from entrance examination (e.g., JEE, NEET, etc.)';
        } else if (selectedYear) {
            academicScoreLabel.textContent = 'CGPA *';
            academicScoreInput.placeholder = 'Enter your CGPA (e.g., 8.5)';
            academicScoreHelp.textContent = 'Enter your current CGPA out of 10';
        } else {
            academicScoreLabel.textContent = 'Rank/CGPA *';
            academicScoreInput.placeholder = 'Enter rank (for 1st year) or CGPA';
            academicScoreHelp.textContent = 'For 1st year: Enter your rank. For other years: Enter your CGPA';
        }
    }
}

// Global functions for HTML
function logout() {
    Auth.logout();
}