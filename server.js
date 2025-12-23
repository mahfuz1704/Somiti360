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

// Serve static files from the root directory
app.use(express.static('.'));

// Route for the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper to handle async routes
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Generic GET for any table
app.get('/api/:table', asyncHandler(async (req, res) => {
    const { table } = req.params;
    // Basic protection against SQL injection (for demonstration)
    const allowedTables = ['members', 'deposits', 'investments', 'investment_returns', 'donations', 'users', 'activities'];
    if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: 'Invalid table name' });
    }
    const [rows] = await pool.query(`SELECT * FROM ${table}`);
    res.json(rows);
}));

// Generic POST for any table
app.post('/api/:table', asyncHandler(async (req, res) => {
    const { table } = req.params;
    const allowedTables = ['members', 'deposits', 'investments', 'investment_returns', 'donations', 'users', 'activities'];
    if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: 'Invalid table name' });
    }

    const data = req.body;
    const [result] = await pool.query(`INSERT INTO ${table} SET ?`, [data]);
    res.json({ id: result.insertId, ...data });
}));

// Generic DELETE for any table
app.delete('/api/:table/:id', asyncHandler(async (req, res) => {
    const { table, id } = req.params;
    const allowedTables = ['members', 'deposits', 'investments', 'investment_returns', 'donations', 'users', 'activities'];
    if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: 'Invalid table name' });
    }

    await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
    res.json({ success: true });
}));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
