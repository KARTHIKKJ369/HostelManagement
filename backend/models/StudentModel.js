const BaseModel = require('./BaseModel');
const { supabase } = require('../config/supabase');

class StudentModel extends BaseModel {
  constructor() {
    super('students');
  }

  async findByRegNo(regNo) {
    try {
      const { data, error } = await supabase.from('students').select('*').eq('reg_no', regNo).maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error finding student by reg_no:', error.message);
      throw error;
    }
  }

  async findByUserId(userId) {
    try {
      const { data, error } = await supabase.from('students').select('*').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error finding student by user_id:', error.message);
      throw error;
    }
  }

  async findStudentWithUser(studentId) {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`*, users(username, email, phone, created_at)`).eq('student_id', studentId).maybeSingle();
      if (error) throw error;
      // Flatten result if necessary
      if (!data) return null;
      if (data.users) {
        data.username = data.users.username;
        data.email = data.users.email;
        data.phone = data.users.phone;
        data.user_created_at = data.users.created_at;
        delete data.users;
      }
      return data;
    } catch (error) {
      console.error('Error finding student with user details:', error.message);
      throw error;
    }
  }

  async findByYear(year) {
    try {
      const { data, error } = await supabase.from('students').select('*, users(username, email)').eq('year_of_study', year).order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding students by year:', error.message);
      throw error;
    }
  }

  async findByDepartment(department) {
    try {
      const { data, error } = await supabase.from('students').select('*, users(username, email)').eq('department', department).order('year_of_study', { ascending: true }).order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding students by department:', error.message);
      throw error;
    }
  }

  async findByCategory(category) {
    try {
      const { data, error } = await supabase.from('students').select('*, users(username, email)').eq('category', category).order('keam_rank', { ascending: true }).order('sgpa', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding students by category:', error.message);
      throw error;
    }
  }

  async findEligibleForAllocation() {
    try {
      // Supabase doesn't support complex left join filtering in the same way; use RPC or filter client-side
      const { data, error } = await supabase.from('students').select('*, users(username, email)').order('category', { ascending: true }).order('keam_rank', { ascending: true }).order('sgpa', { ascending: false });
      if (error) throw error;
      // Filter out students with active allotments
      const { data: allotments, error: raErr } = await supabase.from('room_allotments').select('student_id').eq('status', 'Active');
      if (raErr) throw raErr;
      const activeStudentIds = new Set((allotments || []).map(a => a.student_id));
      return (data || []).filter(s => !activeStudentIds.has(s.student_id));
    } catch (error) {
      console.error('Error finding eligible students:', error.message);
      throw error;
    }
  }

  async findWithCurrentRoom() {
    try {
      // Use view-like multi-select and joins
      const { data, error } = await supabase
        .from('room_allotments')
        .select('*, students(*), rooms(room_no, hostel_id), rooms:rooms!inner(hostel_id)')
        .eq('status', 'Active');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding students with current room:', error.message);
      throw error;
    }
  }

  async search(filters = {}) {
    try {
      let qb = supabase.from('students').select('*, users(username, email)');
      if (filters.name) qb = qb.ilike('name', `%${filters.name}%`);
      if (filters.reg_no) qb = qb.ilike('reg_no', `%${filters.reg_no}%`);
      if (filters.department) qb = qb.eq('department', filters.department);
      if (filters.year_of_study) qb = qb.eq('year_of_study', filters.year_of_study);
      if (filters.category) qb = qb.eq('category', filters.category);
      qb = qb.order('name', { ascending: true });
      const { data, error } = await qb;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching students:', error.message);
      throw error;
    }
  }
}

module.exports = new StudentModel();