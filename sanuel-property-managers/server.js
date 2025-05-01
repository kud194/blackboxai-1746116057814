
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

let db;

// Initialize SQLite database
async function initDb() {
  db = await open({
    filename: './sanuel_property_managers.db',
    driver: sqlite3.Database
  });

  // Create tables if not exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS landlords (
      id TEXT PRIMARY KEY,
      plotName TEXT UNIQUE,
      password TEXT
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      landlordId TEXT,
      name TEXT,
      phoneNumber TEXT,
      houseNumber TEXT,
      rentAccount TEXT,
      paymentStatus TEXT,
      paymentHistory TEXT,
      FOREIGN KEY (landlordId) REFERENCES landlords(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS family_members (
      id TEXT PRIMARY KEY,
      landlordId TEXT,
      name TEXT,
      phoneNumber TEXT,
      email TEXT,
      FOREIGN KEY (landlordId) REFERENCES landlords(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      landlordId TEXT,
      familyMemberId TEXT,
      type TEXT,
      amount REAL,
      date TEXT,
      description TEXT,
      FOREIGN KEY (landlordId) REFERENCES landlords(id),
      FOREIGN KEY (familyMemberId) REFERENCES family_members(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      landlordId TEXT UNIQUE,
      plan TEXT,
      startDate TEXT,
      endDate TEXT,
      status TEXT,
      FOREIGN KEY (landlordId) REFERENCES landlords(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      landlordId TEXT,
      name TEXT,
      address TEXT,
      description TEXT,
      FOREIGN KEY (landlordId) REFERENCES landlords(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance_requests (
      id TEXT PRIMARY KEY,
      tenantId TEXT,
      landlordId TEXT,
      propertyId TEXT,
      description TEXT,
      status TEXT,
      requestDate TEXT,
      resolutionDate TEXT,
      FOREIGN KEY (tenantId) REFERENCES tenants(id),
      FOREIGN KEY (landlordId) REFERENCES landlords(id),
      FOREIGN KEY (propertyId) REFERENCES properties(id)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT,
      userType TEXT,
      message TEXT,
      isRead INTEGER DEFAULT 0,
      createdAt TEXT,
      FOREIGN KEY (userId) REFERENCES landlords(id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      userId TEXT,
      userType TEXT,
      fileName TEXT,
      fileType TEXT,
      fileData BLOB,
      uploadDate TEXT,
      FOREIGN KEY (userId) REFERENCES landlords(id) ON DELETE CASCADE
    );
  `);

// Get notifications for user (landlord or tenant)
app.get('/api/notifications/:userType/:userId', async (req, res) => {
  const { userType, userId } = req.params;
  try {
    const notifications = await db.all(
      'SELECT * FROM notifications WHERE userId = ? AND userType = ? ORDER BY createdAt DESC',
      userId, userType
    );
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Mark notification as read
app.put('/api/notifications/:notificationId/read', async (req, res) => {
  const { notificationId } = req.params;
  try {
    await db.run('UPDATE notifications SET isRead = 1 WHERE id = ?', notificationId);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});
}


// Landlord signup
app.post('/api/landlords/signup', async (req, res) => {
  const { plotName, password } = req.body;
  if (!plotName || !password) {
    return res.status(400).json({ error: 'Plot name and password are required' });
  }
  try {
    const existing = await db.get('SELECT * FROM landlords WHERE plotName = ?', plotName);
    if (existing) {
      return res.status(409).json({ error: 'Plot name already exists' });
    }
    const id = uuidv4();
    await db.run('INSERT INTO landlords (id, plotName, password) VALUES (?, ?, ?)', id, plotName, password);
    res.status(201).json({ message: 'Landlord account created', landlordId: id });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Create a new property
app.post('/api/landlords/:landlordId/properties', async (req, res) => {
  const { landlordId } = req.params;
  const { name, address, description } = req.body;
  if (!name || !address) {
    return res.status(400).json({ error: 'Property name and address are required' });
  }
  try {
    const id = uuidv4();
    await db.run(
      'INSERT INTO properties (id, landlordId, name, address, description) VALUES (?, ?, ?, ?, ?)',
      id, landlordId, name, address, description || ''
    );
    const newProperty = await db.get('SELECT * FROM properties WHERE id = ?', id);
    res.status(201).json({ message: 'Property created', property: newProperty });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get all properties for landlord
app.get('/api/landlords/:landlordId/properties', async (req, res) => {
  const { landlordId } = req.params;
  try {
    const properties = await db.all('SELECT * FROM properties WHERE landlordId = ?', landlordId);
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Update a property
app.put('/api/properties/:propertyId', async (req, res) => {
  const { propertyId } = req.params;
  const { name, address, description } = req.body;
  if (!name || !address) {
    return res.status(400).json({ error: 'Property name and address are required' });
  }
  try {
    await db.run(
      'UPDATE properties SET name = ?, address = ?, description = ? WHERE id = ?',
      name, address, description || '', propertyId
    );
    const updatedProperty = await db.get('SELECT * FROM properties WHERE id = ?', propertyId);
    res.json({ message: 'Property updated', property: updatedProperty });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Delete a property
app.delete('/api/properties/:propertyId', async (req, res) => {
  const { propertyId } = req.params;
  try {
    await db.run('DELETE FROM properties WHERE id = ?', propertyId);
    res.json({ message: 'Property deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Add family member for landlord
app.post('/api/landlords/:landlordId/family-members', async (req, res) => {
  const { landlordId } = req.params;
  const { name, phoneNumber, email } = req.body;
  if (!name || !phoneNumber || !email) {
    return res.status(400).json({ error: 'Name, phone number, and email are required' });
  }
  try {
    const id = uuidv4();
    await db.run(
      'INSERT INTO family_members (id, landlordId, name, phoneNumber, email) VALUES (?, ?, ?, ?, ?)',
      id, landlordId, name, phoneNumber, email
    );
    const newMember = await db.get('SELECT * FROM family_members WHERE id = ?', id);
    res.status(201).json({ message: 'Family member added', familyMember: newMember });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get family members for landlord
app.get('/api/landlords/:landlordId/family-members', async (req, res) => {
  const { landlordId } = req.params;
  try {
    const members = await db.all('SELECT * FROM family_members WHERE landlordId = ?', landlordId);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Add transaction
app.post('/api/landlords/:landlordId/transactions', async (req, res) => {
  const { landlordId } = req.params;
  const { familyMemberId, type, amount, description } = req.body;
  if (!familyMemberId || !type || !amount) {
    return res.status(400).json({ error: 'Family member ID, type, and amount are required' });
  }
  try {
    const id = uuidv4();
    const date = new Date().toISOString();
    await db.run(
      'INSERT INTO transactions (id, landlordId, familyMemberId, type, amount, date, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id, landlordId, familyMemberId, type, amount, date, description || ''
    );
    const newTransaction = await db.get('SELECT * FROM transactions WHERE id = ?', id);
    res.status(201).json({ message: 'Transaction added', transaction: newTransaction });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get transactions for landlord
app.get('/api/landlords/:landlordId/transactions', async (req, res) => {
  const { landlordId } = req.params;
  try {
    const transactions = await db.all('SELECT * FROM transactions WHERE landlordId = ? ORDER BY date DESC', landlordId);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get subscription plans and benefits
app.get('/api/subscription/plans', (req, res) => {
  const plans = [
    {
      id: 'monthly',
      name: 'Monthly Plan',
      price: 1000,
      billingCycle: 'Monthly',
      benefits: [
        'Access to the app',
        'Physical property management if tenant fails to pay',
        'Priority customer support',
        'Regular property inspections'
      ]
    },
    {
      id: 'yearly',
      name: 'Yearly Plan',
      price: 12000,
      billingCycle: 'Yearly',
      benefits: [
        'Access to the app',
        'Physical property management if tenant fails to pay',
        'Priority customer support',
        'Regular property inspections',
        'Discounted rate compared to monthly plan'
      ]
    }
  ];
  res.json(plans);
});

// Subscribe landlord to a plan
app.post('/api/landlords/:landlordId/subscribe', async (req, res) => {
  const { landlordId } = req.params;
  const { plan } = req.body;
  if (!plan || (plan !== 'monthly' && plan !== 'yearly')) {
    return res.status(400).json({ error: 'Invalid subscription plan' });
  }
  try {
    const startDate = new Date();
    let endDate;
    if (plan === 'monthly') {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    const status = 'active';
    const existing = await db.get('SELECT * FROM subscriptions WHERE landlordId = ?', landlordId);
    if (existing) {
      await db.run(
        'UPDATE subscriptions SET plan = ?, startDate = ?, endDate = ?, status = ? WHERE landlordId = ?',
        plan, startDate.toISOString(), endDate.toISOString(), status, landlordId
      );
    } else {
      const id = uuidv4();
      await db.run(
        'INSERT INTO subscriptions (id, landlordId, plan, startDate, endDate, status) VALUES (?, ?, ?, ?, ?, ?)',
        id, landlordId, plan, startDate.toISOString(), endDate.toISOString(), status
      );
    }
    res.json({ message: 'Subscription updated', plan, startDate, endDate, status });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get subscription status for landlord
app.get('/api/landlords/:landlordId/subscription', async (req, res) => {
  const { landlordId } = req.params;
  try {
    const subscription = await db.get('SELECT * FROM subscriptions WHERE landlordId = ?', landlordId);
    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    res.json(subscription);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get rent analysis report data
app.get('/api/landlords/:landlordId/rent-analysis', async (req, res) => {
  const { landlordId } = req.params;
  try {
    // Aggregate payment data for the landlord's tenants
    const payments = await db.all(`
      SELECT t.name as tenantName, t.houseNumber, ph.amount, ph.month, ph.date, ph.status
      FROM tenants t, json_each(t.paymentHistory) ph
      WHERE t.landlordId = ?
      ORDER BY ph.date DESC
    `, landlordId);

    // Calculate summary data
    const totalRentReceived = payments
      .filter(p => p.status === 'Paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalRentPending = payments
      .filter(p => p.status === 'Unpaid')
      .reduce((sum, p) => sum + p.amount, 0);

    res.json({
      totalRentReceived,
      totalRentPending,
      payments
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Calculate late fees for unpaid rents and generate invoices
app.get('/api/landlords/:landlordId/late-fees', async (req, res) => {
  const { landlordId } = req.params;
  try {
    const lateFeePerDay = 10; // Example late fee per day
    const today = new Date();

    // Get unpaid payments
    const unpaidPayments = await db.all(`
      SELECT t.id as tenantId, t.name as tenantName, t.houseNumber, ph.amount, ph.month, ph.date
      FROM tenants t, json_each(t.paymentHistory) ph
      WHERE t.landlordId = ? AND ph.status = 'Unpaid'
    `, landlordId);

    // Calculate late fees and generate invoices
    const invoices = unpaidPayments.map(payment => {
      const dueDate = new Date(payment.date);
      const daysLate = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)));
      const lateFee = daysLate * lateFeePerDay;
      const totalAmount = payment.amount + lateFee;
      return {
        tenantId: payment.tenantId,
        tenantName: payment.tenantName,
        houseNumber: payment.houseNumber,
        month: payment.month,
        originalAmount: payment.amount,
        lateFee,
        totalAmount,
        daysLate,
        invoiceDate: today.toISOString()
      };
    });

    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Landlord login
app.post('/api/landlords/login', async (req, res) => {
  const { plotName, password } = req.body;
  try {
    const landlord = await db.get('SELECT * FROM landlords WHERE plotName = ?', plotName);
    if (!landlord || landlord.password !== password) {
      return res.status(401).json({ error: 'Invalid plot name or password' });
    }
    res.json({ message: 'Login successful', landlordId: landlord.id });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get tenants for landlord
app.get('/api/landlords/:landlordId/tenants', async (req, res) => {
  const { landlordId } = req.params;
  try {
    const landlordTenants = await db.all('SELECT * FROM tenants WHERE landlordId = ?', landlordId);
    // Parse paymentHistory JSON string to object
    landlordTenants.forEach(t => {
      t.paymentHistory = t.paymentHistory ? JSON.parse(t.paymentHistory) : [];
    });
    res.json(landlordTenants);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Tenant login
app.post('/api/tenants/login', async (req, res) => {
  const { name, phoneNumber } = req.body;
  if (!name || !phoneNumber) {
    return res.status(400).json({ error: 'Name and phone number are required' });
  }
  try {
    const tenant = await db.get('SELECT * FROM tenants WHERE name = ? AND phoneNumber = ?', name, phoneNumber);
    if (!tenant) {
      return res.status(401).json({ error: 'Invalid tenant credentials' });
    }
    tenant.paymentHistory = tenant.paymentHistory ? JSON.parse(tenant.paymentHistory) : [];
    res.json({ message: 'Login successful', tenant });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Submit a maintenance request
app.post('/api/tenants/:tenantId/maintenance-requests', async (req, res) => {
  const { tenantId } = req.params;
  const { propertyId, description } = req.body;
  if (!propertyId || !description) {
    return res.status(400).json({ error: 'Property ID and description are required' });
  }
  try {
    const tenant = await db.get('SELECT * FROM tenants WHERE id = ?', tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    const landlordId = tenant.landlordId;
    const id = uuidv4();
    const requestDate = new Date().toISOString();
    const status = 'Pending';
    await db.run(
      'INSERT INTO maintenance_requests (id, tenantId, landlordId, propertyId, description, status, requestDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id, tenantId, landlordId, propertyId, description, status, requestDate
    );
    const newRequest = await db.get('SELECT * FROM maintenance_requests WHERE id = ?', id);
    res.status(201).json({ message: 'Maintenance request submitted', request: newRequest });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get maintenance requests for landlord
app.get('/api/landlords/:landlordId/maintenance-requests', async (req, res) => {
  const { landlordId } = req.params;
  try {
    const requests = await db.all('SELECT * FROM maintenance_requests WHERE landlordId = ? ORDER BY requestDate DESC', landlordId);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Update maintenance request status
app.put('/api/maintenance-requests/:requestId', async (req, res) => {
  const { requestId } = req.params;
  const { status, resolutionDate } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  try {
    await db.run(
      'UPDATE maintenance_requests SET status = ?, resolutionDate = ? WHERE id = ?',
      status, resolutionDate || null, requestId
    );
    const updatedRequest = await db.get('SELECT * FROM maintenance_requests WHERE id = ?', requestId);
    res.json({ message: 'Maintenance request updated', request: updatedRequest });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Get tenant payment history
app.get('/api/tenants/:tenantId/payments', async (req, res) => {
  const { tenantId } = req.params;
  try {
    const tenant = await db.get('SELECT * FROM tenants WHERE id = ?', tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    const paymentHistory = tenant.paymentHistory ? JSON.parse(tenant.paymentHistory) : [];
    res.json(paymentHistory);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Add tenant for landlord
app.post('/api/landlords/:landlordId/tenants', async (req, res) => {
  const { landlordId } = req.params;
  const { name, phoneNumber, houseNumber, rentAccount } = req.body;
  if (!name || !phoneNumber || !houseNumber || !rentAccount) {
    return res.status(400).json({ error: 'All tenant fields are required' });
  }
  try {
    const id = uuidv4();
    const paymentHistory = JSON.stringify([]);
    const paymentStatus = 'Unpaid';
    await db.run(
      'INSERT INTO tenants (id, landlordId, name, phoneNumber, houseNumber, rentAccount, paymentStatus, paymentHistory) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      id, landlordId, name, phoneNumber, houseNumber, rentAccount, paymentStatus, paymentHistory
    );
    const newTenant = await db.get('SELECT * FROM tenants WHERE id = ?', id);
    newTenant.paymentHistory = [];
    res.status(201).json({ message: 'Tenant added', tenant: newTenant });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Update tenant payment status
app.put('/api/tenants/:tenantId/payment', async (req, res) => {
  const { tenantId } = req.params;
  const { paymentStatus, amount, month } = req.body;
  if (!paymentStatus || !amount || !month) {
    return res.status(400).json({ error: 'Payment status, amount, and month are required' });
  }
  try {
    const tenant = await db.get('SELECT * FROM tenants WHERE id = ?', tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    let paymentHistory = tenant.paymentHistory ? JSON.parse(tenant.paymentHistory) : [];
    paymentHistory.push({ amount, month, date: new Date().toISOString(), status: paymentStatus });
    await db.run(
      'UPDATE tenants SET paymentStatus = ?, paymentHistory = ? WHERE id = ?',
      paymentStatus, JSON.stringify(paymentHistory), tenantId
    );
    const updatedTenant = await db.get('SELECT * FROM tenants WHERE id = ?', tenantId);
    updatedTenant.paymentHistory = paymentHistory;
    res.json({ message: 'Payment status updated', tenant: updatedTenant });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// Initialize DB and start server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Sanuel Property Managers backend running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database', err);
  });
