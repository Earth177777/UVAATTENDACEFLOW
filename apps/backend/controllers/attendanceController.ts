import { Request, Response } from 'express';
import Attendance, { Status } from '../models/Attendance';
import Settings from '../models/Settings';
import User from '../models/User';

export const exportAttendance = async (req: Request, res: Response) => {
    try {
        const records = await Attendance.find().sort({ date: -1, checkInTime: -1 }).populate('userId', 'userId name');

        const headers = ['Date', 'Name', 'User ID', 'Department', 'Check In', 'Check Out', 'Status', 'Method', 'Notes'];
        const rows = records.map((record: any) => {
            const checkIn = record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-US', { hour12: false }) : '';
            const checkOut = record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-US', { hour12: false }) : '';

            // Handle populated user vs raw ID
            const userId = record.userId?.userId || (typeof record.userId === 'string' ? record.userId : 'Unknown');

            return [
                record.date,
                `"${record.userName}"`,
                userId,
                record.department,
                checkIn,
                checkOut,
                record.status,
                record.method,
                `"${record.notes || ''}"`
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.attachment(`attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvContent);

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};



export const getRecords = async (req: Request, res: Response) => {
    try {
        const records = await Attendance.find().sort({ createdAt: -1 }).limit(100);
        res.json(records);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const markAttendance = async (req: Request, res: Response) => {
    try {
        const { userId, type, method, location, specificDepartment, qrCode } = req.body;

        // Try to find user by DB _id (from frontend .id) or by logical userId property
        let user = await User.findById(userId);
        if (!user && userId) {
            user = await User.findOne({ userId });
        }

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const settings = await Settings.findOne();
        if (!settings) return res.status(500).json({ success: false, message: 'System configuration error' });

        // Get Client IP
        const clientIPRaw = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        const clientIP = Array.isArray(clientIPRaw) ? clientIPRaw[0] : clientIPRaw.split(',')[0].trim();

        // Determine the target department for team-specific settings
        const targetDept = specificDepartment || (user.departments.length > 0 ? user.departments[0] : null);
        const teamConfig = targetDept && settings.teamSettings ? settings.teamSettings.get(targetDept) : null;

        // 1. Network/IP Check — team override or global
        if (settings.requireWifi) {
            let allowedList: string[];
            if (teamConfig && teamConfig.useCustomIPs && teamConfig.allowedIPs.length > 0) {
                allowedList = teamConfig.allowedIPs;
            } else {
                allowedList = Array.isArray(settings.allowedIPs) ? settings.allowedIPs : [];
            }
            if (allowedList.length === 0) {
                console.warn("Network requirement enabled but no allowed IPs configured.");
            } else {
                if (!allowedList.includes(clientIP)) {
                    return res.status(403).json({
                        success: false,
                        message: `Unauthorized network. Your IP: ${clientIP}`
                    });
                }
            }
        }

        // 2. Location Check — team override or global
        if (settings.requireLocation) {
            if (!location) return res.status(400).json({ success: false, message: 'Location required' });

            const toRad = (deg: number) => deg * (Math.PI / 180);
            const R = 6371000;

            let locations: any[];
            if (teamConfig && teamConfig.useCustomLocations && teamConfig.officeLocations.length > 0) {
                locations = teamConfig.officeLocations;
            } else {
                locations = (settings.officeLocations && settings.officeLocations.length > 0)
                    ? settings.officeLocations
                    : (settings.officeLocation && settings.officeLocation.lat ? [{
                        name: 'Main Office',
                        lat: settings.officeLocation.lat,
                        lng: settings.officeLocation.lng,
                        radiusMeters: settings.officeLocation.radiusMeters || 500
                    }] : []);
            }

            if (locations.length === 0) {
                // No locations configured — skip location check instead of blocking
                console.warn('Location check enabled but no office locations configured — skipping check');
            } else {
                let withinAny = false;
                for (const office of locations) {
                    const dLat = toRad(office.lat - location.lat);
                    const dLng = toRad(office.lng - location.lng);
                    const a = Math.sin(dLat / 2) ** 2 +
                        Math.cos(toRad(location.lat)) * Math.cos(toRad(office.lat)) *
                        Math.sin(dLng / 2) ** 2;
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const distance = R * c;
                    const radius = office.radiusMeters || 500;
                    console.log(`📍 Location check: ${office.name || 'Office'} — distance=${Math.round(distance)}m, radius=${radius}m, within=${distance <= radius}`);
                    if (distance <= radius) {
                        withinAny = true;
                        break;
                    }
                }

                if (!withinAny) {
                    return res.status(400).json({ success: false, message: 'Too far from any office location' });
                }
            }
        }

        // 3. QR Code Check — additive: team QR OR global QR
        if (settings.requireQr && type === 'IN') {
            if (!qrCode) return res.status(400).json({ success: false, message: 'QR Code required' });

            const nowTs = Date.now();
            let valid = false;

            // Try team QR first (if team has custom QR enabled)
            if (targetDept && teamConfig && teamConfig.useCustomQr && settings.teamQrCodes) {
                const teamQr = settings.teamQrCodes.get(targetDept);
                if (teamQr && teamQr.code === qrCode) {
                    if (nowTs < teamQr.timestamp + teamQr.expiresIn) {
                        valid = true;
                    } else {
                        settings.teamQrCodes.delete(targetDept);
                        await settings.save();
                    }
                }
            }

            // Always also try global QR (additive — global QR works for all)
            if (!valid) {
                const globalQr = settings.globalQrCode;
                if (globalQr && globalQr.code === qrCode) {
                    if (nowTs < globalQr.timestamp + globalQr.expiresIn) {
                        valid = true;
                    } else {
                        settings.globalQrCode = undefined;
                        await settings.save();
                    }
                }
            }

            // Also try any matching team QR if specificDepartment wasn't set
            if (!valid && !targetDept && settings.teamQrCodes) {
                for (const [, teamQr] of settings.teamQrCodes.entries()) {
                    if (teamQr && teamQr.code === qrCode && nowTs < teamQr.timestamp + teamQr.expiresIn) {
                        valid = true;
                        break;
                    }
                }
            }

            if (!valid) {
                return res.status(400).json({ success: false, message: 'Invalid or Expired QR Code' });
            }
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const now = new Date();

        const departmentsToMark = specificDepartment ? [specificDepartment] : user.departments;
        const newRecords = [];

        for (const dept of departmentsToMark) {
            if (type === 'IN') {
                const openRecord = await Attendance.findOne({ userId, date: todayStr, department: dept, checkOutTime: null });
                if (!openRecord) {
                    let status = Status.PRESENT;
                    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });

                    // Schedule cascade: user custom → team custom → global
                    let dayConfig: any = settings.exceptions.get(todayStr);
                    if (!dayConfig) {
                        // 1. User custom schedule
                        if (user.customSchedule && user.customSchedule.get(dayName)) {
                            dayConfig = user.customSchedule.get(dayName);
                        }
                        // 2. Team custom schedule
                        if (!dayConfig) {
                            const deptTeamConfig = settings.teamSettings ? settings.teamSettings.get(dept) : null;
                            if (deptTeamConfig && deptTeamConfig.useCustomSchedule && deptTeamConfig.schedule) {
                                const teamSched = deptTeamConfig.schedule instanceof Map
                                    ? deptTeamConfig.schedule.get(dayName)
                                    : (deptTeamConfig.schedule as any)[dayName];
                                if (teamSched) dayConfig = teamSched;
                            }
                        }
                        // 3. Global schedule
                        if (!dayConfig) {
                            dayConfig = settings.schedule.get(dayName);
                        }
                    }

                    if (dayConfig && dayConfig.enabled) {
                        const [workHour, workMinute] = dayConfig.startTime.split(':').map(Number);
                        const startOfWork = new Date(now);
                        startOfWork.setHours(workHour, workMinute, 0, 0);

                        const diffMinutes = (now.getTime() - startOfWork.getTime()) / 60000;
                        if (diffMinutes > settings.gracePeriodMinutes) status = Status.LATE;
                    }

                    const record = await Attendance.create({
                        userId,
                        userName: user.name,
                        department: dept,
                        date: todayStr,
                        checkInTime: now,
                        status,
                        method,
                        location
                    });
                    newRecords.push(record);
                }
            } else {
                const openRecord = await Attendance.findOne({ userId, date: todayStr, department: dept, checkOutTime: null });
                if (openRecord) {
                    openRecord.checkOutTime = now;
                    // Keep original status (PRESENT/LATE) to preserve history
                    // openRecord.status = Status.CHECKED_OUT; 
                    await openRecord.save();
                    newRecords.push(openRecord);
                }
            }
        }

        if (newRecords.length > 0) {
            req.app.get('io').emit('records_updated', newRecords);
            return res.json({ success: true, message: `Successfully checked ${type}`, records: newRecords });
        } else {
            return res.json({ success: false, message: 'No records to update or already checked in' });
        }

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteRecord = async (req: Request, res: Response) => {
    try {
        const record = await Attendance.findByIdAndDelete(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }
        req.app.get('io').emit('refresh_data');
        res.json({ success: true, message: 'Record deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteAllRecords = async (req: Request, res: Response) => {
    try {
        await Attendance.deleteMany({});
        req.app.get('io').emit('refresh_data');
        res.json({ success: true, message: 'All records deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateRecord = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const record = await Attendance.findByIdAndUpdate(id, updates, { new: true });
        if (!record) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }

        // Ideally fetch full user details if needed, but update usually keeps same user
        // If date changed, might need to re-sort on frontend, but socket sends the updated record.

        // Send array for consistent handling in AppContext listener
        req.app.get('io').emit('records_updated', [record]);
        res.json({ success: true, message: 'Record updated successfully', record });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createManualRecord = async (req: Request, res: Response) => {
    try {
        const { userId, date, checkInTime, checkOutTime, status, method, notes, department } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const record = await Attendance.create({
            userId,
            userName: user.name,
            department: department || user.departments[0] || 'Unassigned',
            date,
            checkInTime,
            checkOutTime,
            status,
            method: method || 'MANUAL',
            notes
        });

        req.app.get('io').emit('records_updated', [record]);
        res.json({ success: true, message: 'Record created successfully', record });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
