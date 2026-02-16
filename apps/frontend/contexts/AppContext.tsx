import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role, AttendanceRecord, AppSettings, Status, AttendanceMethod, QrCodeData, DaySchedule } from '../types';
import api from '../services/api';
import { socket } from '../services/socket';

const DEFAULT_SETTINGS: AppSettings = {
  schedule: {},
  exceptions: {},
  requireLocation: true,
  requireWifi: false,
  requireQr: false,
  officeLocations: [],
  allowedWifiSSID: '',
  allowedIPs: [],
  gracePeriodMinutes: 15,
  qrExpirySeconds: 10,
  qrGenerationConfig: {
    length: 8,
    prefix: '',
    includeNumbers: true,
    includeLetters: true
  },
  teamQrCodes: {},
  teamSettings: {},
  dataRetentionDays: 365
};

interface AppContextType {
  currentUser: User | null;
  users: User[];
  records: AttendanceRecord[];
  settings: AppSettings;
  globalQrCode: QrCodeData | null;
  teamQrCodes: Record<string, QrCodeData>;
  login: (userId: string, password?: string) => Promise<boolean>;
  logout: () => void;
  updateSettings: (newSettings: AppSettings) => void;
  markAttendance: (userId: string, type: 'IN' | 'OUT', method: AttendanceMethod, location?: { lat: number, lng: number }, specificDepartment?: string, qrCode?: string) => Promise<{ success: boolean, message: string }>;
  updateRecord: (recordId: string, updates: Partial<AttendanceRecord>) => void;
  createManualRecord: (record: AttendanceRecord) => void;
  generateNewQr: (department?: string) => void;
  currentDate: Date;
  addUser: (user: { name: string; role: Role; departments: string[] }) => Promise<void>;
  bulkAddUsers: (users: any[]) => Promise<{ success: boolean; message: string; count?: number }>;
  updateUser: (userId: string, data: Partial<User>) => void;
  renameDepartment: (oldName: string, newName: string) => void;
  removeUserFromDepartment: (userId: string, deptName: string) => void;
  addUserToDepartment: (userId: string, deptName: string) => void;
  deleteUser: (userId: string) => void;
  deleteTeam: (teamName: string) => void;
  deleteRecord: (recordId: string) => void;
  deleteAllRecords: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  requestPermissions: () => Promise<void>;
  geoPermissionStatus: PermissionState | 'unknown';
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // QR State
  const [globalQrCode, setGlobalQrCode] = useState<QrCodeData | null>(null);
  const [teamQrCodes, setTeamQrCodes] = useState<Record<string, QrCodeData>>({});

  const [currentDate, setCurrentDate] = useState(new Date());
  const [geoPermissionStatus, setGeoPermissionStatus] = useState<PermissionState | 'unknown'>('unknown');

