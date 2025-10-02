const { RoomAllotmentModel } = require('./models');

async function testFindActive() {
  try {
    console.log('Testing findActiveByStudent for student_id: 1');
    
    const allocation = await RoomAllotmentModel.findActiveByStudent(1);
    console.log('✅ Found allocation:', allocation);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFindActive();