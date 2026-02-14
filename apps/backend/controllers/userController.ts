import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Attendance from '../models/Attendance';
import Settings from '../models/Settings';

export const exportUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find().sort({ name: 1 });

        const headers = ['User ID', 'Name', 'Role', 'Departments', 'Created At'];
        const rows = users.map(user => {
            return [
                user.userId || '', // Handle sparse/virtual
                `"${user.name}"`,
                user.role,
                `"${user.departments.join('; ')}"`,
                new Date((user as any).createdAt).toLocaleDateString()
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.attachment(`users_export_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvContent);

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};



export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        // Hash password if provided, default to '123456' if not (for ease)
        const hashedPassword = await bcrypt.hash(req.body.password || '123456', 10);

        const user = await User.create({
            ...req.body,
            password: hashedPassword,
            userId: (req.body.userId || req.body.name.toLowerCase().replace(/\s+/g, '')).toLowerCase(),
            avatar: req.body.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.body.name)}&background=random&color=fff`
        });
        req.app.get('io').emit('refresh_data');
        res.status(201).json(user);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const updateData = { ...req.body };
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }
        if (updateData.userId) {
            updateData.userId = updateData.userId.toLowerCase();
        }

        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        req.app.get('io').emit('refresh_data');
        res.json(user);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        req.app.get('io').emit('refresh_data');
        res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteTeam = async (req: Request, res: Response) => {
    try {
        const teamName = req.params.name;
        // Remove this team from all users' departments array
        await User.updateMany(
            { departments: teamName },
            { $pull: { departments: teamName } }
        );
        req.app.get('io').emit('refresh_data');
        res.json({ message: `Team ${teamName} deleted successfully` });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};


export const renameDepartment = async (req: Request, res: Response) => {
    try {
        const { oldName, newName } = req.body;
        if (!oldName || !newName) return res.status(400).json({ message: 'Old and new names required' });

        // Update Users: Replace oldName with newName in departments array
        await User.updateMany(
            { departments: oldName },
            { $set: { "departments.$": newName } }
        );

        // Update Attendance Records
        await Attendance.updateMany(
            { department: oldName },
            { department: newName }
        );

        // Rename key in teamSettings and teamQrCodes
        const settings = await Settings.findOne();
        if (settings) {
            let changed = false;
            if (settings.teamSettings && settings.teamSettings.has(oldName)) {
                const teamData = settings.teamSettings.get(oldName);
                settings.teamSettings.delete(oldName);
                if (teamData) settings.teamSettings.set(newName, teamData);
                changed = true;
            }
            if (settings.teamQrCodes && settings.teamQrCodes.has(oldName)) {
                const qrData = settings.teamQrCodes.get(oldName);
                settings.teamQrCodes.delete(oldName);
                if (qrData) settings.teamQrCodes.set(newName, qrData);
                changed = true;
            }
            if (changed) await settings.save();
        }

        req.app.get('io').emit('refresh_data');
        res.json({ message: `Department renamed from ${oldName} to ${newName}` });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Seed mock users if empty
export const seedUsers = async () => {
    const count = await User.countDocuments();
    if (count === 0) {
        const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(initialPassword, 10);

        await User.insertMany([
            { userId: 'uvers_admin', password: hashedPassword, name: 'UVERS Academy Admin', role: 'ADMIN', departments: ['Management'], avatar: 'https://ui-avatars.com/api/?name=U+A&background=004085&color=fff' },
            { userId: 'uvers_lead', password: hashedPassword, name: 'UVERS Lead Supervisor', role: 'SUPERVISOR', departments: ['Academy Ops'], avatar: 'https://ui-avatars.com/api/?name=U+L&background=FFCC00&color=000' },
            { userId: 'uvers_member', password: hashedPassword, name: 'Academy Member', role: 'EMPLOYEE', departments: ['Academy Ops'], avatar: 'https://ui-avatars.com/api/?name=A+M&background=FF4B4B&color=fff' }
        ]);

        console.log('\n✅ SEEDING COMPLETE');
        console.log('---------------------------------------------------');
        console.log('Use the following credentials to login:');
        console.log(`User ID:  uvers_admin`);
        console.log(`Password: ${initialPassword}`);
        console.log('---------------------------------------------------\n');
    }
};
