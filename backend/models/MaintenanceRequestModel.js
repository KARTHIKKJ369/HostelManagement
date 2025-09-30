const BaseModel = require('./BaseModel');
const { supabase } = require('../config/supabase');

class MaintenanceRequestModel extends BaseModel {
  constructor() {
    super('maintenance_requests');
  }

  async createRequest(requestData) {
    try {
      if (requestData.priority === 'High' && !requestData.assigned_to) {
        requestData.assigned_to = 'Maintenance Team';
        requestData.status = 'In Progress';
      }
      const { data, error } = await supabase.from('maintenance_requests').insert(requestData).select().maybeSingle();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating maintenance request:', error.message);
      throw error;
    }
  }

  async findByStudent(studentId) {
    try {
      const { data, error } = await supabase.from('maintenance_requests').select('*, rooms(room_no), hostels:rooms!inner(hostel_id)(hostel_name, hostel_type)').eq('student_id', studentId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding requests by student:', error.message);
      throw error;
    }
  }

  async findByRoom(roomId) {
    try {
      const { data, error } = await supabase.from('maintenance_requests').select('*, students(name, reg_no), rooms(room_no), hostels:rooms!inner(hostel_id)(hostel_name)').eq('room_id', roomId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding requests by room:', error.message);
      throw error;
    }
  }

  async findByHostel(hostelId) {
    try {
      // get rooms for hostel
      const roomsRes = await supabase.from('rooms').select('room_id').eq('hostel_id', hostelId);
      if (roomsRes.error) throw roomsRes.error;
      const roomIds = (roomsRes.data || []).map(r => r.room_id);
      if (!roomIds.length) return [];
      const { data, error } = await supabase.from('maintenance_requests').select('*, students(name, reg_no), rooms(room_no)').in('room_id', roomIds).order('priority', { ascending: false }).order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding requests by hostel:', error.message);
      throw error;
    }
  }

  async findByStatus(status) {
    try {
      const { data, error } = await supabase.from('maintenance_requests').select('*, students(name, reg_no), rooms(room_no), hostels:rooms!inner(hostel_id)(hostel_name, hostel_type)').eq('status', status).order('priority', { ascending: false }).order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding requests by status:', error.message);
      throw error;
    }
  }

  async findByCategory(category) {
    try {
      const { data, error } = await supabase.from('maintenance_requests').select('*, students(name, reg_no), rooms(room_no), hostels:rooms!inner(hostel_id)(hostel_name, hostel_type)').eq('category', category).order('priority', { ascending: false }).order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding requests by category:', error.message);
      throw error;
    }
  }

  async findPending() {
    try {
      const { data, error } = await supabase.from('maintenance_requests').select('*, students(name, reg_no), rooms(room_no), hostels:rooms!inner(hostel_id)(hostel_name, hostel_type)').eq('status', 'Pending').order('priority', { ascending: false }).order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding pending requests:', error.message);
      throw error;
    }
  }

  async updateStatus(requestId, status, assignedTo = null) {
    try {
      const updateData = { status, updated_at: new Date().toISOString() };
      if (assignedTo) updateData.assigned_to = assignedTo;
      const { data, error } = await supabase.from('maintenance_requests').update(updateData).eq('request_id', requestId).select().maybeSingle();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating request status:', error.message);
      throw error;
    }
  }

  async assignRequest(requestId, assignedTo) {
    try {
      const { data, error } = await supabase.from('maintenance_requests').update({ assigned_to: assignedTo, status: 'In Progress', updated_at: new Date().toISOString() }).eq('request_id', requestId).select().maybeSingle();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error assigning request:', error.message);
      throw error;
    }
  }

  async completeRequest(requestId) {
    try {
      const { data, error } = await supabase.from('maintenance_requests').update({ status: 'Completed', updated_at: new Date().toISOString() }).eq('request_id', requestId).select().maybeSingle();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error completing request:', error.message);
      throw error;
    }
  }

  async getStatistics() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error, count } = await supabase.from('maintenance_requests').select('*', { count: 'exact' }).gte('created_at', thirtyDaysAgo.toISOString());
      if (error) throw error;
      // Aggregate client-side
      const rows = data || [];
      const stats = {
        total_requests: rows.length,
        pending_requests: rows.filter(r => r.status === 'Pending').length,
        in_progress_requests: rows.filter(r => r.status === 'In Progress').length,
        completed_requests: rows.filter(r => r.status === 'Completed').length,
        high_priority: rows.filter(r => r.priority === 'High').length,
        medium_priority: rows.filter(r => r.priority === 'Medium').length,
        low_priority: rows.filter(r => r.priority === 'Low').length,
        electricity_requests: rows.filter(r => r.category === 'Electricity').length,
        plumbing_requests: rows.filter(r => r.category === 'Plumbing').length,
        cleaning_requests: rows.filter(r => r.category === 'Cleaning').length,
        other_requests: rows.filter(r => r.category === 'Other').length
      };
      return stats;
    } catch (error) {
      console.error('Error getting maintenance statistics:', error.message);
      throw error;
    }
  }

  async search(filters = {}) {
    try {
      let qb = supabase.from('maintenance_requests').select('*, students(name, reg_no), rooms(room_no), hostels:rooms!inner(hostel_id)(hostel_name, hostel_type)');
      if (filters.status) qb = qb.eq('status', filters.status);
      if (filters.category) qb = qb.eq('category', filters.category);
      if (filters.priority) qb = qb.eq('priority', filters.priority);
      if (filters.hostel_id) {
        const roomsRes = await supabase.from('rooms').select('room_id').eq('hostel_id', filters.hostel_id);
        const roomIds = (roomsRes.data || []).map(r => r.room_id);
        qb = qb.in('room_id', roomIds);
      }
      if (filters.assigned_to) qb = qb.ilike('assigned_to', `%${filters.assigned_to}%`);
      if (filters.date_from) qb = qb.gte('created_at', filters.date_from);
      if (filters.date_to) qb = qb.lte('created_at', filters.date_to);
      qb = qb.order('priority', { ascending: false }).order('created_at', { ascending: false });
      const { data, error } = await qb;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching maintenance requests:', error.message);
      throw error;
    }
  }

  async findOverdue() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data, error } = await supabase.from('maintenance_requests').select('*, students(name, reg_no), rooms(room_no), hostels:rooms!inner(hostel_id)(hostel_name, hostel_type)').in('status', ['Pending', 'In Progress']).lt('created_at', sevenDaysAgo.toISOString()).order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding overdue requests:', error.message);
      throw error;
    }
  }
}

module.exports = new MaintenanceRequestModel();