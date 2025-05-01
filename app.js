/* Basic frontend JavaScript to handle API calls for landlord login/signup, family members/transactions, subscription plans, and rent analysis */

const apiBaseUrl = 'http://localhost:3000/api';

async function landlordLogin(plotName, password) {
  try {
    const response = await fetch(apiBaseUrl + '/landlords/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plotName, password })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    // Save landlordId for further API calls
    window.landlordId = data.landlordId;
    // Load family members, transactions, subscription plans, and rent analysis after login
    await loadFamilyMembers();
    await loadTransactions();
    await loadSubscriptionPlans();
    await loadSubscriptionStatus();
    await loadRentAnalysis();
    return data;
  } catch (error) {
    throw error;
  }
}

// Other existing functions omitted for brevity (landlordSignup, addFamilyMember, getFamilyMembers, getTransactions, getSubscriptionPlans, subscribeToPlan, getSubscriptionStatus, loadFamilyMembers, loadTransactions, loadSubscriptionPlans, loadSubscriptionStatus)

// Load and display rent analysis report
async function loadRentAnalysis() {
  try {
    const response = await fetch(`${apiBaseUrl}/landlords/${window.landlordId}/rent-analysis`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch rent analysis');
    }

    // Display summary
    const summaryDiv = document.getElementById('rentSummary');
    summaryDiv.innerHTML = `
      Total Rent Received: $${data.totalRentReceived.toFixed(2)}<br/>
      Total Rent Pending: $${data.totalRentPending.toFixed(2)}
    `;

    // Display payments table
    const tbody = document.getElementById('rentPaymentsTableBody');
    tbody.innerHTML = '';
    if (data.payments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-4">No payment records found.</td></tr>';
      return;
    }
    data.payments.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="border-b border-gray-200 py-2 px-4">${p.tenantName}</td>
        <td class="border-b border-gray-200 py-2 px-4">${p.houseNumber}</td>
        <td class="border-b border-gray-200 py-2 px-4">${p.amount.toFixed(2)}</td>
        <td class="border-b border-gray-200 py-2 px-4">${p.month}</td>
        <td class="border-b border-gray-200 py-2 px-4">${new Date(p.date).toLocaleDateString()}</td>
        <td class="border-b border-gray-200 py-2 px-4">${p.status}</td>
      `;
      tbody.appendChild(tr);
    });

    // Render chart using Chart.js
    renderRentChart(data.payments);

    // Setup export button
    const exportBtn = document.getElementById('exportReportBtn');
    exportBtn.onclick = () => exportRentReportCSV(data.payments);
  } catch (err) {
    alert('Error loading rent analysis: ' + err.message);
  }
}

// Render rent analysis chart
function renderRentChart(payments) {
  const ctx = document.getElementById('rentAnalysisChart').getContext('2d');
  if (window.rentChart) {
    window.rentChart.destroy();
  }

  // Aggregate payments by month and status
  const monthlyData = {};
  payments.forEach(p => {
    const month = p.month;
    if (!monthlyData[month]) {
      monthlyData[month] = { Paid: 0, Unpaid: 0 };
    }
    monthlyData[month][p.status] += p.amount;
  });

  const labels = Object.keys(monthlyData).sort();
  const paidData = labels.map(m => monthlyData[m].Paid);
  const unpaidData = labels.map(m => monthlyData[m].Unpaid);

  window.rentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Paid',
          data: paidData,
          backgroundColor: 'rgba(34,197,94,0.7)'
        },
        {
          label: 'Unpaid',
          data: unpaidData,
          backgroundColor: 'rgba(239,68,68,0.7)'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// Export rent report as CSV
function exportRentReportCSV(payments) {
  const headers = ['Tenant', 'House Number', 'Amount', 'Month', 'Date', 'Status'];
  const rows = payments.map(p => [
    p.tenantName,
    p.houseNumber,
    p.amount.toFixed(2),
    p.month,
    new Date(p.date).toLocaleDateString(),
    p.status
  ]);

  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += headers.join(',') + '\r\n';
  rows.forEach(row => {
    csvContent += row.join(',') + '\r\n';
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'rent_report.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// DOMContentLoaded event listener and other handlers omitted for brevity
document.addEventListener('DOMContentLoaded', () => {
  // Existing event listeners for login and family member form submission...

  // Add Chart.js script dynamically
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
  script.onload = () => {
    console.log('Chart.js loaded');
  };
  document.head.appendChild(script);
});

// Load and display late fees and invoices
async function loadLateFees() {
  try {
    const response = await fetch(`${apiBaseUrl}/landlords/${window.landlordId}/late-fees`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch late fees');
    }

    const tbody = document.getElementById('lateFeesTableBody');
    tbody.innerHTML = '';
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-gray-500 py-4">No late fees or invoices found.</td></tr>';
      return;
    }
    data.forEach(invoice => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="border-b border-gray-200 py-2 px-4">${invoice.tenantName}</td>
        <td class="border-b border-gray-200 py-2 px-4">${invoice.houseNumber}</td>
        <td class="border-b border-gray-200 py-2 px-4">${invoice.month}</td>
        <td class="border-b border-gray-200 py-2 px-4">${invoice.originalAmount.toFixed(2)}</td>
        <td class="border-b border-gray-200 py-2 px-4">${invoice.lateFee.toFixed(2)}</td>
        <td class="border-b border-gray-200 py-2 px-4">${invoice.totalAmount.toFixed(2)}</td>
        <td class="border-b border-gray-200 py-2 px-4">${invoice.daysLate}</td>
        <td class="border-b border-gray-200 py-2 px-4">${new Date(invoice.invoiceDate).toLocaleDateString()}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    alert('Error loading late fees: ' + err.message);
  }
}

// Load and display properties
async function loadProperties() {
  try {
    const response = await fetch(`${apiBaseUrl}/landlords/${window.landlordId}/properties`);
    const properties = await response.json();
    const container = document.getElementById('propertiesList');
    container.innerHTML = '';
    if (properties.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-500">No properties added yet.</p>';
      return;
    }
    properties.forEach(property => {
      const div = document.createElement('div');
      div.className = 'border border-gray-300 rounded p-4 flex justify-between items-center';
      div.innerHTML = `
        <div>
          <h3 class="text-xl font-semibold">${property.name}</h3>
          <p class="text-gray-700">${property.address}</p>
          <p class="text-gray-600 italic">${property.description || ''}</p>
        </div>
        <div class="space-x-2">
          <button class="editPropertyBtn bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500 transition" data-id="${property.id}">Edit</button>
          <button class="deletePropertyBtn bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition" data-id="${property.id}">Delete</button>
        </div>
      `;
      container.appendChild(div);
    });

    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.editPropertyBtn').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-id');
        editProperty(id);
      });
    });
    document.querySelectorAll('.deletePropertyBtn').forEach(button => {
      button.addEventListener('click', async () => {
        const id = button.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this property?')) {
          await deleteProperty(id);
          await loadProperties();
        }
      });
    });
  } catch (err) {
    alert('Error loading properties: ' + err.message);
  }
}

// Add new property
document.getElementById('propertyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('propertyName').value.trim();
  const address = document.getElementById('propertyAddress').value.trim();
  const description = document.getElementById('propertyDescription').value.trim();
  try {
    await addProperty(name, address, description);
    document.getElementById('propertyForm').reset();
    await loadProperties();
  } catch (err) {
    alert('Error adding property: ' + err.message);
  }
});

async function addProperty(name, address, description) {
  const response = await fetch(`${apiBaseUrl}/landlords/${window.landlordId}/properties`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, address, description })
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to add property');
  }
  return await response.json();
}

async function editProperty(id) {
  // For simplicity, prompt for new values
  const newName = prompt('Enter new property name:');
  if (!newName) return;
  const newAddress = prompt('Enter new property address:');
  if (!newAddress) return;
  const newDescription = prompt('Enter new property description (optional):');

  try {
    await updateProperty(id, newName, newAddress, newDescription);
    await loadProperties();
  } catch (err) {
    alert('Error updating property: ' + err.message);
  }
}

async function updateProperty(id, name, address, description) {
  const response = await fetch(`${apiBaseUrl}/properties/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, address, description })
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to update property');
  }
  return await response.json();
}

