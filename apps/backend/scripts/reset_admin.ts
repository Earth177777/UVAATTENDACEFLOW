
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
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const user = await User.findOneAndUpdate(
            { userId: adminId },
            {
                userId: adminId,
                password: hashedPassword,
                name: 'UVERS Academy Admin',
                role: 'ADMIN',
                departments: ['Management'],
                avatar: 'https://ui-avatars.com/api/?name=U+A&background=004085&color=fff'
            },
            { upsert: true, new: true }
        );

        console.log(`\n✅ Admin user '${adminId}' is now active with password: ${newPassword}`);

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error resetting password:', error);
        process.exit(1);
    }
};

resetAdminPassword();
