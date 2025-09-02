// backend/src/services/DatabaseService.js - Database connection and management
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseService {
  constructor() {
    this.pool = null;
    this.db = null;
    this.useSQLite = process.env.NODE_ENV === 'development' || process.env.USE_SQLITE === 'true';
  }

  async initialize() {
    try {
      if (this.useSQLite) {
        await this.initializeSQLite();
      } else {
        await this.initializePostgreSQL();
      }
      
      await this.runMigrations();
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async initializeSQLite() {
    const dbPath = path.join(__dirname, '../../data/land_registry.db');
    const dbDir = path.dirname(dbPath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('SQLite connection error:', err);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          resolve();
        }
      });
    });
  }

  async initializePostgreSQL() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'land_registry',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres123',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    await this.pool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL database');
  }

  async runMigrations() {
    if (this.useSQLite) {
      await this.runSQLiteMigrations();
    } else {
      await this.runPostgreSQLMigrations();
    }
  }

  async runSQLiteMigrations() {
    const migrations = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'citizen',
        full_name VARCHAR(255),
        national_id VARCHAR(50),
        phone VARCHAR(20),
        address TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS deeds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deed_number VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id INTEGER REFERENCES users(id),
        property_address TEXT NOT NULL,
        property_extent DECIMAL(10,2),
        property_type VARCHAR(100),
        survey_number VARCHAR(100),
        block_number VARCHAR(100),
        lot_number VARCHAR(100),
        document_hash VARCHAR(255),
        ipfs_hash VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS deed_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deed_id INTEGER REFERENCES deeds(id),
        transaction_type VARCHAR(50) NOT NULL,
        from_owner_id INTEGER REFERENCES users(id),
        to_owner_id INTEGER REFERENCES users(id),
        transaction_hash VARCHAR(255),
        block_number INTEGER,
        status VARCHAR(50) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS verification_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        deed_id INTEGER REFERENCES deeds(id),
        verifier_id INTEGER REFERENCES users(id),
        verification_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const migration of migrations) {
      await this.query(migration);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_deeds_number ON deeds(deed_number)',
      'CREATE INDEX IF NOT EXISTS idx_deeds_owner ON deeds(owner_id)',
      'CREATE INDEX IF NOT EXISTS idx_deeds_status ON deeds(status)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_deed ON deed_transactions(deed_id)',
      'CREATE INDEX IF NOT EXISTS idx_verification_deed ON verification_logs(deed_id)'
    ];

    for (const index of indexes) {
      await this.query(index);
    }
  }

  async runPostgreSQLMigrations() {
    const migrations = [
      `CREATE TABLE IF NOT EXISTS users (
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
      )`,
      
      `CREATE TABLE IF NOT EXISTS deeds (
        id SERIAL PRIMARY KEY,
        deed_number VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id INTEGER REFERENCES users(id),
        property_address TEXT NOT NULL,
        property_extent DECIMAL(10,2),
        property_type VARCHAR(100),
        survey_number VARCHAR(100),
        block_number VARCHAR(100),
        lot_number VARCHAR(100),
        document_hash VARCHAR(255),
        ipfs_hash VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS deed_transactions (
        id SERIAL PRIMARY KEY,
        deed_id INTEGER REFERENCES deeds(id),
        transaction_type VARCHAR(50) NOT NULL,
        from_owner_id INTEGER REFERENCES users(id),
        to_owner_id INTEGER REFERENCES users(id),
        transaction_hash VARCHAR(255),
        block_number INTEGER,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS verification_logs (
        id SERIAL PRIMARY KEY,
        deed_id INTEGER REFERENCES deeds(id),
        verifier_id INTEGER REFERENCES users(id),
        verification_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const migration of migrations) {
      await this.query(migration);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_deeds_number ON deeds(deed_number)',
      'CREATE INDEX IF NOT EXISTS idx_deeds_owner ON deeds(owner_id)',
      'CREATE INDEX IF NOT EXISTS idx_deeds_status ON deeds(status)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_deed ON deed_transactions(deed_id)',
      'CREATE INDEX IF NOT EXISTS idx_verification_deed ON verification_logs(deed_id)'
    ];

    for (const index of indexes) {
      await this.query(index);
    }

    // Create trigger function for updating updated_at
    await this.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers
    await this.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await this.query(`
      DROP TRIGGER IF EXISTS update_deeds_updated_at ON deeds;
      CREATE TRIGGER update_deeds_updated_at 
        BEFORE UPDATE ON deeds 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  async query(text, params = []) {
    if (this.useSQLite) {
      return new Promise((resolve, reject) => {
        this.db.all(text, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve({ rows, rowCount: rows.length });
          }
        });
      });
    } else {
      return await this.pool.query(text, params);
    }
  }

  async getConnection() {
    if (this.useSQLite) {
      return this.db;
    } else {
      return await this.pool.connect();
    }
  }

  async close() {
    if (this.useSQLite) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing SQLite database:', err);
          } else {
            console.log('SQLite database connection closed');
          }
          resolve();
        });
      });
    } else {
      await this.pool.end();
      console.log('PostgreSQL connection pool closed');
    }
  }
}

module.exports = new DatabaseService();