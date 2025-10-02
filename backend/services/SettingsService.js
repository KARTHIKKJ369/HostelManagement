const { supabase } = require('../config/supabase');

// Default settings if DB table doesn't exist yet
const DEFAULT_SETTINGS = {
  application: {
    applications_open: true,
    eligibility: {
      min_cgpa: 0,
      max_keam_rank: 999999
    },
    priority_weights: {
      distance: 0.4,
      performance: 0.6
    }
  },
  rooms: {
    default_capacity: 2,
    allowed_statuses: ['Vacant', 'Occupied', 'Under Maintenance']
  },
  email: {
    enabled: false,
    provider: 'smtp',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_secure: false
  },
  backup: {
    enabled: false,
    frequency: 'weekly',
    retain_days: 30
  },
  security: {
    password_policy: {
      min_length: 8,
      require_numbers: true,
      require_symbols: false
    },
    session_timeout_minutes: 60,
    two_factor_auth: false
  }
};

class SettingsService {
  constructor() {
    this.table = 'system_settings';
    this.key = 'global'; // singleton row
  }

  async getRaw() {
    try {
      const { data, error } = await supabase
        .from(this.table)
        .select('*')
        .eq('key', this.key)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (error) {
      // If table missing, return null to use defaults
      if (error.code === '42P01') {
        return null;
      }
      throw error;
    }
  }

  async getSettings() {
    const row = await this.getRaw();
    if (!row || !row.settings_json) {
      return DEFAULT_SETTINGS;
    }
    // Merge defaults with stored settings (stored takes precedence)
    return this.deepMerge(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), row.settings_json);
  }

  async updateSettings(partialSettings) {
    // Attempt to upsert settings; if table missing, throw a friendly error
    try {
      const current = await this.getSettings();
      const next = this.deepMerge(JSON.parse(JSON.stringify(current)), partialSettings);
      const payload = { key: this.key, settings_json: next };
      const { error } = await supabase
        .from(this.table)
        .upsert(payload, { onConflict: 'key' });
      if (error) throw error;
      return next;
    } catch (error) {
      if (error.code === '42P01') {
        const e = new Error('System settings table not found. Please run the provided migration to enable settings storage.');
        e.status = 501;
        throw e;
      }
      throw error;
    }
  }

  deepMerge(target, source) {
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== 'object') target[key] = {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }
}

module.exports = new SettingsService();
