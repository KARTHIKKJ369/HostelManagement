const { UserModel } = require('./models');

async function createSuperAdmin() {
  try {
    console.log('Creating SuperAdmin user...');
    
    // Check if SuperAdmin already exists
    const existingAdmin = await UserModel.findByUsername('admin');
    if (existingAdmin) {
      console.log('✅ SuperAdmin user already exists');
      console.log('Username: admin');
      console.log('You can use this to login to the admin dashboard');
      return;
    }
    
    // Create SuperAdmin user
    const superAdmin = await UserModel.create({
      username: 'admin',
      password: 'Admin@123', // This will be hashed by the UserModel
      role: 'SuperAdmin',
      email: 'admin@hostel.com',
      phone: '+91 9999999999'
    });
    
    console.log('✅ SuperAdmin user created successfully!');
    console.log('Login Credentials:');
    console.log('Username: admin');
    console.log('Password: Admin@123');
    console.log('Email:', superAdmin.email);
    console.log('Role:', superAdmin.role);
    
  } catch (error) {
    console.error('❌ Error creating SuperAdmin:', error.message);
  }
}

createSuperAdmin();