const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

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
    // Aiven এর জন্য SSL প্রয়োজন হতে পারে
    ssl: {
        rejectUnauthorized: false
    }
});

// অনুমোদনযোগ্য টেবিল তালিকা
const ALLOWED_TABLES = ['members', 'deposits', 'investments', 'investment_returns', 'donations', 'users', 'activities', 'loans', 'loan_payments', 'expenses'];

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
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

        const data = req.body;
        const [result] = await pool.query(`INSERT INTO ${table} SET ?`, data);
        res.json({ id: result.insertId, ...data });
    } catch (err) {
        console.error(`Error inserting into ${req.params.table}:`, err.message);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

// ডাটা আপডেট করার রুট
app.post('/api/:table/:id', async (req, res) => {
    try {
        const { table, id } = req.params;
        if (!ALLOWED_TABLES.includes(table)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        const data = req.body;
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