async function deleteProperty(id) {
  const response = await fetch(`${apiBaseUrl}/properties/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to delete property');
  }
  return await response.json();
}

// Modify afterLoginLoad to load properties
async function afterLoginLoad() {
  await loadFamilyMembers();
  await loadTransactions();
  await loadSubscriptionPlans();
  await loadSubscriptionStatus();
  await loadRentAnalysis();
  await loadLateFees();
  await loadProperties();
}

// Tenant login form submission
document.getElementById('tenantLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('tenantName').value.trim();
  const phoneNumber = document.getElementById('tenantPhone').value.trim();
  try {
    const response = await fetch(`${apiBaseUrl}/tenants/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phoneNumber })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    window.tenant = data.tenant;
    showTenantDashboard();
    await loadTenantPayments();
  } catch (err) {
    alert('Tenant login failed: ' + err.message);
  }
});

function showTenantDashboard() {
  document.getElementById('tenantLoginForm').classList.add('hidden');
  document.getElementById('tenantDashboard').classList.remove('hidden');
}

function hideTenantDashboard() {
  document.getElementById('tenantLoginForm').classList.remove('hidden');
  document.getElementById('tenantDashboard').classList.add('hidden');
  window.tenant = null;
}

// Load tenant payment history
async function loadTenantPayments() {
  try {
    const response = await fetch(`${apiBaseUrl}/tenants/${window.tenant.id}/payments`);
    const payments = await response.json();
    const tbody = document.getElementById('tenantPaymentsTableBody');
    tbody.innerHTML = '';
    if (payments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500 py-4">No payment history found.</td></tr>';
      return;
    }
    payments.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="border-b border-gray-200 py-2 px-4">${p.amount.toFixed(2)}</td>
        <td class="border-b border-gray-200 py-2 px-4">${p.month}</td>
        <td class="border-b border-gray-200 py-2 px-4">${new Date(p.date).toLocaleDateString()}</td>
        <td class="border-b border-gray-200 py-2 px-4">${p.status}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    alert('Error loading tenant payments: ' + err.message);
  }
}

  
// Tenant logout button
document.getElementById('tenantLogoutBtn').addEventListener('click', () => {
  hideTenantDashboard();
});

