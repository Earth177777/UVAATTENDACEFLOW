
import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const listUsers = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/attendflow';
        console.log('Connecting to:', MONGODB_URI);
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.');

        const users = await User.find({}, 'userId name role');
        console.log('\n--- User List ---');
        console.log(JSON.stringify(users, null, 2));
        console.log('-----------------\n');

        if (users.length === 0) {
            console.log('⚠️  No users found in database!');
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

listUsers();
