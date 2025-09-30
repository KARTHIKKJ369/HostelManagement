(async()=>{
  try{
    const { UserModel } = require('./models');
    const AuthService = require('./services/AuthService');
    const username = 'kripa';
    const newPass = 'KnownPass!234';
    const u = await UserModel.findByUsername(username);
    if(!u){
      console.error('User not found');
      process.exit(1);
    }
    console.log('Found user id=', u.user_id);
    await UserModel.updatePassword(u.user_id, newPass);
    console.log('Password updated successfully');
    const res = await AuthService.login(username, newPass);
    console.log('Login success result:', res);
    process.exit(0);
  }catch(e){
    console.error('ERR=', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
