const BaseModel = require('./BaseModel');
const { supabase } = require('../config/supabase');

class NotificationModel extends BaseModel {
  constructor() {
    super('notifications');
  }

  async createForUser(senderId, receiverId, title, message) {
    try {
      const notificationData = { sender_id: senderId, receiver_id: receiverId, receiver_role: null, title, message };
      const { data, error } = await supabase.from('notifications').insert(notificationData).select().maybeSingle();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating user notification:', error.message);
      throw error;
    }
  }

  async createForRole(senderId, receiverRole, title, message) {
    try {
      const notificationData = { sender_id: senderId, receiver_id: null, receiver_role: receiverRole, title, message };
      const { data, error } = await supabase.from('notifications').insert(notificationData).select().maybeSingle();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating role notification:', error.message);
      throw error;
    }
  }

  async createForAll(senderId, title, message) {
    try {
      const notificationData = { sender_id: senderId, receiver_id: null, receiver_role: 'All', title, message };
      const { data, error } = await supabase.from('notifications').insert(notificationData).select().maybeSingle();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating global notification:', error.message);
      throw error;
    }
  }

  async findForUser(userId) {
    try {
      // get user's role
      const ur = await supabase.from('users').select('role').eq('user_id', userId).maybeSingle();
      if (ur.error) throw ur.error;
      const role = ur.data ? ur.data.role : null;

      const { data, error } = await supabase.from('notifications').select('*, users(username) as sender').or(`receiver_id.eq.${userId},receiver_role.eq.All,receiver_role.eq.${role}`).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding notifications for user:', error.message);
      throw error;
    }
  }

  async findRecentForUser(userId, limit = 10) {
    try {
      const ur = await supabase.from('users').select('role').eq('user_id', userId).maybeSingle();
      if (ur.error) throw ur.error;
      const role = ur.data ? ur.data.role : null;
      const { data, error } = await supabase.from('notifications').select('*, users(username) as sender').or(`receiver_id.eq.${userId},receiver_role.eq.All,receiver_role.eq.${role}`).order('created_at', { ascending: false }).limit(limit);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding recent notifications:', error.message);
      throw error;
    }
  }

  async findByRole(role) {
    try {
      const { data, error } = await supabase.from('notifications').select('*, users(username) as sender').or(`receiver_role.eq.${role},receiver_role.eq.All`).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding notifications by role:', error.message);
      throw error;
    }
  }

  async findBySender(senderId) {
    try {
      const { data, error } = await supabase.from('notifications').select('*, users(username) as sender').eq('sender_id', senderId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding notifications by sender:', error.message);
      throw error;
    }
  }

  async getStatistics() {
    try {
      const { data, error } = await supabase.from('notifications').select('*');
      if (error) throw error;
      const rows = data || [];
      return {
        total_notifications: rows.length,
        global_notifications: rows.filter(r => r.receiver_role === 'All').length,
        student_notifications: rows.filter(r => r.receiver_role === 'Student').length,
        warden_notifications: rows.filter(r => r.receiver_role === 'Warden').length,
        individual_notifications: rows.filter(r => r.receiver_id).length,
        recent_notifications: rows.filter(r => new Date(r.created_at) >= new Date(Date.now() - 7*24*60*60*1000)).length
      };
    } catch (error) {
      console.error('Error getting notification statistics:', error.message);
      throw error;
    }
  }

  async deleteOld(daysOld = 30) {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysOld);
      const { data, error } = await supabase.from('notifications').delete().lt('created_at', cutoff.toISOString()).select();
      if (error) throw error;
      return { deleted_count: data ? data.length : 0 };
    } catch (error) {
      console.error('Error deleting old notifications:', error.message);
      throw error;
    }
  }

  async search(filters = {}) {
    try {
      let qb = supabase.from('notifications').select('*, users(username)');
      if (filters.sender_id) qb = qb.eq('sender_id', filters.sender_id);
      if (filters.receiver_role) qb = qb.eq('receiver_role', filters.receiver_role);
      if (filters.title) qb = qb.ilike('title', `%${filters.title}%`);
      if (filters.message) qb = qb.ilike('message', `%${filters.message}%`);
      if (filters.date_from) qb = qb.gte('created_at', filters.date_from);
      if (filters.date_to) qb = qb.lte('created_at', filters.date_to);
      qb = qb.order('created_at', { ascending: false });
      const { data, error } = await qb;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching notifications:', error.message);
      throw error;
    }
  }

  async markAsRead(notificationId, userId) {
    try {
      // Placeholder - implement read tracking table later
      console.log(`Notification ${notificationId} marked as read by user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error.message);
      throw error;
    }
  }

  async bulkCreate(notifications) {
    try {
      if (!notifications.length) return [];
      const { data, error } = await supabase.from('notifications').insert(notifications).select();
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error bulk creating notifications:', error.message);
      throw error;
    }
  }
}

module.exports = new NotificationModel();