// Load notifications for user
async function loadNotifications(userType, userId) {
  try {
    const response = await fetch(`${apiBaseUrl}/notifications/${userType}/${userId}`);
    const notifications = await response.json();
    const container = document.getElementById('notificationsContainer');
    container.innerHTML = '';
    if (notifications.length === 0) {
      container.innerHTML = '<li class="text-gray-500">No notifications found.</li>';
      return;
    }
    notifications.forEach(notification => {
      const li = document.createElement('li');
      li.textContent = notification.message + (notification.isRead ? '' : ' (New)');
      li.className = notification.isRead ? '' : 'font-semibold text-blue-600';
      li.dataset.id = notification.id;
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => markNotificationRead(notification.id, li));
      container.appendChild(li);
    });
  } catch (err) {
    alert('Error loading notifications: ' + err.message);
  }
}

// Document upload form submission
document.getElementById('documentUploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('documentFile');
  if (fileInput.files.length === 0) {
    alert('Please select a file to upload.');
    return;
  }
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${apiBaseUrl}/documents/tenant/${window.tenant.id}/upload`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to upload document');
    }
    alert('Document uploaded successfully');
    fileInput.value = '';
    await loadDocuments('tenant', window.tenant.id);
  } catch (err) {
    alert('Error uploading document: ' + err.message);
  }
});

// Load documents for user
async function loadDocuments(userType, userId) {
  try {
    const response = await fetch(`${apiBaseUrl}/documents/${userType}/${userId}`);
    const documents = await response.json();
    const container = document.getElementById('documentsContainer');
    container.innerHTML = '';
    if (documents.length === 0) {
      container.innerHTML = '<li class="text-gray-500">No documents found.</li>';
      return;
    }
    documents.forEach(doc => {
      const li = document.createElement('li');
      const downloadLink = document.createElement('a');
      downloadLink.href = `${apiBaseUrl}/documents/download/${doc.id}`;
      downloadLink.textContent = doc.fileName;
      downloadLink.className = 'text-blue-600 hover:underline mr-2';
      downloadLink.target = '_blank';

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'text-red-600 hover:underline';
      deleteBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this document?')) {
          await deleteDocument(doc.id);
          await loadDocuments(userType, userId);
        }
      });

      li.appendChild(downloadLink);
      li.appendChild(deleteBtn);
      container.appendChild(li);
    });
  } catch (err) {
    alert('Error loading documents: ' + err.message);
  }
}

// Delete document
async function deleteDocument(documentId) {
  try {
    const response = await fetch(`${apiBaseUrl}/documents/${documentId}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete document');
    }
    alert('Document deleted successfully');
  } catch (err) {
    alert('Error deleting document: ' + err.message);
  }
}

