/**
 * Script to create an admin user
 * Usage: node scripts/createAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const bcrypt = require('bcryptjs');

// Admin user details - modify these or set in .env
const adminData = {
  firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
  lastName: process.env.ADMIN_LAST_NAME || 'User',
  username: process.env.ADMIN_USERNAME || 'admin',
  email: process.env.ADMIN_EMAIL || 'admin@glamhub.com',
  password: process.env.ADMIN_PASSWORD || 'Admin@123',
  role: 'admin',
  approvalStatus: 'approved', // Admin is auto-approved
  isActive: true,
  isEmailVerified: true,
  agreeToPrivacyPolicy: true
};

async function createAdmin() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('❌ Error: MONGODB_URI not found in .env file');
      process.exit(1);
    }

    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      $or: [
        { email: adminData.email },
        { username: adminData.username }
      ]
    });

    if (existingAdmin) {
      if (existingAdmin.role === 'admin') {
        console.log('⚠️  Admin user already exists:');
        console.log(`   Email: ${existingAdmin.email}`);
        console.log(`   Username: ${existingAdmin.username}`);
        console.log(`   ID: ${existingAdmin._id}`);
        console.log('\n✅ You can login with these credentials.');
      } else {
        console.error(`❌ Error: User with email ${adminData.email} or username ${adminData.username} already exists with role: ${existingAdmin.role}`);
      }
      await mongoose.disconnect();
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    adminData.password = await bcrypt.hash(adminData.password, salt);

    // Create admin user
    const admin = await User.create(adminData);

    console.log('\n✅ Admin user created successfully!');
    console.log('\n📋 Admin Details:');
    console.log(`   First Name: ${admin.firstName}`);
    console.log(`   Last Name: ${admin.lastName}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Approval Status: ${admin.approvalStatus}`);
    console.log(`   User ID: ${admin._id}`);
    console.log('\n🔐 Login Credentials:');
    console.log(`   Username: ${adminData.username}`);
    console.log(`   Email: ${adminData.email}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'Admin@123'}`);
    console.log('\n⚠️  Please change the password after first login!');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.code === 11000) {
      console.error('   Duplicate key error - username or email already exists');
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
createAdmin();
