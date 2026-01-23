/**
 * Script to reset admin password
 * Usage: node scripts/resetAdminPassword.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const bcrypt = require('bcryptjs');

const newPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

async function resetAdminPassword() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('❌ Error: MONGODB_URI not found in .env file');
      process.exit(1);
    }

    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ role: 'admin' }).select('+password');
    
    if (!admin) {
      console.error('❌ No admin user found. Please create one first with: npm run create-admin');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('\n📋 Current Admin Details:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Role: ${admin.role}`);

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    admin.password = hashedPassword;
    admin.approvalStatus = 'approved';
    admin.isActive = true;
    await admin.save();

    console.log('\n✅ Admin password reset successfully!');
    console.log('\n🔐 New Login Credentials:');
    console.log(`   Username: ${admin.username}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${newPassword}`);
    console.log('\n⚠️  Please change the password after first login!');

    // Verify password works
    const testMatch = await bcrypt.compare(newPassword, admin.password);
    if (testMatch) {
      console.log('\n✅ Password verification test: PASSED');
    } else {
      console.log('\n⚠️  Password verification test: FAILED (this shouldn\'t happen)');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting admin password:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
resetAdminPassword();
