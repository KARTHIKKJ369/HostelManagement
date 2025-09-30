const { supabase } = require('../config/supabase');

class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
  }

  // Generic find all records - uses Supabase client when available
  async findAll(conditions = {}, orderBy = null) {
    try {
      if (supabase) {
        let qb = supabase.from(this.tableName).select('*');

        // Apply simple equality filters
        if (Object.keys(conditions).length > 0) {
          qb = qb.match(conditions);
        }

        if (orderBy) qb = qb.order(orderBy, { ascending: true });

        const { data, error } = await qb;
        if (error) throw error;
        return data || [];
      }

      // Fallback to raw SQL
      let queryText = `SELECT * FROM ${this.tableName}`;
      const values = [];
      let paramCount = 0;

      if (Object.keys(conditions).length > 0) {
        const whereConditions = [];
        for (const [key, value] of Object.entries(conditions)) {
          paramCount++;
          whereConditions.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        queryText += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      if (orderBy) queryText += ` ORDER BY ${orderBy}`;

      const result = await query(queryText, values);
      return result.rows;
    } catch (error) {
      console.error(`Error in findAll for ${this.tableName}:`, error.message);
      throw error;
    }
  }

  // Generic find by ID
  async findById(id, idColumn = 'id') {
    try {
      if (supabase) {
        const { data, error } = await supabase.from(this.tableName).select('*').eq(idColumn, id).maybeSingle();
        if (error) throw error;
        return data || null;
      }

      const queryText = `SELECT * FROM ${this.tableName} WHERE ${idColumn} = $1`;
      const result = await query(queryText, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error in findById for ${this.tableName}:`, error.message);
      throw error;
    }
  }

  // Generic create record
  async create(data) {
    try {
      if (supabase) {
        const { data: created, error } = await supabase.from(this.tableName).insert(data).select().single();
        if (error) throw error;
        return created;
      }

      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, index) => `$${index + 1}`);

      const queryText = `
        INSERT INTO ${this.tableName} (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;

      const result = await query(queryText, values);
      return result.rows[0];
    } catch (error) {
      console.error(`Error in create for ${this.tableName}:`, error.message);
      throw error;
    }
  }

  // Generic update record
  async update(id, data, idColumn = 'id') {
    try {
      if (supabase) {
        const { data: updated, error } = await supabase.from(this.tableName).update(data).eq(idColumn, id).select().maybeSingle();
        if (error) throw error;
        return updated || null;
      }

      const columns = Object.keys(data);
      const values = Object.values(data);
      const setClause = columns.map((col, index) => `${col} = $${index + 1}`);

      const queryText = `
        UPDATE ${this.tableName}
        SET ${setClause.join(', ')}
        WHERE ${idColumn} = $${values.length + 1}
        RETURNING *
      `;

      values.push(id);
      const result = await query(queryText, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error in update for ${this.tableName}:`, error.message);
      throw error;
    }
  }

  // Generic delete record
  async delete(id, idColumn = 'id') {
    try {
      if (supabase) {
        const { data: deleted, error } = await supabase.from(this.tableName).delete().eq(idColumn, id).select().maybeSingle();
        if (error) throw error;
        return deleted || null;
      }

      const queryText = `DELETE FROM ${this.tableName} WHERE ${idColumn} = $1 RETURNING *`;
      const result = await query(queryText, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error in delete for ${this.tableName}:`, error.message);
      throw error;
    }
  }

  // Generic count records
  async count(conditions = {}) {
    try {
      if (supabase) {
        // Supabase count via select with count option
        let qb = supabase.from(this.tableName).select('*', { count: 'exact', head: false });
        if (Object.keys(conditions).length > 0) qb = qb.match(conditions);
        const { count, error } = await qb;
        if (error) throw error;
        return count || 0;
      }

      let queryText = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const values = [];
      let paramCount = 0;

      if (Object.keys(conditions).length > 0) {
        const whereConditions = [];
        for (const [key, value] of Object.entries(conditions)) {
          paramCount++;
          whereConditions.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        queryText += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      const result = await query(queryText, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error(`Error in count for ${this.tableName}:`, error.message);
      throw error;
    }
  }
}

module.exports = BaseModel;