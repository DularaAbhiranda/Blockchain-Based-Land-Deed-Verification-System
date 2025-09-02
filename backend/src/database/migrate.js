// backend/src/database/migrate.js - Database migration script
const DatabaseService = require('../services/DatabaseService');
require('dotenv').config();

async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...');
    
    // Initialize database service
    await DatabaseService.initialize();
    
    console.log('✅ Database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
