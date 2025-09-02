-- Initial database schema for Blockchain Land Registry System
-- Migration: 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'citizen',
    full_name VARCHAR(255),
    national_id VARCHAR(50),
    phone VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Land deeds table
CREATE TABLE deeds (
    id SERIAL PRIMARY KEY,
    deed_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INTEGER REFERENCES users(id),
    property_address TEXT NOT NULL,
    survey_plan_number VARCHAR(100),
    extent VARCHAR(100),
    boundaries TEXT,
    document_hash VARCHAR(255),
    ipfs_hash VARCHAR(255),
    blockchain_transaction_id VARCHAR(255),
    verification_status VARCHAR(50) DEFAULT 'pending',
    created_by INTEGER REFERENCES users(id),
    verified_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deed transactions table
CREATE TABLE deed_transactions (
    id SERIAL PRIMARY KEY,
    deed_id INTEGER REFERENCES deeds(id),
    transaction_type VARCHAR(100) NOT NULL,
    from_user_id INTEGER REFERENCES users(id),
    to_user_id INTEGER REFERENCES users(id),
    transaction_hash VARCHAR(255),
    blockchain_block_number INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verification logs table
CREATE TABLE verification_logs (
    id SERIAL PRIMARY KEY,
    deed_id INTEGER REFERENCES deeds(id),
    verified_by INTEGER REFERENCES users(id),
    verification_type VARCHAR(100),
    verification_result VARCHAR(50),
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_deeds_owner_id ON deeds(owner_id);
CREATE INDEX idx_deeds_status ON deeds(verification_status);
CREATE INDEX idx_deeds_deed_number ON deeds(deed_number);
CREATE INDEX idx_deed_transactions_deed_id ON deed_transactions(deed_id);
CREATE INDEX idx_verification_logs_deed_id ON verification_logs(deed_id);
CREATE INDEX idx_verification_logs_verified_by ON verification_logs(verified_by);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deeds_updated_at BEFORE UPDATE ON deeds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
