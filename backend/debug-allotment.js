const { RoomAllotmentModel } = require('./models');

async function debugAllotment() {
  try {
    console.log('Testing findActiveByStudent for student_id: 1');
    const result = await RoomAllotmentModel.findActiveByStudent(1);
    console.log('Raw result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugAllotment();