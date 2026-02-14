const mongoose = require('mongoose');
const User = require('./apps/backend/models/User').default;

async function checkUsers() {
    try {
        await mongoose.connect('mongodb://localhost:27017/attendflow');
        console.log('Connected to MongoDB');
        const users = await User.find({}, 'userId name role');
        console.log('Users in database:', JSON.stringify(users, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkUsers();
