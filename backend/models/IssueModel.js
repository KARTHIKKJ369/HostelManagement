const BaseModel = require('./BaseModel');
const { supabase } = require('../config/supabase');

class IssueModel extends BaseModel {
  constructor() {
    super('student_issues');
  }

  async createReport(data) {
    try {
      const payload = {
        student_id: data.student_id ?? null,
        user_id: data.user_id ?? null,
        category: data.category,
        description: data.description,
        location: data.location,
        is_anonymous: !!data.is_anonymous,
        status: data.status || 'Open'
      };
      const { data: created, error } = await supabase
        .from('student_issues')
        .insert(payload)
        .select()
        .maybeSingle();
      if (error) throw error;
      return created;
    } catch (error) {
      console.error('Error creating issue report:', error.message);
      throw error;
    }
  }
}

module.exports = new IssueModel();
