import express from 'express';
import * as UserController from '../controllers/userController';
import * as SettingsController from '../controllers/settingsController';
import * as AttendanceController from '../controllers/attendanceController';
import * as AuthController from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Auth Routes
router.post('/auth/login', AuthController.login);
router.put('/auth/change-password', authenticate, AuthController.changePassword);

// User Routes
router.get('/users', authenticate, UserController.getUsers);
router.get('/export/users', authenticate, authorize(['ADMIN']), UserController.exportUsers);
router.post('/users', authenticate, authorize(['ADMIN']), UserController.createUser);
router.post('/users/bulk', authenticate, authorize(['ADMIN']), UserController.bulkCreateUsers);
router.put('/users/:id', authenticate, authorize(['ADMIN']), UserController.updateUser);
router.delete('/users/:id', authenticate, authorize(['ADMIN']), UserController.deleteUser);
router.delete('/teams/:name', authenticate, authorize(['ADMIN']), UserController.deleteTeam);
router.put('/departments/rename', authenticate, authorize(['ADMIN']), UserController.renameDepartment);

// Settings Routes
router.get('/settings', SettingsController.getSettings); // Often needed for login page logic (e.g. is QR required?)
router.put('/settings', authenticate, authorize(['ADMIN']), SettingsController.updateSettings);
router.post('/settings/refresh-qr', authenticate, authorize(['ADMIN']), SettingsController.refreshQrCode);

// Attendance Routes
router.get('/records', authenticate, authorize(['ADMIN', 'SUPERVISOR']), AttendanceController.getRecords);
router.get('/export/attendance', authenticate, authorize(['ADMIN']), AttendanceController.exportAttendance);
router.post('/attendance', authenticate, AttendanceController.markAttendance); // Must be logged in
router.post('/records', authenticate, authorize(['ADMIN']), AttendanceController.createManualRecord);
router.put('/records/:id', authenticate, authorize(['ADMIN']), AttendanceController.updateRecord);

router.delete('/records/all', authenticate, authorize(['ADMIN']), AttendanceController.deleteAllRecords);
router.delete('/records/:id', authenticate, authorize(['ADMIN']), AttendanceController.deleteRecord);

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
