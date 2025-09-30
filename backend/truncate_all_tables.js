(async()=>{
  try{
    const { supabase } = require('./config/supabase');
    // Map table name to its primary key column name
    const tablesInOrder = [
      { table: 'room_allotments', pk: 'allotment_id' },
      { table: 'maintenance_requests', pk: 'request_id' },
      { table: 'notifications', pk: 'notification_id' },
      { table: 'students', pk: 'student_id' },
  { table: 'rooms', pk: 'room_id' },
  // Delete known dependent tables that reference hostels first
  { table: 'allotment_applications', pk: 'application_id' },
  { table: 'application_preferences', pk: 'preference_id' },
  { table: 'hostels', pk: 'hostel_id' },
      { table: 'users', pk: 'user_id' }
    ];

    console.log('Starting truncate of all tables via Supabase (service_role key required)');

    for(const entry of tablesInOrder){
      const table = entry.table;
      const pk = entry.pk;

      // count before using head select to get exact count
      const before = await supabase.from(table).select('*', { head: true, count: 'exact' });
      if(before.error){
        console.error(`Error counting ${table}:`, before.error.message || before.error);
      } else {
        console.log(`${table} before count:`, before.count ?? 'unknown');
      }

      // delete all rows by filtering where primary key IS NOT NULL (safe universal filter)
      const del = await supabase.from(table).delete().not(pk, 'is', null);
      if(del.error){
        console.error(`Error deleting from ${table}:`, del.error.message || del.error);
      } else {
        console.log(`Requested delete on ${table}`);
      }

      // verify zero
      const verify = await supabase.from(table).select('*', { head: true, count: 'exact' });
      if(verify.error){
        console.error(`Error verifying ${table}:`, verify.error.message || verify.error);
      } else {
        console.log(`${table} after count:`, verify.count ?? 'unknown');
      }
    }

    console.log('Truncate operation completed');
    process.exit(0);
  }catch(e){
    console.error('Fatal error during truncate:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
