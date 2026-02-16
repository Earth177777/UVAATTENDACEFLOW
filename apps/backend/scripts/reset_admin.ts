
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const resetAdminPassword = async () => {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/attendflow';
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected.');

        const adminId = 'uvers_admin';
        const newPassword = 'ProductionAccess2026';

        const user = await User.findOne({ userId: adminId });
        if (!user) {
            console.log(`❌ User ${adminId} not found!`);
            process.exit(1);
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        console.log(`\n✅ Password for ${adminId} has been reset to: ${newPassword}`);

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error resetting password:', error);
        process.exit(1);
    }
};

resetAdminPassword();