// Modify showTenantDashboard to load documents
function showTenantDashboard() {
  document.getElementById('tenantLoginForm').classList.add('hidden');
  document.getElementById('tenantDashboard').classList.remove('hidden');
  populateMaintenanceProperties();
  loadMaintenanceRequests();
  loadNotifications('tenant', window.tenant.id);
  loadDocuments('tenant', window.tenant.id);
}

// Mark notification as read
async function markNotificationRead(notificationId, element) {
  try {
    const response = await fetch(`${apiBaseUrl}/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to mark notification as read');
    }
    element.classList.remove('font-semibold', 'text-blue-600');
    element.textContent = element.textContent.replace(' (New)', '');
  } catch (err) {
    alert('Error marking notification as read: ' + err.message);
  }
}

// Load and display maintenance requests for landlord
async function loadMaintenanceRequests() {
  try {
    const response = await fetch(`${apiBaseUrl}/landlords/${window.landlordId}/maintenance-requests`);
    const requests = await response.json();
    const container = document.getElementById('requestsContainer');
    container.innerHTML = '';
    if (requests.length === 0) {
      container.innerHTML = '<p class="text-center text-gray-500">No maintenance requests found.</p>';
      return;
    }
    requests.forEach(request => {
      const div = document.createElement('div');
      div.className = 'border border-gray-300 rounded p-4';
      div.innerHTML = `
        <p><strong>Property ID:</strong> ${request.propertyId}</p>
        <p><strong>Description:</strong> ${request.description}</p>
        <p><strong>Status:</strong> ${request.status}</p>
        <p><strong>Requested On:</strong> ${new Date(request.requestDate).toLocaleDateString()}</p>
        <p><strong>Resolved On:</strong> ${request.resolutionDate ? new Date(request.resolutionDate).toLocaleDateString() : 'N/A'}</p>
        <button class="updateRequestBtn bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition" data-id="${request.id}">Update Status</button>
      `;
      container.appendChild(div);
    });

    // Add event listeners for update buttons
    document.querySelectorAll('.updateRequestBtn').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-id');
        updateMaintenanceRequestStatus(id);
      });
    });
  } catch (err) {
    alert('Error loading maintenance requests: ' + err.message);
  }
}

// Submit maintenance request form
document.getElementById('maintenanceRequestForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const propertyId = document.getElementById('maintenanceProperty').value;
  const description = document.getElementById('maintenanceDescription').value.trim();
  try {
    await submitMaintenanceRequest(propertyId, description);
    document.getElementById('maintenanceRequestForm').reset();
    await loadMaintenanceRequests();
  } catch (err) {
    alert('Error submitting maintenance request: ' + err.message);
  }
});

async function submitMaintenanceRequest(propertyId, description) {
  const response = await fetch(`${apiBaseUrl}/tenants/${window.tenant.id}/maintenance-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ propertyId, description })
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to submit maintenance request');
  }
  return await response.json();
}

async function updateMaintenanceRequestStatus(id) {
  const newStatus = prompt('Enter new status (Pending, In Progress, Resolved):');
  if (!newStatus) return;
  let resolutionDate = null;
  if (newStatus.toLowerCase() === 'resolved') {
    resolutionDate = new Date().toISOString();
  }
  try {
    const response = await fetch(`${apiBaseUrl}/maintenance-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, resolutionDate })
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update maintenance request');
    }
    await loadMaintenanceRequests();
  } catch (err) {
    alert('Error updating maintenance request: ' + err.message);
  }
}

// Populate maintenance property dropdown for tenants
async function populateMaintenanceProperties() {
  try {
    const response = await fetch(`${apiBaseUrl}/landlords/${window.tenant.landlordId}/properties`);
    const properties = await response.json();
    const select = document.getElementById('maintenanceProperty');
    select.innerHTML = '';
    properties.forEach(property => {
      const option = document.createElement('option');
      option.value = property.id;
      option.textContent = property.name;
      select.appendChild(option);
    });
  } catch (err) {
    alert('Error loading properties for maintenance: ' + err.message);
  }
}

// Modify showTenantDashboard to populate properties dropdown
function showTenantDashboard() {
  document.getElementById('tenantLoginForm').classList.add('hidden');
  document.getElementById('tenantDashboard').classList.remove('hidden');
  populateMaintenanceProperties();
  loadMaintenanceRequests();
}
