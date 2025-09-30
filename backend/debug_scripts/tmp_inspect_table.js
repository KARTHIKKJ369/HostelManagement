const { supabase } = require('../config/supabase');

(async ()=>{
  try{
    const tables = ['allotment_applications','application_preferences','allotment_applications_v2'];
    for(const t of tables){
      try{
        const { data, error } = await supabase.from(t).select('*').limit(5);
        if(error){
          console.log(`Table ${t}: error:`, error.message || error);
        } else if(!data || data.length === 0){
          console.log(`Table ${t}: exists but empty or no rows`);
        } else {
          console.log(`Table ${t}: sample row:`);
          console.dir(data[0]);
        }
      }catch(e){
        console.log(`Table ${t}: exception:`, e && e.message ? e.message : e);
      }
    }
    process.exit(0);
  }catch(e){
    console.error('fatal', e && e.message?e.message:e);
    process.exit(1);
  }
})();
