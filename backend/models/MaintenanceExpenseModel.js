const BaseModel = require('./BaseModel');
const { supabase } = require('../config/supabase');

class MaintenanceExpenseModel extends BaseModel {
  constructor() {
    super('maintenance_expenses');
  }

  async createExpense(payload) {
    const { data, error } = await supabase
      .from('maintenance_expenses')
      .insert(payload)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async listByRequestIds(requestIds) {
    if (!requestIds || !requestIds.length) return [];
    const { data, error } = await supabase
      .from('maintenance_expenses')
      .select('*')
      .in('request_id', requestIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async sumForRequestIds(requestIds, monthOnly = false) {
    if (!requestIds || !requestIds.length) return 0;
    let qb = supabase
      .from('maintenance_expenses')
      .select('amount, created_at')
      .in('request_id', requestIds);
    if (monthOnly) {
      const first = new Date();
      first.setDate(1);
      qb = qb.gte('created_at', first.toISOString());
    }
    const { data, error } = await qb;
    if (error) throw error;
    return (data || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  }
}

module.exports = new MaintenanceExpenseModel();
