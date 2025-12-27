const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt'); // Import bcrypt

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// ডাটাবেস কানেকশন
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.DB_HOST === 'localhost' ? null : { rejectUnauthorized: false }
});

// অনুমোদনযোগ্য টেবিল তালিকা
const ALLOWED_TABLES = ['members', 'deposits', 'investments', 'investment_returns', 'donations', 'users', 'activities', 'loans', 'loan_payments', 'expenses', 'income'];

// Login Endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user by username
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

        if (users.length === 0) {
            return res.json({ success: false, message: 'ভুল ইউজারনেম বা পাসওয়ার্ড!' });
        }

        const user = users[0];

        // Compare password with hash
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            // Success: Return user info (excluding password)
            const { password, ...userWithoutPassword } = user;
            res.json({ success: true, user: userWithoutPassword });
        } else {
            res.json({ success: false, message: 'ভুল ইউজারনেম বা পাসওয়ার্ড!' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'সার্ভার এরর!' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Password Verify Endpoint - পাসওয়ার্ড যাচাই (bcrypt)
app.post('/api/verify-password', async (req, res) => {
    try {
        const { userId, password } = req.body;

        // Find user by ID
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);

        if (users.length === 0) {
            return res.json({ success: false, message: 'ইউজার পাওয়া যায়নি!' });
        }

        const user = users[0];

        // Compare password with hash
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'ভুল পাসওয়ার্ড!' });
        }
    } catch (err) {
        console.error('Password verify error:', err);
        res.status(500).json({ success: false, message: 'সার্ভার এরর!' });
    }
});

// Health check endpoint - ডাটাবেস কানেকশন টেস্ট
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 as test');
        res.json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString(),
            env: {
                DB_HOST: process.env.DB_HOST ? 'set' : 'NOT SET',
                DB_USER: process.env.DB_USER ? 'set' : 'NOT SET',
                DB_PASS: process.env.DB_PASS ? 'set' : 'NOT SET',
                DB_NAME: process.env.DB_NAME ? 'set' : 'NOT SET',
                DB_PORT: process.env.DB_PORT ? 'set' : 'NOT SET'
            }
        });
    } catch (err) {
        console.error('Health check failed:', err.message);
        res.status(500).json({
            status: 'error',
            database: 'disconnected',
            error: err.message,
            code: err.code,
            timestamp: new Date().toISOString(),
            env: {
                DB_HOST: process.env.DB_HOST ? 'set' : 'NOT SET',
                DB_USER: process.env.DB_USER ? 'set' : 'NOT SET',
                DB_PASS: process.env.DB_PASS ? 'set' : 'NOT SET',
                DB_NAME: process.env.DB_NAME ? 'set' : 'NOT SET',
                DB_PORT: process.env.DB_PORT ? 'set' : 'NOT SET'
            }
        });
    }
});

// ডাটা আনার রুট
app.get('/api/:table', async (req, res) => {
    try {
        const { table } = req.params;
        if (!ALLOWED_TABLES.includes(table)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        // প্রতিটি টেবিলের জন্য সঠিক ORDER BY কলাম
        const orderColumn = table === 'activities' ? 'timestamp' : 'created_at';
        const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY ${orderColumn} DESC`);
        res.json(rows);
    } catch (err) {
        console.error(`Error fetching from ${req.params.table}:`, err.message);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

// ডাটা সেভ করার রুট (নতুন ইনসার্ট)
app.post('/api/:table', async (req, res) => {
    try {
        const { table } = req.params;
        if (!ALLOWED_TABLES.includes(table)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        let data = req.body;

        // If table is 'users', hash the password
        if (table === 'users' && data.password) {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(data.password, saltRounds);
            data = { ...data, password: hashedPassword };
        }

        const [result] = await pool.query(`INSERT INTO ${table} SET ?`, data);
        res.json({ id: result.insertId, ...data });
    } catch (err) {
        console.error(`Error inserting into ${req.params.table}:`, err.message);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

// ডাটা আপডেট করার রুট
app.put('/api/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        if (!ALLOWED_TABLES.includes(table)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        let data = req.body;

        // If table is 'users' and password is being updated, hash it
        if (table === 'users' && data.password) {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(data.password, saltRounds);
            data = { ...data, password: hashedPassword };
        }

        const [result] = await pool.query(`UPDATE ${table} SET ? WHERE id = ?`, [data, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        res.json({ id, ...data });
    } catch (err) {
        console.error(`Error updating ${req.params.table}:`, err.message);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

// ডাটা ডিলিট করার রুট
app.delete('/api/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        if (!ALLOWED_TABLES.includes(table)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        const [result] = await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error(`Error deleting from ${req.params.table}:`, err.message);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});