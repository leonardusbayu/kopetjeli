let authToken = null;
let currentUser = null;

// DOM elements
const authSection = document.getElementById('authSection');
const mainContent = document.getElementById('mainContent');
const loginForm = document.getElementById('loginForm');
const createUserForm = document.getElementById('createUserForm');
const responseOutput = document.getElementById('responseOutput');
const currentUserSpan = document.getElementById('currentUser');
const userRoleSpan = document.getElementById('userRole');

// Event listeners
loginForm.addEventListener('submit', handleLogin);
createUserForm.addEventListener('submit', handleCreateUser);

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showMainContent();
    }
});

async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const credentials = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    try {
        setLoading(true);
        const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            
            // Save to localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showMainContent();
            displayResponse('Login successful!', 'success');
        } else {
            displayResponse(`Login failed: ${data.message}`, 'error');
        }
    } catch (error) {
        displayResponse(`Login error: ${error.message}`, 'error');
    } finally {
        setLoading(false);
    }
}

async function handleCreateUser(e) {
    e.preventDefault();
    
    if (!authToken) {
        displayResponse('Please login first', 'error');
        return;
    }

    const formData = new FormData(createUserForm);
    const userData = {
        username: formData.get('username'),
        email: formData.get('email'),
        role: formData.get('role')
    };

    try {
        setLoading(true);
        const response = await fetch('/api/v1/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok) {
            displayResponse(JSON.stringify(data, null, 2), 'success');
            createUserForm.reset();
        } else {
            displayResponse(`Create user failed: ${data.message}`, 'error');
        }
    } catch (error) {
        displayResponse(`Create user error: ${error.message}`, 'error');
    } finally {
        setLoading(false);
    }
}

async function testEndpoint(endpoint, method = 'GET', requiresAuth = false) {
    try {
        setLoading(true);
        
        const headers = {
            'Content-Type': 'application/json'
        };

        if (requiresAuth && authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(endpoint, {
            method,
            headers
        });

        const data = await response.json();
        
        const responseInfo = {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            data
        };

        displayResponse(JSON.stringify(responseInfo, null, 2), response.ok ? 'success' : 'error');
    } catch (error) {
        displayResponse(`Request error: ${error.message}`, 'error');
    } finally {
        setLoading(false);
    }
}

function showMainContent() {
    authSection.classList.add('hidden');
    mainContent.classList.remove('hidden');
    
    if (currentUser) {
        currentUserSpan.textContent = currentUser.username;
        userRoleSpan.textContent = currentUser.role;
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Reset forms
    loginForm.reset();
    createUserForm.reset();
    
    // Show auth section
    authSection.classList.remove('hidden');
    mainContent.classList.add('hidden');
    
    displayResponse('Logged out successfully', 'success');
}

function displayResponse(message, type = 'info') {
    responseOutput.textContent = message;
    responseOutput.className = type;
    
    // Add animation
    responseOutput.style.opacity = '0';
    setTimeout(() => {
        responseOutput.style.opacity = '1';
    }, 100);
}

function setLoading(isLoading) {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    });
}

// Utility function to format JSON
function formatJSON(obj) {
    return JSON.stringify(obj, null, 2);
}

// Add some demo data on page load
window.addEventListener('load', () => {
    displayResponse('Welcome to the Modular Express API!\n\nThis interface demonstrates the API capabilities.\n\nLogin credentials:\n- Username: admin, Password: admin123\n- Username: user, Password: user123');
});