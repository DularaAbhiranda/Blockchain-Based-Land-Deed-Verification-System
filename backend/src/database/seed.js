// backend/src/database/seed.js - Database seeding script
const DatabaseService = require('../services/DatabaseService');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Initialize database service
    await DatabaseService.initialize();
    
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    await DatabaseService.query(`
      INSERT INTO users (username, email, password_hash, role, full_name, national_id, phone, address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO NOTHING
    `, [
      'admin',
      'admin@landregistry.com',
      adminPassword,
      'admin',
      'System Administrator',
      'ADMIN001',
      '+1234567890',
      'System Address'
    ]);
    
    // Create government official
    const govPassword = await bcrypt.hash('gov123', 12);
    await DatabaseService.query(`
      INSERT INTO users (username, email, password_hash, role, full_name, national_id, phone, address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO NOTHING
    `, [
      'gov_official',
      'gov@landregistry.com',
      govPassword,
      'government_official',
      'Government Official',
      'GOV001',
      '+1234567891',
      'Government Office'
    ]);
    
    // Create bank official
    const bankPassword = await bcrypt.hash('bank123', 12);
    await DatabaseService.query(`
      INSERT INTO users (username, email, password_hash, role, full_name, national_id, phone, address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO NOTHING
    `, [
      'bank_official',
      'bank@landregistry.com',
      bankPassword,
      'bank_official',
      'Bank Official',
      'BANK001',
      '+1234567892',
      'Bank Office'
    ]);
    
         // Create citizen user
     const citizenPassword = await bcrypt.hash('citizen123', 12);
     await DatabaseService.query(`
       INSERT INTO users (username, email, password_hash, role, full_name, national_id, phone, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO NOTHING
     `, [
       'citizen',
       'citizen@example.com',
       citizenPassword,
       'citizen',
       'John Citizen',
       'CIT001',
       '+1234567893',
       '123 Main Street'
     ]);
     
     // Create legal professional user
     const legalPassword = await bcrypt.hash('legal123', 12);
     await DatabaseService.query(`
       INSERT INTO users (username, email, password_hash, role, full_name, national_id, phone, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO NOTHING
     `, [
       'legal_professional',
       'legal@example.com',
       legalPassword,
       'legal_professional',
       'Jane Lawyer',
       'LEGAL001',
       '+1234567894',
       '456 Law Street'
     ]);
    
         console.log('✅ Database seeding completed successfully');
     console.log('📋 Default users created:');
     console.log('   Admin: admin@landregistry.com / admin123');
     console.log('   Government: gov@landregistry.com / gov123');
     console.log('   Bank: bank@landregistry.com / bank123');
     console.log('   Citizen: citizen@example.com / citizen123');
     console.log('   Legal Professional: legal@example.com / legal123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
