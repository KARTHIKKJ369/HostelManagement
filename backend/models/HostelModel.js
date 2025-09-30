const BaseModel = require('./BaseModel');
const { supabase } = require('../config/supabase');

class HostelModel extends BaseModel {
  constructor() {
    super('hostels');
  }

  async findByType(hostelType) {
    try {
      const { data, error } = await supabase.from('hostels').select('*').eq('hostel_type', hostelType).order('hostel_name', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding hostels by type:', error.message);
      throw error;
    }
  }

  async findWithWarden(hostelId) {
    try {
      const { data, error } = await supabase.from('hostels').select('*, users:users( username, email, phone )').eq('hostel_id', hostelId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      if (data.users) {
        data.warden_username = data.users.username;
        data.warden_email = data.users.email;
        data.warden_phone = data.users.phone;
        delete data.users;
      }
      return data;
    } catch (error) {
      console.error('Error finding hostel with warden:', error.message);
      throw error;
    }
  }

  async getOccupancyStats(hostelId) {
    try {
      // Basic stats by fetching rooms and allotments and computing client-side
      const [{ data: hostel }, { data: rooms }, { data: allotments }] = await Promise.all([
        supabase.from('hostels').select('*').eq('hostel_id', hostelId).maybeSingle(),
        supabase.from('rooms').select('*').eq('hostel_id', hostelId),
        supabase.from('room_allotments').select('*').eq('status', 'Active')
      ]);

      if (!hostel) return null;
      const total_room_count = rooms ? rooms.length : 0;
      const vacant_rooms = rooms ? rooms.filter(r => r.status === 'Vacant').length : 0;
      const occupied_rooms = rooms ? rooms.filter(r => r.status === 'Occupied').length : 0;
      const maintenance_rooms = rooms ? rooms.filter(r => r.status === 'Under Maintenance').length : 0;
      const total_capacity = rooms ? rooms.reduce((s, r) => s + (r.capacity || 0), 0) : 0;
      const current_students = allotments ? allotments.filter(a => rooms.some(r => r.room_id === a.room_id)).length : 0;

      return {
        hostel_name: hostel.hostel_name,
        total_rooms: hostel.total_rooms,
        hostel_type: hostel.hostel_type,
        total_room_count,
        vacant_rooms,
        occupied_rooms,
        maintenance_rooms,
        total_capacity,
        current_students
      };
    } catch (error) {
      console.error('Error getting hostel occupancy stats:', error.message);
      throw error;
    }
  }

  async findAllWithStats() {
    try {
      // Simplified: fetch hostels and compute stats per-hostel
      const { data: hostels, error } = await supabase.from('hostels').select('*').order('hostel_name', { ascending: true });
      if (error) throw error;
      if (!hostels) return [];

      const results = [];
      for (const h of hostels) {
        const roomsRes = await supabase.from('rooms').select('*').eq('hostel_id', h.hostel_id);
        const rooms = roomsRes.data || [];
        const room_count = rooms.length;
        const vacant_rooms = rooms.filter(r => r.status === 'Vacant').length;
        const occupied_rooms = rooms.filter(r => r.status === 'Occupied').length;
        results.push({ ...h, room_count, vacant_rooms, occupied_rooms });
      }
      return results;
    } catch (error) {
      console.error('Error finding hostels with stats:', error.message);
      throw error;
    }
  }

  async updateRoomCount(hostelId) {
    try {
      const roomsRes = await supabase.from('rooms').select('*').eq('hostel_id', hostelId);
      if (roomsRes.error) throw roomsRes.error;
      const total_rooms = roomsRes.data ? roomsRes.data.length : 0;
      const { data, error } = await supabase.from('hostels').update({ total_rooms }).eq('hostel_id', hostelId).select().maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error updating room count:', error.message);
      throw error;
    }
  }

  async findByWarden(wardenId) {
    try {
      const { data, error } = await supabase.from('hostels').select('*, rooms(room_id)').eq('warden_id', wardenId).order('hostel_name', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding hostels by warden:', error.message);
      throw error;
    }
  }
}

module.exports = new HostelModel();