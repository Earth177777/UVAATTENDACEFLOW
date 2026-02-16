import { Request, Response } from 'express';
import Settings from '../models/Settings';
import Attendance from '../models/Attendance';

export const getSettings = async (req: Request, res: Response) => {
    try {
        const count = await Settings.countDocuments();
        if (count > 1) {
            console.warn(`⚠️ Warning: Found ${count} settings documents. helping to clean up...`);
            const allSettings = await Settings.find().sort({ updatedAt: -1 }); // Newest first
            const [keep, ...remove] = allSettings;

            for (const doc of remove) {
                await Settings.findByIdAndDelete(doc._id);
            }
            console.log(`✅ Cleaned up ${remove.length} duplicate settings documents.`);
            // Continue with 'keep'
        }

        let settings = await Settings.findOne().sort({ updatedAt: -1 });
        if (!settings) {
            // Create default if not exists
            settings = await Settings.create({
                schedule: {
                    'Monday': { enabled: true, startTime: '09:00', endTime: '17:00' },
                    'Tuesday': { enabled: true, startTime: '09:00', endTime: '17:00' },
                    'Wednesday': { enabled: true, startTime: '09:00', endTime: '17:00' },
                    'Thursday': { enabled: true, startTime: '09:00', endTime: '17:00' },
                    'Friday': { enabled: true, startTime: '09:00', endTime: '17:00' },
                    'Saturday': { enabled: false, startTime: '09:00', endTime: '17:00' },
                    'Sunday': { enabled: false, startTime: '09:00', endTime: '17:00' },
                },
                exceptions: {},
                officeLocations: [],
                allowedIPs: [],
                teamSettings: {},
                qrGenerationConfig: { length: 8, prefix: '', includeNumbers: true, includeLetters: true }
            });
        } else {
            // Migration: convert legacy officeLocation → officeLocations[]
            if (settings.officeLocation && settings.officeLocation.lat && (!settings.officeLocations || settings.officeLocations.length === 0)) {
                settings.officeLocations = [{
                    name: 'Main Office',
                    lat: settings.officeLocation.lat,
                    lng: settings.officeLocation.lng,
                    radiusMeters: settings.officeLocation.radiusMeters || 500
                }] as any;
                await settings.save();
            }

            // Migration: convert legacy comma-separated allowedIPs string to array
            if (typeof settings.allowedIPs === 'string' && (settings.allowedIPs as string).length > 0) {
                settings.allowedIPs = (settings.allowedIPs as unknown as string).split(',').map((ip: string) => ip.trim()).filter(Boolean) as any;
                await settings.save();
            }

            // Proactive Pruning: Check if QRs are expired before returning
            const now = Date.now();
            let changed = false;

            if (settings.globalQrCode && now > settings.globalQrCode.timestamp + settings.globalQrCode.expiresIn) {
                settings.globalQrCode = undefined;
                changed = true;
            }

            if (settings.teamQrCodes) {
                for (const [dept, qrData] of settings.teamQrCodes.entries()) {
                    if (now > qrData.timestamp + qrData.expiresIn) {
                        settings.teamQrCodes.delete(dept);
                        changed = true;
                    }
                }
            }

            if (changed) {
                await settings.save();
            }
        }
        res.json(settings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const settings = await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
        // Emit socket event
        req.app.get('io').emit('settings_updated', settings);
        res.json(settings);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const refreshQrCode = async (req: Request, res: Response) => {
    try {
        const { department } = req.body;
        const settings = await Settings.findOne();
        if (!settings) return res.status(500).json({ message: 'System configuration error' });

        // Safe defaults for qrGenerationConfig
        const config = settings.qrGenerationConfig || {};
        const length = config.length || 8;
        const prefix = config.prefix || '';
        const includeNumbers = config.includeNumbers !== false;
        const includeLetters = config.includeLetters !== false;

        let chars = '';
        if (includeNumbers) chars += '0123456789';
        if (includeLetters) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (!chars) chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

        let randomPart = '';
        for (let i = 0; i < length; i++) {
            randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const code = (prefix ? prefix.toUpperCase() : '') + randomPart;
        const expirySeconds = settings.qrExpirySeconds || 10;
        const qrData = {
            code,
            timestamp: Date.now(),
            expiresIn: expirySeconds * 1000
        };

        if (department) {
            if (!settings.teamQrCodes) {
                settings.teamQrCodes = new Map() as any;
            }
            settings.teamQrCodes.set(department, qrData);
        } else {
            settings.globalQrCode = qrData;
        }

        await settings.save();
        req.app.get('io').emit('qr_updated', { department, qrData });
        res.json({ success: true, department, qrData });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const cleanupJunkData = async () => {
    try {
        console.log('🧹 Starting background cleanup...');
        const settings = await Settings.findOne();
        if (!settings) return;

        const now = Date.now();
        let settingsChanged = false;

        // 1. Cleanup Expired Global QR
        if (settings.globalQrCode && now > settings.globalQrCode.timestamp + settings.globalQrCode.expiresIn) {
            settings.globalQrCode = undefined;
            settingsChanged = true;
            console.log('   - Cleared expired global QR code');
        }

        // 2. Cleanup Expired Team QRs
        if (settings.teamQrCodes) {
            for (const [dept, qrData] of settings.teamQrCodes.entries()) {
                if (now > qrData.timestamp + qrData.expiresIn) {
                    settings.teamQrCodes.delete(dept);
                    settingsChanged = true;
                    console.log(`   - Cleared expired QR code for department: ${dept}`);
                }
            }
        }

        if (settingsChanged) {
            await settings.save();
            // Optional: emit to all that QRs might have been cleared
        }

        // 3. Cleanup Old Attendance Records
        if (settings.dataRetentionDays > 0) {
            const retentionDate = new Date();
            retentionDate.setDate(retentionDate.getDate() - settings.dataRetentionDays);

            const result = await Attendance.deleteMany({
                checkInTime: { $lt: retentionDate }
            });

            if (result.deletedCount > 0) {
                console.log(`   - Deleted ${result.deletedCount} old attendance records (older than ${settings.dataRetentionDays} days)`);
            }
        }

        console.log('✅ Cleanup completed.');
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    }
};
