const BaseModel = require('./BaseModel');
const { supabase } = require('../config/supabase');

class RoomAllotmentModel extends BaseModel {
  constructor() {
    super('room_allotments');
  }

  // Create room allotment (approximated transactionally)
  async createAllotment(studentId, roomId) {
    try {
      // Check room details
      const roomRes = await supabase.from('rooms').select('capacity, status').eq('room_id', roomId).maybeSingle();
      if (roomRes.error) throw roomRes.error;
      const room = roomRes.data;
      if (!room) throw new Error('Room not found');
      if (room.status === 'Under Maintenance') throw new Error('Room is under maintenance');

      // Count current occupants
      const occRes = await supabase.from('room_allotments').select('*', { count: 'exact' }).eq('room_id', roomId).eq('status', 'Active');
      if (occRes.error) throw occRes.error;
      const current = occRes.count || 0;
      if (current >= room.capacity) throw new Error('Room is full');

      // Check student
      const studRes = await supabase.from('room_allotments').select('*').eq('student_id', studentId).eq('status', 'Active');
      if (studRes.error) throw studRes.error;
      if ((studRes.data || []).length > 0) throw new Error('Student already has an active room allotment');

      // Insert allotment
      const insertRes = await supabase.from('room_allotments').insert({ student_id: studentId, room_id: roomId, allotment_date: new Date().toISOString().split('T')[0], status: 'Active' }).select().maybeSingle();
      if (insertRes.error) throw insertRes.error;

      // Update room status if full
      if (current + 1 >= room.capacity) {
        await supabase.from('rooms').update({ status: 'Occupied' }).eq('room_id', roomId);
      }

      return insertRes.data;
    } catch (error) {
      console.error('Error creating allotment:', error.message);
      throw error;
    }
  }

  async vacateRoom(allotmentId, vacatedDate = null) {
    try {
      const allotRes = await supabase.from('room_allotments').select('*').eq('allotment_id', allotmentId).eq('status', 'Active').maybeSingle();
      if (allotRes.error) throw allotRes.error;
      if (!allotRes.data) throw new Error('Active allotment not found');
      const allotment = allotRes.data;

      const updateRes = await supabase.from('room_allotments').update({ status: 'Vacated', vacated_date: vacatedDate || new Date().toISOString() }).eq('allotment_id', allotmentId).select().maybeSingle();
      if (updateRes.error) throw updateRes.error;

      // Update room status
      const occRes = await supabase.from('room_allotments').select('*', { count: 'exact' }).eq('room_id', allotment.room_id).eq('status', 'Active');
      if (occRes.error) throw occRes.error;
      const count = occRes.count || 0;
      if (count === 0) {
        await supabase.from('rooms').update({ status: 'Vacant' }).eq('room_id', allotment.room_id);
      }

      return updateRes.data;
    } catch (error) {
      console.error('Error vacating room:', error.message);
      throw error;
    }
  }

  async findWithDetails(allotmentId) {
    try {
      const { data, error } = await supabase.from('room_allotments').select('*, students(*), rooms(room_no, capacity, hostel_id), rooms:rooms!inner(hostel_id)').eq('allotment_id', allotmentId).maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error finding allotment with details:', error.message);
      throw error;
    }
  }

  async findActiveByHostel(hostelId) {
    try {
      // Get rooms for hostel
      const roomsRes = await supabase.from('rooms').select('room_id, room_no, capacity').eq('hostel_id', hostelId);
      if (roomsRes.error) throw roomsRes.error;
      const roomIds = (roomsRes.data || []).map(r => r.room_id);
      if (!roomIds.length) return [];
      const { data, error } = await supabase.from('room_allotments').select('*, students(name, reg_no, year_of_study, department), rooms(room_no, capacity)').in('room_id', roomIds).eq('status', 'Active').order('room_id', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding active allotments by hostel:', error.message);
      throw error;
    }
  }

  async findActiveByStudent(studentId) {
    try {
      const { data, error } = await supabase.from('room_allotments').select('*, rooms(room_no, capacity), hostels:rooms!inner(hostel_id)(hostel_name, hostel_type, location)').eq('student_id', studentId).eq('status', 'Active').maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error finding active allotment by student:', error.message);
      throw error;
    }
  }

  async findHistoryByStudent(studentId) {
    try {
      const { data, error } = await supabase.from('room_allotments').select('*, rooms(room_no), hostels:rooms!inner(hostel_id)(hostel_name, hostel_type)').eq('student_id', studentId).order('allotment_date', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding allotment history:', error.message);
      throw error;
    }
  }

  async findPending() {
    try {
      const { data, error } = await supabase.from('room_allotments').select('*, students(name, reg_no, year_of_study, department), rooms(room_no), hostels:rooms!inner(hostel_id)(hostel_name, hostel_type)').eq('status', 'Pending').order('allotment_date', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding pending allotments:', error.message);
      throw error;
    }
  }

  async approvePending(allotmentId) {
    try {
      const { data, error } = await supabase.from('room_allotments').update({ status: 'Active' }).eq('allotment_id', allotmentId).eq('status', 'Pending').select().maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error approving allotment:', error.message);
      throw error;
    }
  }

  async getOccupancyReport() {
    try {
      const { data: hostels } = await supabase.from('hostels').select('*');
      const results = [];
      for (const h of hostels || []) {
        const roomsRes = await supabase.from('rooms').select('*').eq('hostel_id', h.hostel_id);
        const rooms = roomsRes.data || [];
        const raRes = await supabase.from('room_allotments').select('*').in('room_id', (rooms || []).map(r => r.room_id)).eq('status', 'Active');
        const current_students = raRes.data ? raRes.data.length : 0;
        const total_capacity = rooms.reduce((s, r) => s + (r.capacity || 0), 0);
        const vacant_rooms = rooms.filter(r => r.status === 'Vacant').length;
        const occupied_rooms = rooms.filter(r => r.status === 'Occupied').length;
        const maintenance_rooms = rooms.filter(r => r.status === 'Under Maintenance').length;
        const occupancy_percentage = total_capacity ? Math.round((current_students / total_capacity) * 100 * 100) / 100 : 0;
        results.push({ hostel_name: h.hostel_name, hostel_type: h.hostel_type, total_rooms: rooms.length, vacant_rooms, occupied_rooms, maintenance_rooms, total_capacity, current_students, occupancy_percentage });
      }
      return results;
    } catch (error) {
      console.error('Error getting occupancy report:', error.message);
      throw error;
    }
  }
}

module.exports = new RoomAllotmentModel();