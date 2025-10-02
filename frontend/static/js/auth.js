// API Base URL
// Use same-origin in hosted environments (Render) and localhost when opened via file:// or local dev
const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.protocol !== 'file:')
    ? '/api'
    : 'http://localhost:3000/api';

// Route resolver: maps app routes to HTML files when opened via file://
function resolveRoute(path) {
    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
        switch (path) {
            case '/login': return 'login.html';
            case '/register': return 'register.html';
            case '/admin': return 'admin-dashboard.html';
            case '/student': return 'student-dashboard.html';
            case '/warden': return 'warden-dashboard.html';
            case '/': default: return 'login.html';
        }
    }
    return path;
}
// Expose globally for other scripts
window.resolveRoute = resolveRoute;

// Password toggle functionality
function togglePassword(fieldId) {
    const passwordField = document.getElementById(fieldId);
    const toggleButton = passwordField.parentNode.querySelector('.password-toggle');
    const eyeOpen = toggleButton.querySelector('.eye-open');
    const eyeClosed = toggleButton.querySelector('.eye-closed');
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = 'block';
        toggleButton.setAttribute('aria-label', 'Hide password');
    } else {
        passwordField.type = 'password';
        eyeOpen.style.display = 'block';
        eyeClosed.style.display = 'none';
        toggleButton.setAttribute('aria-label', 'Show password');
    }
}

// Utility functions
const showAlert = (message, type = 'info') => {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Add new alert at the top of the form
    const form = document.querySelector('form');
    if (form) {
        form.insertBefore(alertDiv, form.firstChild);
    }
    
    // Auto-remove alert after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
};

const showLoading = (button, show = true) => {
    if (show) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span>Loading...';
    } else {
        button.disabled = false;
        button.innerHTML = button.getAttribute('data-original-text') || 'Submit';
    }
};

const validateForm = (formData, requiredFields) => {
    const errors = [];
    
    for (const field of requiredFields) {
        if (!formData[field] || formData[field].trim() === '') {
            errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
        }
    }
    
    // Email validation
    if (formData.email && formData.email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            errors.push('Please enter a valid email address');
        }
    }
    
    // Password validation
    if (formData.password && formData.password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }
    
    return errors;
};

// Token management
// Authentication JavaScript with Professional Enhancements

class TokenManager {
    static setToken(token) {
        localStorage.setItem('auth_token', token);
    }
    
    static getToken() {
        return localStorage.getItem('auth_token');
    }
    
    static removeToken() {
        localStorage.removeItem('auth_token');
    }
    
    static isLoggedIn() {
        return !!this.getToken();
    }
    
    // Alias methods for compatibility
    static set(token) {
        return this.setToken(token);
    }
    
    static get() {
        return this.getToken();
    }
    
    static clear() {
        this.removeToken();
        this.removeUser();
    }
    
    // User management methods
    static setUser(user) {
        localStorage.setItem('auth_user', JSON.stringify(user));
    }
    
    static getUser() {
        const user = localStorage.getItem('auth_user');
        return user ? JSON.parse(user) : null;
    }
    
    static removeUser() {
        localStorage.removeItem('auth_user');
    }
}

class UIHelper {
    static showLoading(button) {
        const originalText = button.textContent;
        button.innerHTML = '<span class="spinner"></span>Processing...';
        button.disabled = true;
        button.originalText = originalText;
    }
    
    static hideLoading(button) {
        button.innerHTML = button.originalText || 'Submit';
        button.disabled = false;
    }
    
