const { supabase } = require('./supabase');
require('dotenv').config();

// Optionally create a pg Pool only if SUPABASE_DB_URL is explicitly provided.
let pool = null;
let query = null;
let getClient = null;

if (process.env.SUPABASE_DB_URL) {
  const { Pool } = require('pg');
  const poolConfig = {
    connectionString: process.env.SUPABASE_DB_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: { rejectUnauthorized: false }
  };
  pool = new Pool(poolConfig);

  query = async (text, params) => {
    try {
      const start = Date.now();
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('🔍 Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (err) {
      console.error('❌ Database query error:', err.message);
      throw err;
    }
  };

  getClient = async () => {
    try {
      const client = await pool.connect();
      return client;
    } catch (err) {
      console.error('❌ Error getting database client:', err.message);
      throw err;
    }
  };
}

// Test connection checks Supabase client first (preferred). If SUPABASE_DB_URL provided, also verify pg pool.
const testConnection = async () => {
  // Verify supabase client
  if (!supabase) {
    console.error('❌ SUPABASE client not configured. Please set SUPABASE_URL and SUPABASE_KEY.');
    process.exit(1);
  }

  try {
    // Simple RPC or select to verify supabase credentials (use pg_meta if available)
    const { data, error } = await supabase.from('users').select('user_id').limit(1);
    if (error) {
      console.error('❌ Supabase test query failed:', error.message || error);
      throw error;
    }
    console.log('✅ Supabase client is available and queryable');
  } catch (err) {
    console.error('❌ Error testing Supabase client:', err.message || err);
    process.exit(1);
  }

  // If pg pool exists, verify it too
  if (pool) {
    try {
      const client = await pool.connect();
      client.release();
      console.log('✅ Connected to Supabase Postgres via SUPABASE_DB_URL');
    } catch (err) {
      console.warn('⚠️ SUPABASE_DB_URL provided but pg connection failed:', err.message);
    }
  }
};

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  supabase
};