import express from 'express';
import bcrypt from 'bcrypt';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Database connection pool
const pool = new pkg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
});

// Registration route
router.post('/register', async (req, res) => {
  const { username, password, walletAddress, role } = req.body;

  if (!username || !password || !walletAddress || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check if the username or wallet address already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR wallet_address = $2',
      [username, walletAddress]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username or wallet address already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    const newUserResult = await pool.query(
      'INSERT INTO users (username, password, wallet_address, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [username, hashedPassword, walletAddress, role]
    );

    res.status(201).json({ message: 'User registered successfully', user: newUserResult.rows[0] });

  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { username, password, walletAddress } = req.body;

  if (!username || !password || !walletAddress) {
    return res.status(400).json({ error: 'Username, password, and wallet address are required' });
  }

  try {
    // Find the user by username
    const userResult = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' }); // User not found
    }

    const user = userResult.rows[0];

    // Compare the provided password with the stored hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);

    // Verify the wallet address
    const walletMatch = walletAddress.toLowerCase() === user.wallet_address.toLowerCase();

    if (passwordMatch && walletMatch) {
      // Authentication successful
      // You would typically generate a session or JWT here for persistent login
      return res.status(200).json({ message: 'Login successful', user: { id: user.id, username: user.username, wallet_address: user.wallet_address, role: user.role } });
    } else {
      return res.status(401).json({ error: 'Invalid credentials' }); // Password or wallet address doesn't match
    }

  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// Get user role by wallet address
router.get('/users/:walletAddress', async (req, res) => {
  const { walletAddress } = req.params;

  try {
    const result = await pool.query(
      'SELECT role FROM users WHERE wallet_address = $1',
      [walletAddress]
    );

    if (result.rows.length > 0) {
      res.json({ role: result.rows[0].role });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user role:', error);
    res.status(500).json({ message: 'Error fetching user role' });
  }
});

export default router;