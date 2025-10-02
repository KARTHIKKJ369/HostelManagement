const { supabase } = require('./config/supabase');

async function checkKarthik() {
  try {
    console.log('Checking Karthik in users table...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'karthik')
      .single();
    
    if (userError) {
      console.error('❌ Error finding user:', userError.message);
      return;
    }
    
    console.log('✅ Found user:', user);
    
    console.log('Checking students table...');
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', user.user_id);
    
    if (studentError) {
      console.error('❌ Error finding student:', studentError.message);
      return;
    }
    
    console.log('✅ Found student records:', student);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkKarthik();