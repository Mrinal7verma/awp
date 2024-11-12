// app.js
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '..', 'client')));

// Database connection configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'bankist',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Root endpoint to serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, pin } = req.body;

    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    const user = users[0];

    if (!user || pin !== user.pin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user's movements
    const [movements] = await pool.execute(
      'SELECT * FROM movements WHERE user_id = ? ORDER BY created_at DESC',
      [user.id]
    );

    // Include all necessary user data in response
    res.json({
      id: user.id,
      owner: user.owner,
      username: user.username,
      interestRate: user.interest_rate,
      movements: movements,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get account movements
app.get('/api/movements/:userId', async (req, res) => {
  try {
    const [movements] = await pool.execute(
      'SELECT * FROM movements WHERE user_id = ? ORDER BY created_at DESC',
      [req.params.userId]
    );

    if (!movements) {
      return res.status(404).json({ error: 'No movements found' });
    }

    res.json(movements);
  } catch (error) {
    console.error('Error fetching movements:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Transfer money
app.post('/api/transfer', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { fromUserId, toUsername, amount } = req.body;

    // Validate amount
    if (amount <= 0) {
      throw new Error('Invalid amount');
    }

    // Get sender's current balance
    const [senderMovements] = await connection.execute(
      'SELECT SUM(amount) as balance FROM movements WHERE user_id = ?',
      [fromUserId]
    );

    const senderBalance = senderMovements[0].balance || 0;
    if (senderBalance < amount) {
      throw new Error('Insufficient funds');
    }

    // Get receiver's user ID
    const [receivers] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      [toUsername]
    );

    if (!receivers.length) {
      throw new Error('Recipient not found');
    }

    const toUserId = receivers[0].id;

    if (fromUserId === toUserId) {
      throw new Error('Cannot transfer to yourself');
    }

    // Create withdrawal for sender
    await connection.execute(
      'INSERT INTO movements (user_id, amount, type) VALUES (?, ?, ?)',
      [fromUserId, -amount, 'withdrawal']
    );

    // Create deposit for receiver
    await connection.execute(
      'INSERT INTO movements (user_id, amount, type) VALUES (?, ?, ?)',
      [toUserId, amount, 'deposit']
    );

    await connection.commit();
    res.json({ message: 'Transfer successful' });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

app.post('/api/loan', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { userId, amount } = req.body;

    if (amount <= 0) {
      throw new Error('Invalid amount');
    }

    // Check if user has any deposit >= 10% of requested loan
    const [deposits] = await connection.execute(
      'SELECT COUNT(*) as count FROM movements WHERE user_id = ? AND amount >= ? AND type = ?',
      [userId, amount * 0.1, 'deposit']
    );

    if (deposits[0].count === 0) {
      throw new Error('Loan request denied. Insufficient deposit history.');
    }

    // Add loan amount as deposit
    await connection.execute(
      'INSERT INTO movements (user_id, amount, type) VALUES (?, ?, ?)',
      [userId, amount, 'deposit']
    );

    await connection.commit();
    res.json({ message: 'Loan approved' });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

// Close account endpoint
app.delete('/api/users/:userId', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { userId } = req.params;
    const { username, pin } = req.body;

    // Verify user credentials before deletion
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE id = ? AND username = ? AND pin = ?',
      [userId, username, pin]
    );

    if (!users.length) {
      throw new Error('Invalid credentials');
    }

    // Delete movements first due to foreign key constraint
    await connection.execute('DELETE FROM movements WHERE user_id = ?', [
      userId,
    ]);

    // Delete user
    await connection.execute('DELETE FROM users WHERE id = ?', [userId]);

    await connection.commit();
    res.json({ message: 'Account closed successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ error: error.message });
  } finally {
    connection.release();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
