const jwt = require('jsonwebtoken');
const { UserModel, StudentModel } = require('../models');

class AuthService {
  // Generate JWT token
  generateToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '24h' // Token expires in 24 hours
    });
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Login user
  async login(username, password) {
    try {
      // Find user by username
      const user = await UserModel.findByUsername(username);
      if (!user) {
        throw new Error('Invalid username or password');
      }

      // Verify password
      console.log('🔑 Login: Verifying password for user:', user.username);
      console.log('🔐 Login: Password details:', { 
        hasPlainPassword: !!password, 
        plainPasswordLength: password?.length,
        hasHashedPassword: !!user.password_hash,
        hashedPasswordLength: user.password_hash?.length,
        hashStartsWith: user.password_hash?.substring(0, 7)
      });
      
      const isValidPassword = await UserModel.verifyPassword(password, user.password_hash);
      console.log('✅ Login: Password verification result:', isValidPassword);
      
      if (!isValidPassword) {
        throw new Error('Invalid username or password');
      }

      // Update last login
      await UserModel.updateLastLogin(user.user_id);

      // Generate token
      const tokenPayload = {
        userId: user.user_id,
        username: user.username,
        role: user.role,
        email: user.email
      };
      
      console.log('🎫 Creating JWT token with payload:', tokenPayload);
      const token = this.generateToken(tokenPayload);

      // Return user info (without password) and token
      return {
        user: {
          user_id: user.user_id,
          username: user.username,
          role: user.role,
          email: user.email,
          phone: user.phone,
          created_at: user.created_at,
          last_login: new Date()
        },
        token
      };
    } catch (error) {
      console.error('Login error:', error.message);
      throw error;
    }
  }

  // Register new user
  async register(userData) {
    try {
      // Check if username already exists
      const existingUser = await UserModel.findByUsername(userData.username);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Check if email already exists
      if (userData.email) {
        const existingEmail = await UserModel.findByEmail(userData.email);
        if (existingEmail) {
          throw new Error('Email already exists');
        }
      }

      // Create new user (adminCode already filtered out at route level)
      const newUser = await UserModel.create(userData);

      // Generate token for immediate login
      const tokenPayload = {
        userId: newUser.user_id,
        username: newUser.username,
        role: newUser.role,
        email: newUser.email
      };
      const token = this.generateToken(tokenPayload);

      return {
        user: {
          user_id: newUser.user_id,
          username: newUser.username,
          role: newUser.role,
          email: newUser.email,
          phone: newUser.phone,
          created_at: newUser.created_at
        },
        token
      };
    } catch (error) {
      console.error('Registration error:', error.message);
      throw error;
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get user with password hash via model
      const { UserModel } = require('../models');
      const user = await UserModel.findByIdWithPassword(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await UserModel.verifyPassword(currentPassword, user.password_hash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      await UserModel.updatePassword(userId, newPassword);

      return { message: 'Password updated successfully' };
    } catch (error) {
      console.error('Change password error:', error.message);
      throw error;
    }
  }

  // Refresh token
  async refreshToken(token) {
    try {
      const decoded = this.verifyToken(token);
      
      // Get updated user info
      const user = await UserModel.findByIdSafe(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new token
      const tokenPayload = {
        userId: user.user_id,
        username: user.username,
        role: user.role,
        email: user.email
      };
      const newToken = this.generateToken(tokenPayload);

      return {
        user,
        token: newToken
      };
    } catch (error) {
      console.error('Refresh token error:', error.message);
      throw error;
    }
  }

  // Get user profile
  async getProfile(userId) {
    try {
      const user = await UserModel.findByIdSafe(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      console.error('Get profile error:', error.message);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(userId, updateData) {
    console.log('🚀 AuthService.updateUserProfile called with:', { userId, updateData });
    try {
      console.log('🔄 Starting profile update for user:', userId, 'with data:', updateData);
      
      // Separate data for users table and students table
      const userTableData = {};
      let studentTableData = {};
      
      // Map fields to appropriate tables
      if (updateData.username !== undefined) userTableData.username = updateData.username;
      if (updateData.email !== undefined) userTableData.email = updateData.email;
      if (updateData.phone !== undefined) userTableData.phone = updateData.phone;
      if (updateData.fullName !== undefined) studentTableData.name = updateData.fullName;
      
      console.log('📊 Data mapping:', { userTableData, studentTableData });
      
      // Update users table if there's data for it
      let updatedUser = null;
      if (Object.keys(userTableData).length > 0) {
        console.log('📝 Updating users table with data:', JSON.stringify(userTableData));
        updatedUser = await UserModel.update(userId, userTableData, 'user_id');
        console.log('✅ Users table updated:', !!updatedUser);
      } else {
        console.log('⏭️ No users table data to update, fetching current user');
        // If no users table update, get current user data
        updatedUser = await UserModel.findByIdSafe(userId);
      }
      
      // Update students table if there's data for it
      if (Object.keys(studentTableData).length > 0) {
        console.log('📝 Updating students table...');
        
        // First check if student record exists
        const existingStudent = await StudentModel.findByUserId(userId);
        if (existingStudent) {
          await StudentModel.update(existingStudent.student_id, studentTableData, 'student_id');
          console.log('✅ Students table updated');
        } else {
          console.log('⚠️ No student record found for user_id:', userId);
        }
      }
      
      if (updatedUser) {
        // Remove sensitive data
        const { password_hash, ...safeUser } = updatedUser;
        console.log('✅ Profile update completed successfully');
        return safeUser;
      }
      
      return null;
    } catch (error) {
      console.error('Update profile error:', error.message);
      throw error;
    }
  }

  // Get user by ID (including password hash for verification)
  async getUserById(userId) {
    try {
      console.log('🔍 Getting user by ID:', userId);
      // Use the method that includes password_hash
      const user = await UserModel.findByIdWithPassword(userId);
      console.log('👤 User retrieved:', { 
        found: !!user, 
        userId: user?.user_id, 
        username: user?.username,
        hasPasswordHash: !!user?.password_hash,
        passwordHashLength: user?.password_hash?.length 
      });
      return user;
    } catch (error) {
      console.error('Get user by ID error:', error.message);
      throw error;
    }
  }

  // Verify password
  async verifyPassword(plainPassword, hashedPassword) {
    try {
      console.log('🔐 Verifying password:', { 
        hasPlainPassword: !!plainPassword, 
        plainPasswordLength: plainPassword?.length,
        hasHashedPassword: !!hashedPassword,
        hashedPasswordLength: hashedPassword?.length,
        hashStartsWith: hashedPassword?.substring(0, 7)
      });
      
      const result = await UserModel.verifyPassword(plainPassword, hashedPassword);
      console.log('✅ Password verification result:', result);
      return result;
    } catch (error) {
      console.error('Verify password error:', error.message);
      throw error;
    }
  }

  // Update password
  async updatePassword(userId, newPassword) {
    try {
      return await UserModel.updatePassword(userId, newPassword);
    } catch (error) {
      console.error('Update password error:', error.message);
      throw error;
    }
  }

  // Logout (token blacklisting would be implemented here if needed)
  async logout(token) {
    try {
      // In a production app, you might want to blacklist the token
      // For now, we'll just return success
      return { message: 'Logged out successfully' };
    } catch (error) {
      console.error('Logout error:', error.message);
      throw error;
    }
  }
}

module.exports = new AuthService();