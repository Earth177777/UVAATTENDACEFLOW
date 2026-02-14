import express from 'express';
import * as UserController from '../controllers/userController';
import * as SettingsController from '../controllers/settingsController';
import * as AttendanceController from '../controllers/attendanceController';

import * as AuthController from '../controllers/authController';

const router = express.Router();

// Auth Routes
router.post('/auth/login', AuthController.login);
router.put('/auth/change-password', AuthController.changePassword);

// User Routes
router.get('/users', UserController.getUsers);
router.get('/export/users', UserController.exportUsers);
router.post('/users', UserController.createUser);
router.put('/users/:id', UserController.updateUser);
router.delete('/users/:id', UserController.deleteUser);
router.delete('/teams/:name', UserController.deleteTeam);
router.put('/departments/rename', UserController.renameDepartment);

// Settings Routes
router.get('/settings', SettingsController.getSettings);
router.put('/settings', SettingsController.updateSettings);
router.post('/settings/refresh-qr', SettingsController.refreshQrCode);

// Attendance Routes
router.get('/records', AttendanceController.getRecords);
router.get('/export/attendance', AttendanceController.exportAttendance);
router.post('/attendance', AttendanceController.markAttendance);
router.post('/records', AttendanceController.createManualRecord);
router.put('/records/:id', AttendanceController.updateRecord);

router.delete('/records/all', AttendanceController.deleteAllRecords);
router.delete('/records/:id', AttendanceController.deleteRecord);

// Network Check Route (for admin to verify access)
router.get('/network-check', (req, res) => {
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    // Handle multiple IPs in x-forwarded-for header
    const ip = Array.isArray(clientIP) ? clientIP[0] : clientIP.split(',')[0].trim();
    res.json({
        ip,
        timestamp: new Date().toISOString()
    });
});

export default router;