    static showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `
            <strong>${type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}</strong>
            ${message}
        `;
        
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());
        
        // Insert new alert at the top of the form
        const form = document.querySelector('form');
        if (form) {
            form.insertBefore(alertDiv, form.firstChild);
            
            // Auto-remove success alerts after 3 seconds
            if (type === 'success') {
                setTimeout(() => {
                    alertDiv.style.opacity = '0';
                    alertDiv.style.transform = 'translateY(-10px)';
                    setTimeout(() => alertDiv.remove(), 300);
                }, 3000);
            }
        }
    }
    
    static validateField(field, value) {
        const fieldName = field.getAttribute('name');
        field.classList.remove('error', 'success');
        
        let isValid = true;
        let message = '';
        
        switch (fieldName) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                isValid = emailRegex.test(value);
                message = isValid ? '' : 'Please enter a valid email address';
                break;
            case 'phone':
                isValid = value.length >= 10;
                message = isValid ? '' : 'Phone number must be at least 10 digits';
                break;
            case 'password':
                isValid = value.length >= 6;
                message = isValid ? '' : 'Password must be at least 6 characters';
                break;
            case 'name':
            case 'username':
                isValid = value.trim().length >= 2;
                message = isValid ? '' : 'Name must be at least 2 characters';
                break;
            case 'adminCode':
                isValid = value.trim().length >= 6;
                message = isValid ? '' : 'Admin code must be at least 6 characters';
                break;
        }
        
        field.classList.add(isValid ? 'success' : 'error');
        
        // Show/hide field-specific error message
        let errorMsg = field.parentNode.querySelector('.field-error');
        if (!isValid && message) {
            if (!errorMsg) {
                errorMsg = document.createElement('div');
                errorMsg.className = 'field-error';
                errorMsg.style.color = '#e74c3c';
                errorMsg.style.fontSize = '0.85rem';
                errorMsg.style.marginTop = '0.5rem';
                field.parentNode.appendChild(errorMsg);
            }
            errorMsg.textContent = message;
        } else if (errorMsg) {
            errorMsg.remove();
        }
        
        return isValid;
    }
}

// API calls
const API = {
    async call(endpoint, options = {}) {
        const token = TokenManager.get();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        
        try {
            console.log('Making API call to:', `${API_BASE_URL}${endpoint}`);
            console.log('Request data:', options.body);
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });
            
            const data = await response.json();
            console.log('Response status:', response.status);
            console.log('Response data:', data);
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    },
    
    async login(username, password) {
        return this.call('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    },
    
    async register(userData) {
        return this.call('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },
    
    async logout() {
        return this.call('/auth/logout', {
            method: 'POST'
        });
    },
    
    async getProfile() {
        return this.call('/auth/profile');
    }
};

// Authentication functions
const Auth = {
    async login(formData) {
        const submitBtn = document.getElementById('submitBtn');
        
        try {
            UIHelper.showLoading(submitBtn);
            
            const response = await API.login(formData.username, formData.password);
            
            if (response.success) {
                TokenManager.set(response.data.token);
                TokenManager.setUser(response.data.user);
                
                UIHelper.showAlert('Login successful! Redirecting...', 'success');
                
                // Role-based redirect
                const userRole = response.data.user.role;
                console.log('User role from server:', userRole);
                let redirectUrl = '/'; // default fallback
                
                switch (userRole) {
                    case 'Student':
                        redirectUrl = '/student';
                        break;
                    case 'Warden':
                        redirectUrl = '/warden';
                        break;
                    case 'SuperAdmin':
                    case 'Admin':
                        redirectUrl = '/admin';
                        break;
                    default:
                        redirectUrl = '/';
                }
                
                console.log('Redirecting to:', redirectUrl);
                
                setTimeout(() => {
                    window.location.href = resolveRoute(redirectUrl);
                }, 1500);
            }
        } catch (error) {
            UIHelper.showAlert(error.message, 'error');
        } finally {
            UIHelper.hideLoading(submitBtn);
        }
    },
    
    async register(formData) {
        const submitBtn = document.getElementById('submitBtn');
        
        try {
            UIHelper.showLoading(submitBtn);
            
            const response = await API.register(formData);
            
            if (response.success) {
                UIHelper.showAlert('Registration successful! You can now login.', 'success');
                
                setTimeout(() => {
                    window.location.href = resolveRoute('/login');
                }, 2000);
            }
        } catch (error) {
            UIHelper.showAlert(error.message, 'error');
        } finally {
            UIHelper.hideLoading(submitBtn);
        }
    },
    
    async logout() {
        try {
            await API.logout();
            TokenManager.clear();
            UIHelper.showAlert('Logged out successfully!', 'success');
            
            setTimeout(() => {
                window.location.href = resolveRoute('/login');
            }, 1000);
        } catch (error) {
            // Even if API call fails, clear local storage
            TokenManager.clear();
            window.location.href = resolveRoute('/login');
        }
    },
    
    isAuthenticated() {
        return !!TokenManager.get();
    },
    
    getCurrentUser() {
        return TokenManager.getUser();
    },
    
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = resolveRoute('/login');
            return false;
        }
        return true;
    }
};

// Page-specific functions
const LoginPage = {
    init() {
        const form = document.getElementById('loginForm');
        const submitBtn = document.getElementById('submitBtn');
        
        // Add real-time validation
        const emailField = document.getElementById('username');
        const passwordField = document.getElementById('password');
        
        emailField.addEventListener('blur', () => {
            UIHelper.validateField(emailField, emailField.value);
        });
        
        passwordField.addEventListener('blur', () => {
            UIHelper.validateField(passwordField, passwordField.value);
        });
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                username: emailField.value,
                password: passwordField.value
            };
            
            // Validate all fields
            const isEmailValid = UIHelper.validateField(emailField, emailField.value);
            const isPasswordValid = UIHelper.validateField(passwordField, passwordField.value);
            
            if (!isEmailValid || !isPasswordValid) {
                UIHelper.showAlert('Please fix the errors above before submitting.', 'error');
                return;
            }
            
            await Auth.login(formData);
        });
    }
};

