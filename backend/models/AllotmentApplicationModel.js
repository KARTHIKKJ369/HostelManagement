const BaseModel = require('./BaseModel');
const { supabase } = require('../config/supabase');

class AllotmentApplicationModel extends BaseModel {
  constructor() {
    super('allotment_applications');
  }

  // Find the most recent application by user
  async findLatestByUser(userId) {
    try {
      if (supabase) {
        const { data, error } = await supabase.from(this.tableName)
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        return data || null;
      }
      return null;
    } catch (error) {
      console.error('Error in findLatestByUser:', error.message);
      throw error;
    }
  }

  // Find application by user and status
  async findByUserAndStatus(userId, status) {
    try {
      if (supabase) {
        const { data, error } = await supabase.from(this.tableName)
          .select('*')
          .eq('user_id', userId)
          .eq('status', status)
          .maybeSingle();
        if (error) throw error;
        return data || null;
      }
      return null;
    } catch (error) {
      console.error('Error in findByUserAndStatus:', error.message);
      throw error;
    }
  }
}

module.exports = new AllotmentApplicationModel();
