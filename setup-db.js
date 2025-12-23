const mysql = require('mysql2/promise');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

async function setup() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        multipleStatements: true
    });

    console.log('Connected to MySQL server.');

    try {
        const dbName = process.env.DB_NAME || 'somiti360';
        console.log(`Setting up database: ${dbName}`);

        // Drop foreign key checks to allow dropping tables
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        const tables = ['activities', 'investment_returns', 'deposits', 'donations', 'investments', 'users', 'members'];
        for (const table of tables) {
            await connection.query(`DROP TABLE IF EXISTS ${dbName}.${table}`);
        }
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        const sql = fs.readFileSync('db.sql', 'utf8');
        console.log('Executing db.sql...');
        await connection.query(sql);
        console.log('Database and tables created successfully.');

        // Add a default user if not exists
        const [users] = await connection.query('SELECT * FROM somiti360.users WHERE username = "superadmin"');
        if (users.length === 0) {
            console.log('Adding default superadmin user...');
            await connection.query('INSERT INTO somiti360.users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)',
                ['user-1', 'superadmin', 'admin123', 'Super Admin', 'admin']);
        }

    } catch (err) {
        console.error('Error setting up database:', err);
    } finally {
        await connection.end();
    }
}

setup();
