(async ()=>{
  try{
    const { supabase } = require('../config/supabase');
    const { data, error } = await supabase.from('users').select('user_id,username,password_hash');
    if(error){
      console.error('Error fetching users:', error.message || error);
      process.exit(1);
    }
    const bad = [];
    for(const u of data || []){
      const h = u.password_hash || '';
      const len = h.length;
      const ok = /^\$2[aby]\$\d{2}\$/.test(h) && len === 60;
      if(!ok){
        bad.push({ user_id: u.user_id, username: u.username, hash: h, length: len });
      }
    }
    if(bad.length === 0){
      console.log('All user password hashes look OK (bcrypt-like, length 60)');
    } else {
      console.log('Users with suspicious password_hash values:');
      console.table(bad);
    }
    process.exit(0);
  }catch(e){
    console.error('Fatal:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
