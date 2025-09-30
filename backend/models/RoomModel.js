const BaseModel = require('./BaseModel');
const { supabase } = require('../config/supabase');

class RoomModel extends BaseModel {
  constructor() {
    super('rooms');
  }

  async findByHostel(hostelId) {
    try {
      const { data, error } = await supabase.from('rooms').select('*, hostels(hostel_name, hostel_type)').eq('hostel_id', hostelId).order('room_no', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding rooms by hostel:', error.message);
      throw error;
    }
  }

  async findVacant() {
    try {
      const { data, error } = await supabase.from('rooms').select('*, hostels(hostel_name, hostel_type)').eq('status', 'Vacant').order('room_no', { ascending: true });
      if (error) throw error;
      // Filter rooms with available spots
      const results = (data || []).filter(async (r) => {
        const res = await supabase.from('room_allotments').select('*').eq('room_id', r.room_id).eq('status', 'Active');
        return (res.data || []).length < (r.capacity || 0);
      });
      return results;
    } catch (error) {
      console.error('Error finding vacant rooms:', error.message);
      throw error;
    }
  }

  async findAvailable(hostelType = null) {
    try {
      let qb = supabase.from('rooms').select('*, hostels(hostel_name, hostel_type)').eq('status', 'Vacant');
      if (hostelType) qb = qb.eq('hostels.hostel_type', hostelType);
      const { data, error } = await qb.order('room_no', { ascending: true });
      if (error) throw error;
      // Compute available spots client-side
      const results = [];
      for (const r of data || []) {
        const res = await supabase.from('room_allotments').select('*').eq('room_id', r.room_id).eq('status', 'Active');
        const current = res.data ? res.data.length : 0;
        if (current < (r.capacity || 0)) {
          r.current_occupants = current;
          r.available_spots = (r.capacity || 0) - current;
          results.push(r);
        }
      }
      return results;
    } catch (error) {
      console.error('Error finding available rooms:', error.message);
      throw error;
    }
  }

  async findWithOccupants(roomId) {
    try {
      const { data, error } = await supabase.from('rooms').select('*, hostels(hostel_name, hostel_type, location), room_allotments(status, allotment_date, students(*))').eq('room_id', roomId).maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error finding room with occupants:', error.message);
      throw error;
    }
  }

  async hasAvailableSpace(roomId) {
    try {
      const roomRes = await supabase.from('rooms').select('capacity, status').eq('room_id', roomId).maybeSingle();
      if (roomRes.error) throw roomRes.error;
      const room = roomRes.data;
      if (!room || room.status !== 'Vacant') return false;
      const res = await supabase.from('room_allotments').select('*').eq('room_id', roomId).eq('status', 'Active');
      const current = res.data ? res.data.length : 0;
      return current < (room.capacity || 0);
    } catch (error) {
      console.error('Error checking room availability:', error.message);
      throw error;
    }
  }

  async updateStatusByOccupancy(roomId) {
    try {
      const res = await supabase.from('room_allotments').select('*').eq('room_id', roomId).eq('status', 'Active');
      if (res.error) throw res.error;
      const current = res.data ? res.data.length : 0;
      const roomRes = await supabase.from('rooms').select('capacity, status').eq('room_id', roomId).maybeSingle();
      if (roomRes.error) throw roomRes.error;
      const capacity = roomRes.data ? roomRes.data.capacity : 0;
      const newStatus = current >= capacity ? 'Occupied' : 'Vacant';
      if (roomRes.data && roomRes.data.status !== 'Under Maintenance') {
        const upd = await supabase.from('rooms').update({ status: newStatus }).eq('room_id', roomId).select().maybeSingle();
        if (upd.error) throw upd.error;
        return upd.data || null;
      }
      return roomRes.data || null;
    } catch (error) {
      console.error('Error updating room status:', error.message);
      throw error;
    }
  }

  async findByStatus(status) {
    try {
      const { data, error } = await supabase.from('rooms').select('*, hostels(hostel_name, hostel_type)').eq('status', status).order('room_no', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding rooms by status:', error.message);
      throw error;
    }
  }

  async search(filters = {}) {
    try {
      let qb = supabase.from('rooms').select('*, hostels(hostel_name, hostel_type)');
      if (filters.hostel_id) qb = qb.eq('hostel_id', filters.hostel_id);
      if (filters.status) qb = qb.eq('status', filters.status);
      if (filters.hostel_type) qb = qb.eq('hostels.hostel_type', filters.hostel_type);
      if (filters.room_no) qb = qb.ilike('room_no', `%${filters.room_no}%`);
      qb = qb.order('room_no', { ascending: true });
      const { data, error } = await qb;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching rooms:', error.message);
      throw error;
    }
  }
}

module.exports = new RoomModel();