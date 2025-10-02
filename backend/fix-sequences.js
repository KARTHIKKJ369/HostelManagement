const { supabase } = require('./config/supabase');

async function fixSequences() {
  try {
    console.log('🔧 Fixing database sequences...');
    
    // Fix hostels sequence
    const { data: hostels, error: hostelError } = await supabase
      .from('hostels')
      .select('hostel_id')
      .order('hostel_id', { ascending: false })
      .limit(1);
    
    if (hostelError) {
      console.error('Error getting max hostel_id:', hostelError);
    } else {
      const maxHostelId = hostels.length > 0 ? hostels[0].hostel_id : 0;
      console.log(`Max hostel_id found: ${maxHostelId}`);
      
      // Reset the sequence to start from the next number
      const { error: seqError } = await supabase.rpc('reset_hostels_sequence', { 
        new_value: maxHostelId + 1 
      });
      
      if (seqError) {
        console.log('RPC function not available, using direct SQL...');
        
        // Alternative: Use raw SQL if RPC doesn't work
        const { error: sqlError } = await supabase.rpc('exec_sql', {
          query: `SELECT setval('hostels_hostel_id_seq', ${maxHostelId + 1}, false);`
        });
        
        if (sqlError) {
          console.error('Could not reset sequence via SQL:', sqlError);
          console.log('Manual fix needed: Run this SQL in your database:');
          console.log(`SELECT setval('hostels_hostel_id_seq', ${maxHostelId + 1}, false);`);
        } else {
          console.log('✅ Hostels sequence fixed via SQL');
        }
      } else {
        console.log('✅ Hostels sequence fixed via RPC');
      }
    }
    
    // Fix other sequences too
    const tables = [
      { table: 'users', id_col: 'user_id', seq: 'users_user_id_seq' },
      { table: 'rooms', id_col: 'room_id', seq: 'rooms_room_id_seq' },
      { table: 'students', id_col: 'student_id', seq: 'students_student_id_seq' },
      { table: 'room_allotments', id_col: 'allotment_id', seq: 'room_allotments_allotment_id_seq' }
    ];
    
    for (const tableInfo of tables) {
      const { data, error } = await supabase
        .from(tableInfo.table)
        .select(tableInfo.id_col)
        .order(tableInfo.id_col, { ascending: false })
        .limit(1);
      
      if (!error && data.length > 0) {
        const maxId = data[0][tableInfo.id_col];
        console.log(`Max ${tableInfo.id_col}: ${maxId}, fixing sequence ${tableInfo.seq}`);
        
        // For now, just log what should be done
        console.log(`SQL to run: SELECT setval('${tableInfo.seq}', ${maxId + 1}, false);`);
      }
    }
    
    console.log('\n📝 To manually fix all sequences, run these SQL commands in your Supabase SQL editor:');
    
  } catch (error) {
    console.error('❌ Error fixing sequences:', error);
  }
}

fixSequences();