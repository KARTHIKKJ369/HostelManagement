const BaseModel = require('./BaseModel');
const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');

class UserModel extends BaseModel {
  constructor() {
    super('users');
  }

  // Hash password before creating user
  async create(userData) {
    try {
      if (userData.password) {
        const saltRounds = 10;
        userData.password_hash = await bcrypt.hash(userData.password, saltRounds);
        delete userData.password; // Remove plain password
      }

      return await super.create(userData);
    } catch (error) {
      console.error('Error creating user:', error.message);
      throw error;
    }
  }

  // Find user by username
  async findByUsername(username) {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await supabase.from('users').select('*').eq('username', username).maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error finding user by username:', error.message);
      throw error;
    }
  }

  // Find user by email
  async findByEmail(email) {
    try {
      if (!supabase) throw new Error('Supabase client not initialized');
      const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error finding user by email:', error.message);
      throw error;
    }
  }

  // Verify password
  async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Error verifying password:', error.message);
      throw error;
    }
  }

  // Update password
  async updatePassword(userId, newPassword) {
    try {
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(newPassword, saltRounds);
      return await this.update(userId, { password_hash }, 'user_id');
    } catch (error) {
      console.error('Error updating password:', error.message);
      throw error;
    }
  }

  // Update last login
  async updateLastLogin(userId) {
    try {
      if (!supabase) throw new Error('Supabase client not initialized');
      const { data, error } = await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('user_id', userId).select().maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error updating last login:', error.message);
      throw error;
    }
  }

  // Get users by role
  async findByRole(role) {
    try {
      if (!supabase) throw new Error('Supabase client not initialized');
      const { data, error } = await supabase.from('users').select('*').eq('role', role).order('username', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding users by role:', error.message);
      throw error;
    }
  }

  // Get user with additional info (excluding password)
  async findByIdSafe(userId) {
    try {
      if (!supabase) throw new Error('Supabase client not initialized');
      const { data, error } = await supabase.from('users').select('user_id, username, role, email, phone, created_at, last_login').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error finding user safely:', error.message);
      throw error;
    }
  }

  // Override findById to exclude password by default
  async findById(userId) {
    return await this.findByIdSafe(userId);
  }

  // Get user with password hash (for authentication purposes)
  async findByIdWithPassword(userId) {
    try {
      if (!supabase) throw new Error('Supabase client not initialized');
      const { data, error } = await supabase.from('users').select('*').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error finding user with password:', error.message);
      throw error;
    }
  }
}

module.exports = new UserModel();