  // Load persisted user
  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  // Check permissions on mount
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(status => {
        setGeoPermissionStatus(status.state);
        status.onchange = () => setGeoPermissionStatus(status.state);
      });
    }
  }, []);

  const requestPermissions = async () => {
    // Request Geolocation
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGeoPermissionStatus('granted'),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setGeoPermissionStatus('denied');
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }

    // Request Notifications
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  };

  // Initial Fetch & Socket Setup
  useEffect(() => {
    const fetchData = async () => {
      // Don't fetch if not logged in
      if (!localStorage.getItem('token')) return;

      try {
        const [usersRes, settingsRes, recordsRes] = await Promise.all([
          api.get('/users'),
          api.get('/settings'),
          api.get('/records')
        ]);
        setUsers(usersRes.data);
        setSettings(settingsRes.data);
        setRecords(recordsRes.data);
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
      }
    };

    fetchData();

    socket.on('records_updated', (newRecords: AttendanceRecord[]) => {
      setRecords(prev => {
        const map = new Map<string, AttendanceRecord>(prev.map(r => [r.id, r]));
        newRecords.forEach((r: AttendanceRecord) => map.set(r.id, r));
        return Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
    });

    socket.on('settings_updated', (updatedSettings: AppSettings) => {
      setSettings(prev => ({ ...prev, ...updatedSettings }));
      if (updatedSettings.globalQrCode) setGlobalQrCode(updatedSettings.globalQrCode);
      if (updatedSettings.teamQrCodes) setTeamQrCodes(updatedSettings.teamQrCodes);
    });

    socket.on('qr_updated', ({ department, qrData }: { department?: string, qrData: any }) => {
      if (department) {
        setTeamQrCodes(prev => ({ ...prev, [department]: qrData }));
      } else {
        setGlobalQrCode(qrData);
      }
    });

    socket.on('refresh_data', () => {
      fetchData();
    });

    return () => {
      socket.off('records_updated');
      socket.off('settings_updated');
      socket.off('refresh_data');
    }
  }, [currentUser]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const login = async (userId: string, password?: string) => {
    try {
      if (!password && users.length > 0) {
        // Fallback for simple ID-based login if implemented/allowed, 
        // BUT requirements say "admin can make new user and password... supercisor and employes need password".
        // However "make can login with id and name".
        // So I will try to support both if password is NOT provided (maybe legacy?) 
        // OR enforce password. 
        // The prompt says "need password and id to login". 
        // So I will enforce password in the API call.
        console.error("Password required");
        return false;
      }

      const res = await api.post('/auth/login', { userId, password });
      if (res.data.user) {
        setCurrentUser(res.data.user);
        localStorage.setItem('currentUser', JSON.stringify(res.data.user));
        if (res.data.token) {
          localStorage.setItem('token', res.data.token);
        }
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("Login failed", err);
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
  };

  const updateSettings = async (newSettings: AppSettings) => {
    try {
      await api.put('/settings', newSettings);
      // Socket will handle update
    } catch (err) {
      console.error("Failed to update settings", err);
    }
  };

  const addUser = async (userData: { name: string; role: Role; departments: string[] }) => {
    try {
      await api.post('/users', userData);
    } catch (err) {
      console.error("Failed to create user", err);
    }
  };

  const bulkAddUsers = async (usersData: any[]) => {
    try {
      const res = await api.post('/users/bulk', usersData);
      return { success: true, message: res.data.message, count: res.data.count };
    } catch (err: any) {
      console.error("Failed to bulk create users", err);
      return { success: false, message: err.response?.data?.message || 'Bulk import failed' };
    }
  };

  const updateUser = async (userId: string, data: Partial<User>) => {
    try {
      await api.put(`/users/${userId}`, data);
    } catch (err) {
      console.error("Failed to update user", err);
    }
  };

  const renameDepartment = async (oldName: string, newName: string) => {
    try {
      await api.put('/departments/rename', { oldName, newName });
    } catch (err) {
      console.error("Failed to rename department", err);
    }
  };

  const removeUserFromDepartment = async (userId: string, deptName: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      const newDepts = user.departments.filter(d => d !== deptName);
      await updateUser(userId, { departments: newDepts });
    }
  };

  const addUserToDepartment = async (userId: string, deptName: string) => {
    const user = users.find(u => u.id === userId);
    if (user && !user.departments.includes(deptName)) {
      await updateUser(userId, { departments: [...user.departments, deptName] });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      await api.delete(`/users/${userId}`);
    } catch (err) {
      console.error("Failed to delete user", err);
    }
  };

  const deleteTeam = async (teamName: string) => {
    try {
      await api.delete(`/teams/${teamName}`);
      // Optimistically update local state or wait for socket refresh
    } catch (err) {
      console.error("Failed to delete team", err);
    }
  };

  const deleteRecord = async (recordId: string) => {
    try {
      await api.delete(`/records/${recordId}`);
    } catch (err) {
      console.error("Failed to delete record", err);
    }
  };

  const deleteAllRecords = async () => {
    try {
      await api.delete('/records/all');
    } catch (err) {
      console.error("Failed to delete all records", err);
    }
  };

  const generateNewQr = async (department?: string) => {
    try {
      await api.post('/settings/refresh-qr', { department });
    } catch (err) {
      console.error("Failed to refresh QR code", err);
    }
  };

  // Sync QR codes on initial load or requireQr change
  useEffect(() => {
    if (settings.requireQr) {
      if (settings.globalQrCode) setGlobalQrCode(settings.globalQrCode);
      if (settings.teamQrCodes) setTeamQrCodes(settings.teamQrCodes);
    } else {
      setGlobalQrCode(null);
      setTeamQrCodes({});
    }
  }, [settings.requireQr, settings.globalQrCode, settings.teamQrCodes]);

  const updateRecord = async (recordId: string, updates: Partial<AttendanceRecord>) => {
    try {
      await api.put(`/records/${recordId}`, updates);
    } catch (err) {
      console.error("Failed to update record", err);
    }
  };

  const createManualRecord = async (record: AttendanceRecord) => {
    try {
      await api.post('/records', record);
    } catch (err) {
      console.error("Failed to create manual record", err);
    }
  };

  const markAttendance = async (userId: string, type: 'IN' | 'OUT', method: AttendanceMethod, location?: { lat: number, lng: number }, specificDepartment?: string, qrCode?: string): Promise<{ success: boolean, message: string }> => {
    try {
      const res = await api.post('/attendance', { userId, type, method, location, specificDepartment, qrCode });
      return { success: res.data.success, message: res.data.message };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to mark attendance';

      // Auto-logout if user invalid/deleted
      if (error.response?.status === 404 && msg === 'User not found') {
        console.warn("User session invalid, logging out");
        logout();
        return { success: false, message: 'Session expired. Please login again.' };
      }

      return { success: false, message: msg };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (!currentUser) return { success: false, message: 'Not logged in' };
      const res = await api.put('/auth/change-password', {
        userId: currentUser.userId,
        currentPassword,
        newPassword
      });
      return { success: true, message: res.data.message || 'Password changed successfully' };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || 'Failed to change password' };
    }
  };

  return (
    <AppContext.Provider value={{ currentUser, users, records, settings, globalQrCode, teamQrCodes, login, logout, updateSettings, markAttendance, updateRecord, createManualRecord, generateNewQr, currentDate, addUser, bulkAddUsers, updateUser, renameDepartment, removeUserFromDepartment, addUserToDepartment, deleteUser, deleteTeam, deleteRecord, deleteAllRecords, changePassword, requestPermissions, geoPermissionStatus }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
