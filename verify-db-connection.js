// Quick script to verify MongoDB connection and show database info
require('dotenv').config();
const mongoose = require('mongoose');

async function verifyConnection() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    console.log('📍 Connection String:', process.env.MONGODB_URI?.replace(/\/\/.*@/, '//***:***@')); // Hide password
    
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('\n✅ Successfully Connected!');
    console.log('📊 Connection Details:');
    console.log('   - Host:', conn.connection.host);
    console.log('   - Database:', conn.connection.name);
    console.log('   - State:', conn.connection.readyState === 1 ? 'Connected' : 'Disconnected');
    
    // List all collections
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('\n📁 Collections in database:');
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    // Count documents in each collection
    console.log('\n📈 Document Counts:');
    for (const col of collections) {
      const count = await conn.connection.db.collection(col.name).countDocuments();
      console.log(`   - ${col.name}: ${count} documents`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection Error:', error.message);
    process.exit(1);
  }
}

verifyConnection();
