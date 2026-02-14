import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_here';

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'your_secret_here') {
    console.warn('⚠️ WARNING: Using default unsafe JWT_SECRET in production!');
}

export const login = async (req: Request, res: Response) => {
    try {
        const { userId, password } = req.body;

        // Find user by userId or name (case-insensitive)
        const user = await User.findOne({
            $or: [
                { userId: { $regex: new RegExp(`^${userId}$`, 'i') } },
                { name: { $regex: new RegExp(`^${userId}$`, 'i') } }
            ]
        }).select('+password');

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        if (!user.password) {
            return res.status(401).json({ message: 'User has no password set. Contact admin.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Return user without password (using toJSON to ensure id virtual is present)
        const userObj = user.toJSON();
        delete (userObj as any).password;

        res.json({
            user: userObj,
            token: 'mock-jwt-token' // In real app, sign JWT here
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;

        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({ message: 'userId, currentPassword, and newPassword are required' });
        }

        if (newPassword.length < 4) {
            return res.status(400).json({ message: 'New password must be at least 4 characters' });
        }

        const user = await User.findOne({ userId }).select('+password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.password) {
            return res.status(400).json({ message: 'User has no password set. Contact admin.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
