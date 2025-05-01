// Basic frontend JavaScript to handle API calls for landlord login/signup

const apiBaseUrl = 'http://localhost:3000/api';

async function landlordLogin(plotName, password) {
  try {
    const response = await fetch(\`\${apiBaseUrl}/landlords/login\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plotName, password })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    return data;
  } catch (error) {
    throw error;
  }
}

async function landlordSignup(plotName, password) {
  try {
    const response = await fetch(\`\${apiBaseUrl}/landlords/signup\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plotName, password })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Signup failed');
    }
    return data;
  } catch (error) {
    throw error;
  }
}

// Handle login form submission
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const plotName = document.getElementById('plotName').value.trim();
    const password = document.getElementById('password').value.trim();
    try {
      const result = await landlordLogin(plotName, password);
      alert('Login successful! Landlord ID: ' + result.landlordId);
      // TODO: Redirect to dashboard or tenant management page
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });
});
