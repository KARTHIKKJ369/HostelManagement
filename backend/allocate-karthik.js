const { RoomAllotmentModel } = require('./models');

async function allocateKarthik() {
  try {
    console.log('Creating room allotment for Karthik (student_id: 1) to room A-101 (room_id: 1)...');
    
    const allotment = await RoomAllotmentModel.createAllotment(1, 1);
    console.log('✅ Successfully created allotment:', allotment);
    
  } catch (error) {
    console.error('❌ Error creating allotment:', error.message);
    
    // If the error is that student already has an active allotment, that's fine
    if (error.message.includes('already has an active room allotment')) {
      console.log('✅ Karthik already has an active room allotment');
    }
  }
}

allocateKarthik();