const RegisterPage = {
    init() {
        const form = document.getElementById('registerForm');
        const submitBtn = document.getElementById('submitBtn');
        const roleSelect = document.getElementById('role');
        const adminCodeGroup = document.getElementById('adminCodeGroup');
        const adminCodeField = document.getElementById('adminCode');
        
        // Show/hide admin code field based on role selection
        roleSelect.addEventListener('change', () => {
            const selectedRole = roleSelect.value;
            const isAdminRole = selectedRole === 'Warden' || selectedRole === 'SuperAdmin';
            
            if (isAdminRole) {
                adminCodeGroup.style.display = 'block';
                adminCodeField.required = true;
            } else {
                adminCodeGroup.style.display = 'none';
                adminCodeField.required = false;
                adminCodeField.value = '';
                // Remove any validation styling
                adminCodeField.classList.remove('error', 'success');
                const errorMsg = adminCodeField.parentNode.querySelector('.field-error');
                if (errorMsg) errorMsg.remove();
            }
        });
        
        // Add real-time validation
        const nameField = document.getElementById('username');
        const emailField = document.getElementById('email');
        const phoneField = document.getElementById('phone');
        const passwordField = document.getElementById('password');
        
        // Set up field validation on blur
        [nameField, emailField, phoneField, passwordField, adminCodeField].forEach(field => {
            if (field) {
                field.addEventListener('blur', () => {
                    UIHelper.validateField(field, field.value);
                });
                
                // Also validate on input for better UX
                field.addEventListener('input', () => {
                    if (field.classList.contains('error')) {
                        UIHelper.validateField(field, field.value);
                    }
                });
            }
        });
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                username: nameField.value,
                email: emailField.value,
                phone: phoneField.value,
                password: passwordField.value,
                role: roleSelect.value
            };
            
            // Add admin code for validation, but don't include it in the user data
            if (adminCodeField.required && adminCodeField.value) {
                formData.adminCode = adminCodeField.value;
            }
            
            // Validate all fields
            const validations = [
                UIHelper.validateField(nameField, nameField.value),
                UIHelper.validateField(emailField, emailField.value),
                UIHelper.validateField(phoneField, phoneField.value),
                UIHelper.validateField(passwordField, passwordField.value)
            ];
            
            // Validate admin code if admin role is selected
            if (adminCodeField.required) {
                validations.push(UIHelper.validateField(adminCodeField, adminCodeField.value));
            }
            
            if (!validations.every(Boolean)) {
                UIHelper.showAlert('Please fix the errors above before submitting.', 'error');
                return;
            }
            
            await Auth.register(formData);
        });
    }
};

const DashboardPage = {
    init() {
        if (!Auth.requireAuth()) return;
        
        const user = Auth.getCurrentUser();
        const userInfo = document.getElementById('userInfo');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (userInfo) {
            userInfo.innerHTML = `
                <h3>Welcome, ${user.username}!</h3>
                <p><strong>Role:</strong> ${user.role}</p>
                <p><strong>Email:</strong> ${user.email || 'Not provided'}</p>
                <p><strong>Phone:</strong> ${user.phone || 'Not provided'}</p>
            `;
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                Auth.logout();
            });
        }
    }
};

// Initialize page-specific functionality
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    let page = path.substring(path.lastIndexOf('/') + 1);
    // Normalize: strip .html and '-dashboard' suffix for local file navigation
    page = page.replace(/\.html$/, '').replace(/-dashboard$/, '');
    
    switch (page) {
    case 'login':
            LoginPage.init();
            break;
    case 'register':
            RegisterPage.init();
            break;
    case '':
    case 'student':
    case 'warden':
    case 'admin':
            DashboardPage.init();
            break;
    }
});