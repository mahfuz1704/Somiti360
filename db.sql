-- স্বপ্ন (Shopno) - Database Schema
CREATE DATABASE IF NOT EXISTS somiti360;
USE somiti360;

-- Members table
CREATE TABLE IF NOT EXISTS members (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    join_date DATE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deposits table
CREATE TABLE IF NOT EXISTS deposits (
    id VARCHAR(50) PRIMARY KEY,
    member_id VARCHAR(50),
    amount DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    month TINYINT NOT NULL,
    year SMALLINT NOT NULL,
    type VARCHAR(50), -- e.g., 'monthly'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Investments table
CREATE TABLE IF NOT EXISTS investments (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    date DATE NOT NULL,
    type VARCHAR(100),
    status ENUM('active', 'closed') DEFAULT 'active',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Investment Returns table
CREATE TABLE IF NOT EXISTS investment_returns (
    id VARCHAR(50) PRIMARY KEY,
    investment_id VARCHAR(50),
    amount DECIMAL(15, 2) NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE CASCADE
);

-- Donations table
CREATE TABLE IF NOT EXISTS donations (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    date DATE NOT NULL,
    recipient VARCHAR(200),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activities/Logs table
CREATE TABLE IF NOT EXISTS activities (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    action TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
