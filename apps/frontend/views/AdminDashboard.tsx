
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import Button from '../components/Button';
import { Settings, BarChart2, MapPin, Wifi, QrCode, UserPlus, Users, X, RefreshCw, Edit, ShieldCheck, Trash2, Search, Plus, Grid, List, CheckCircle2, CheckSquare, Square, Filter, UserMinus, Clock, Lock, Type, FileBarChart, Calendar, ChevronLeft, ChevronRight, Globe, Signal, AlertTriangle, CheckCircle, Camera, Upload, FileImage } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import IDCard from '../components/IDCard';

import QRCode from 'react-qr-code';
import { Role, User, DaySchedule, OfficeLocation, TeamSettings } from '../types';
import AttendanceHistory from '../components/AttendanceHistory';
import api from '../services/api';

const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AdminDashboard: React.FC = () => {
    const { settings, updateSettings, records, users, globalQrCode, generateNewQr, addUser, updateUser, renameDepartment, removeUserFromDepartment, addUserToDepartment, deleteUser, deleteTeam, deleteAllRecords, currentUser } = useApp();
    const [timeLeft, setTimeLeft] = useState(10);

    // User Modal State (Add/Edit User)
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userForm, setUserForm] = useState({ userId: '', password: '', name: '', role: Role.EMPLOYEE, departments: [] as string[], avatar: '', idCardFront: '', idCardBack: '' });
    const [newDeptInput, setNewDeptInput] = useState('');
    const [deleteConfirmationUser, setDeleteConfirmationUser] = useState<User | null>(null);
    const [deleteConfirmationTeam, setDeleteConfirmationTeam] = useState<string | null>(null);

    // Location Modal State
    const [isLocationModalOpen, setLocationModalOpen] = useState(false);
    const [locationForm, setLocationForm] = useState({ name: '', lat: 0, lng: 0, radius: 500 });
    const [editingLocationIndex, setEditingLocationIndex] = useState<number | null>(null);

    // Wifi Modal State
    const [isWifiModalOpen, setWifiModalOpen] = useState(false);
    const [wifiForm, setWifiForm] = useState({ ssid: '' });
    const [ipInput, setIpInput] = useState('');
    const [ipList, setIpList] = useState<string[]>([]);

    // QR Modal State
    const [isQrModalOpen, setQrModalOpen] = useState(false);
    const [qrForm, setQrForm] = useState({ expiry: 10, prefix: '', length: 8, includeLetters: true, includeNumbers: true });

    // Team Studio State
    const [teamStudioOpen, setTeamStudioOpen] = useState(false);
    const [editingTeamName, setEditingTeamName] = useState<string | null>(null);
    const [teamStudioName, setTeamStudioName] = useState('');
    const [modalSearch, setModalSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
    const [teamStudioTab, setTeamStudioTab] = useState<'members' | 'settings'>('members');

    // Team-specific settings state
    const defaultTeamSettings: TeamSettings = {
        useCustomIPs: false, allowedIPs: [],
        useCustomLocations: false, officeLocations: [],
        useCustomQr: false,
        useCustomSchedule: false, schedule: {}
    };
    const [teamSettingsForm, setTeamSettingsForm] = useState<TeamSettings>(defaultTeamSettings);
    const [teamIpInput, setTeamIpInput] = useState('');
    const [teamLocForm, setTeamLocForm] = useState({ name: '', lat: 0, lng: 0, radius: 500 });
    const [editingTeamLocIdx, setEditingTeamLocIdx] = useState<number | null>(null);

    // Export Handlers
    const handleDownload = (url: string) => {
        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Schedule Calendar State
    const [calendarDate, setCalendarDate] = useState(new Date());
    const [selectedExceptionDate, setSelectedExceptionDate] = useState<string | null>(null);

    // Tab State
    const [activeTab, setActiveTab] = useState<'TEAMS' | 'MEMBERS' | 'SCHEDULE' | 'REPORTS'>('TEAMS');

    // User Search
    const [userSearchQuery, setUserSearchQuery] = useState('');

    // Network Test Modal State
    const [isNetworkTestOpen, setNetworkTestOpen] = useState(false);
    const [networkTestResult, setNetworkTestResult] = useState<{
        loading: boolean;
        ip?: string;
        ipStatus?: 'ok' | 'error';
        ipError?: string;
        location?: { lat: number; lng: number };
        locationStatus?: 'checking' | 'ok' | 'error';
        locationDistance?: number;
        locationError?: string;
    }>({ loading: false });

    // QR Timer Effect
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (settings.requireQr && globalQrCode) {
            setTimeLeft(settings.qrExpirySeconds);
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        generateNewQr();
                        return settings.qrExpirySeconds;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [settings.requireQr, globalQrCode?.code, settings.qrExpirySeconds, generateNewQr]);

    // Settings handlers
    const toggleSetting = (key: 'requireLocation' | 'requireWifi' | 'requireQr') => {
        updateSettings({ ...settings, [key]: !settings[key] });
    };

    const openLocationSettings = () => {
        setLocationForm({ name: '', lat: 0, lng: 0, radius: 500 });
        setEditingLocationIndex(null);
        setLocationModalOpen(true);
    };

    const handleGetLocation = () => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocationForm({
                    ...locationForm,
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                });
            },
            (err) => console.error("Geolocation error:", err)
        );
    };

    const handleAddLocation = () => {
        if (!locationForm.name.trim()) return;
        const newLoc: OfficeLocation = {
            name: locationForm.name,
            lat: locationForm.lat,
            lng: locationForm.lng,
            radiusMeters: locationForm.radius
        };
        const locs = [...(settings.officeLocations || [])];
        if (editingLocationIndex !== null) {
            locs[editingLocationIndex] = newLoc;
        } else {
            locs.push(newLoc);
        }
        updateSettings({ ...settings, officeLocations: locs });
        setLocationForm({ name: '', lat: 0, lng: 0, radius: 500 });
        setEditingLocationIndex(null);
    };

    const handleDeleteLocation = (index: number) => {
        const locs = [...(settings.officeLocations || [])];
        locs.splice(index, 1);
        updateSettings({ ...settings, officeLocations: locs });
    };

    const handleEditLocation = (index: number) => {
        const loc = settings.officeLocations[index];
        setLocationForm({ name: loc.name, lat: loc.lat, lng: loc.lng, radius: loc.radiusMeters });
        setEditingLocationIndex(index);
    };

    const openWifiSettings = () => {
        setWifiForm({ ssid: settings.allowedWifiSSID || '' });
        setIpList(Array.isArray(settings.allowedIPs) ? [...settings.allowedIPs] : []);
        setIpInput('');
        setWifiModalOpen(true);
    };

    const handleSaveWifi = () => {
        updateSettings({
            ...settings,
            allowedWifiSSID: wifiForm.ssid,
            allowedIPs: ipList
        });
        setWifiModalOpen(false);
    };

    const handleAddIP = () => {
        const ip = ipInput.trim();
        if (ip && !ipList.includes(ip)) {
            setIpList([...ipList, ip]);
        }
        setIpInput('');
    };

    const handleRemoveIP = (ip: string) => {
        setIpList(ipList.filter(i => i !== ip));
    };

    const handleFetchMyIP = async () => {
        try {
            const res = await api.get('/network-check');
            const currentIP = res.data.ip;
            if (!ipList.includes(currentIP)) {
                setIpList([...ipList, currentIP]);
            }
        } catch (err) {
            console.error("Failed to fetch IP", err);
        }
    };

    // Network Test Handler
    const handleNetworkTest = async () => {
        setNetworkTestOpen(true);
        setNetworkTestResult({ loading: true });

        try {
            // Fetch IP from backend
            const ipRes = await api.get('/network-check');
            const ipData = ipRes.data;

            // Validate IP against settings
            const allowedIPs: string[] = Array.isArray(settings.allowedIPs) ? settings.allowedIPs : [];
            const isIpAllowed = !settings.requireWifi || allowedIPs.length === 0 || allowedIPs.includes(ipData.ip);

            // Get current location
            setNetworkTestResult(prev => ({
                ...prev,
                ip: ipData.ip,
                ipStatus: isIpAllowed ? 'ok' : 'error',
                ipError: isIpAllowed ? undefined : 'IP address not authorized',
                locationStatus: 'checking'
            }));

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const userLat = pos.coords.latitude;
                    const userLng = pos.coords.longitude;

                    const toRad = (deg: number) => deg * (Math.PI / 180);
                    const R = 6371000;

                    const locations = settings.officeLocations || [];
                    let bestDistance = Infinity;
                    let bestName = '';
                    let bestRadius = 500;

                    for (const loc of locations) {
                        const dLat = toRad(loc.lat - userLat);
                        const dLng = toRad(loc.lng - userLng);
                        const a = Math.sin(dLat / 2) ** 2 +
                            Math.cos(toRad(userLat)) * Math.cos(toRad(loc.lat)) *
                            Math.sin(dLng / 2) ** 2;
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                        const distance = R * c;
                        if (distance < bestDistance) {
                            bestDistance = distance;
                            bestName = loc.name;
                            bestRadius = loc.radiusMeters;
                        }
                    }

                    const isWithinRadius = locations.length > 0 && bestDistance <= bestRadius;

                    setNetworkTestResult(prev => ({
                        ...prev,
                        loading: false,
                        location: { lat: userLat, lng: userLng },
                        locationStatus: locations.length === 0 ? 'error' : (isWithinRadius ? 'ok' : 'error'),
                        locationDistance: Math.round(bestDistance),
                        closestLocationName: bestName,
                        closestLocationRadius: bestRadius,
                        locationError: locations.length === 0 ? 'No office locations configured' : undefined
                    }));
                },
                (err) => {
                    setNetworkTestResult(prev => ({
                        ...prev,
                        loading: false,
                        locationStatus: 'error',
                        locationError: err.message || 'Could not get location'
                    }));
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } catch (err: any) {
            setNetworkTestResult({
                loading: false,
                locationStatus: 'error',
                locationError: err.message || 'Network error'
            });
        }
    };

    const openQrSettings = () => {
        setQrForm({
            expiry: settings.qrExpirySeconds,
            prefix: settings.qrGenerationConfig?.prefix || '',
            length: settings.qrGenerationConfig?.length || 8,
            includeLetters: settings.qrGenerationConfig?.includeLetters ?? true,
            includeNumbers: settings.qrGenerationConfig?.includeNumbers ?? true
        });
        setQrModalOpen(true);
    };

    const handleSaveQrSettings = () => {
        updateSettings({
            ...settings,
            qrExpirySeconds: qrForm.expiry,
            qrGenerationConfig: {
                prefix: qrForm.prefix,
                length: qrForm.length,
                includeLetters: qrForm.includeLetters,
                includeNumbers: qrForm.includeNumbers
            }
        });
        setQrModalOpen(false);
        generateNewQr();
    };

    const saveException = (dateStr: string, config: DaySchedule | null) => {
        const newExceptions = { ...settings.exceptions };
        if (config === null) {
            delete newExceptions[dateStr];
        } else {
            newExceptions[dateStr] = config;
        }
        updateSettings({ ...settings, exceptions: newExceptions });
    };

    // Schedule Form State
    const [scheduleForm, setScheduleForm] = useState<Record<string, DaySchedule>>(() => {
        const initial = { ...settings.schedule };
        daysOrder.forEach(day => {
            if (!initial[day]) {
                initial[day] = { enabled: false, startTime: '09:00', endTime: '17:00' };
            }
        });
        return initial;
    });
    const [gracePeriodForm, setGracePeriodForm] = useState(settings.gracePeriodMinutes);

    // Update schedule form when settings change
    useEffect(() => {
        const newSchedule = { ...settings.schedule };
        daysOrder.forEach(day => {
            if (!newSchedule[day]) {
                newSchedule[day] = { enabled: false, startTime: '09:00', endTime: '17:00' };
            }
        });
        setScheduleForm(newSchedule);
        setGracePeriodForm(settings.gracePeriodMinutes);
    }, [settings.schedule, settings.gracePeriodMinutes]);

    // Compute all departments from users
    const allDepartments = useMemo(() => {
        const depts = new Set<string>();
        users.forEach(u => u.departments.forEach(d => depts.add(d)));
        return Array.from(depts).sort();
    }, [users]);

    // Schedule handlers
    const toggleDayEnabled = (dayName: string) => {
        setScheduleForm(prev => ({
            ...prev,
            [dayName]: {
                ...prev[dayName],
                enabled: !prev[dayName]?.enabled,
                startTime: prev[dayName]?.startTime || '09:00',
                endTime: prev[dayName]?.endTime || '17:00'
            }
        }));
    };

    const updateDayTime = (dayName: string, field: 'startTime' | 'endTime', value: string) => {
        setScheduleForm(prev => ({
            ...prev,
            [dayName]: {
                ...prev[dayName],
                [field]: value
            }
        }));
    };

    const handleSaveSchedule = () => {
        updateSettings({
            ...settings,
            schedule: scheduleForm,
            gracePeriodMinutes: gracePeriodForm
        });
    };

    const handleExceptionClick = (dateStr: string) => {
        setSelectedExceptionDate(dateStr);
    };

    // --- USER HANDLERS ---
    const openAddUser = () => {
        setEditingUser(null);
        setUserForm({ userId: '', password: '', name: '', role: Role.EMPLOYEE, departments: [], avatar: '', idCardFront: '', idCardBack: '' });
        setNewDeptInput('');
        setIsUserModalOpen(true);
    };

    const openEditUser = (user: User) => {
        setEditingUser(user);
        setUserForm({
            userId: user.userId || '',
            password: '', // Don't show existing hash
            name: user.name,
            role: user.role,
            departments: [...user.departments],
            avatar: user.avatar || '',
            idCardFront: user.idCardFront || '',
            idCardBack: user.idCardBack || ''
        });
        setNewDeptInput('');
        setIsUserModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'idCardFront' | 'idCardBack') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('File size exceeds 2MB limit.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setUserForm(prev => ({ ...prev, [field]: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleUserSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userForm.name) {
            const userData: any = {
                name: userForm.name,
                role: userForm.role,
                departments: userForm.departments,
                userId: userForm.userId,
                avatar: userForm.avatar,
                idCardFront: userForm.idCardFront,
                idCardBack: userForm.idCardBack
            };

            // Only send password if provided (for edit) or required (for new)
            if (userForm.password) {
                userData.password = userForm.password;
            }

            if (editingUser) {
                updateUser(editingUser.id, userData);
            } else {
                addUser(userData);
            }
            setIsUserModalOpen(false);
        }
    };

    // --- TEAM STUDIO HANDLERS ---
    const openTeamStudio = (teamName: string | null) => {
        setEditingTeamName(teamName);
        setTeamStudioName(teamName || '');
        setModalSearch('');
        setSelectedIds(new Set());
        setShowUnassignedOnly(false);
        setTeamStudioTab('members');
        // Load team settings
        if (teamName && settings.teamSettings && settings.teamSettings[teamName]) {
            setTeamSettingsForm({ ...defaultTeamSettings, ...settings.teamSettings[teamName] });
        } else {
            setTeamSettingsForm({ ...defaultTeamSettings });
        }
        setTeamIpInput('');
        setTeamLocForm({ name: '', lat: 0, lng: 0, radius: 500 });
        setEditingTeamLocIdx(null);
        setTeamStudioOpen(true);
    };

    const closeTeamStudio = () => {
        setTeamStudioOpen(false);
        setEditingTeamName(null);
        setTeamStudioName('');
    };

    const saveTeamSettings = (updated: TeamSettings) => {
        setTeamSettingsForm(updated);
        const teamName = teamStudioName || editingTeamName;
        if (!teamName) return;
        const existing = settings.teamSettings || {};
        updateSettings({ teamSettings: { ...existing, [teamName]: updated } });
    };

    const handleTeamAddIP = () => {
        const ip = teamIpInput.trim();
        if (!ip || teamSettingsForm.allowedIPs.includes(ip)) { setTeamIpInput(''); return; }
        const updated = { ...teamSettingsForm, allowedIPs: [...teamSettingsForm.allowedIPs, ip] };
        saveTeamSettings(updated);
        setTeamIpInput('');
    };

    const handleTeamRemoveIP = (ip: string) => {
        const updated = { ...teamSettingsForm, allowedIPs: teamSettingsForm.allowedIPs.filter(i => i !== ip) };
        saveTeamSettings(updated);
    };

    const handleTeamFetchMyIP = async () => {
        try {
            const res = await api.get('/network-check');
            const currentIP = res.data.ip;
            if (currentIP) setTeamIpInput(currentIP);
        } catch (err) {
            console.error('Failed to fetch IP', err);
        }
    };

    const handleTeamAddLocation = () => {
        if (!teamLocForm.name || !teamLocForm.lat || !teamLocForm.lng) return;
        const loc: OfficeLocation = { name: teamLocForm.name, lat: teamLocForm.lat, lng: teamLocForm.lng, radiusMeters: teamLocForm.radius };
        let newLocs: OfficeLocation[];
        if (editingTeamLocIdx !== null) {
            newLocs = [...teamSettingsForm.officeLocations];
            newLocs[editingTeamLocIdx] = loc;
            setEditingTeamLocIdx(null);
        } else {
            newLocs = [...teamSettingsForm.officeLocations, loc];
        }
        saveTeamSettings({ ...teamSettingsForm, officeLocations: newLocs });
        setTeamLocForm({ name: '', lat: 0, lng: 0, radius: 500 });
    };

    const handleTeamDeleteLocation = (idx: number) => {
        const newLocs = teamSettingsForm.officeLocations.filter((_, i) => i !== idx);
        saveTeamSettings({ ...teamSettingsForm, officeLocations: newLocs });
    };

    const handleTeamScheduleToggle = (day: string, field: string, value: any) => {
        const sched = { ...teamSettingsForm.schedule };
        if (!sched[day]) sched[day] = { enabled: false, startTime: '09:00', endTime: '17:00' };
        (sched[day] as any)[field] = value;
        saveTeamSettings({ ...teamSettingsForm, schedule: sched });
    };

    const handleSaveTeamName = () => {
        if (editingTeamName && teamStudioName && teamStudioName !== editingTeamName) {
            renameDepartment(editingTeamName, teamStudioName);
            setEditingTeamName(teamStudioName); // Update current editing reference
        }
    };

    const toggleUserSelection = (userId: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(userId)) newSet.delete(userId);
        else newSet.add(userId);
        setSelectedIds(newSet);
    };

    const handleBulkAddUsers = () => {
        if (teamStudioName && selectedIds.size > 0) {
            selectedIds.forEach(id => addUserToDepartment(id, teamStudioName));
            setSelectedIds(new Set());
        }
    };

    const handleRemoveUserFromTeam = (userId: string) => {
        if (teamStudioName) {
            removeUserFromDepartment(userId, teamStudioName);
        }
    };

    const filteredUsers = users.filter(u => u.name.toLowerCase().includes(userSearchQuery.toLowerCase()));

    // Filter for Team Studio Modal
    const availableUsersForTeam = users.filter(u => {
        const notInTeam = !u.departments.includes(teamStudioName);
        const matchesSearch = u.name.toLowerCase().includes(modalSearch.toLowerCase());
        const matchesUnassigned = showUnassignedOnly ? u.departments.length === 0 : true;
        return notInTeam && matchesSearch && matchesUnassigned;
    });

    // Compute Weekly Activity from Records (Last 7 days)
    const chartData = useMemo(() => {
        const data = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

            const dayRecords = records.filter(r => r.date === dateStr);
            const present = dayRecords.filter(r => r.status === 'PRESENT' || r.status === 'CHECKED_OUT').length;
            const late = dayRecords.filter(r => r.status === 'LATE').length;

            // Absent is tricky to calc without daily expectation, but we can count explicit ABSENT records
            // or just rely on late/present for the activity chart
            data.push({ name: dayName, present, late });
        }
        return data;
    }, [records]);

    // daysOrder is defined at the top of the file

    // Display helper for mini widget
    const getCurrentDayConfig = () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

        const exception = settings.exceptions[todayStr];
        if (exception) return exception;
        return settings.schedule[dayName];
    }

    // Calendar Logic for Schedule Tab
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const { days: monthDays, firstDay: monthFirstDay } = getDaysInMonth(calendarDate);
    const calendarGrid = useMemo(() => {
        const grid = [];
        for (let i = 0; i < monthFirstDay; i++) grid.push(null);
        for (let i = 1; i <= monthDays; i++) grid.push(i);
        return grid;
    }, [monthDays, monthFirstDay]);

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8 relative">

            {/* --- EXCEPTION EDITOR POPUP --- */}
            {selectedExceptionDate && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-2xl border border-white/50">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h4 className="font-bold text-slate-800 text-lg">Edit Date</h4>
                                <p className="text-xs font-bold text-slate-400">{new Date(selectedExceptionDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                            </div>
                            <button onClick={() => setSelectedExceptionDate(null)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={16} /></button>
                        </div>

                        <div className="space-y-3">
                            <Button
                                variant={!settings.exceptions[selectedExceptionDate] ? 'primary' : 'secondary'}
                                className="w-full justify-between"
                                onClick={() => saveException(selectedExceptionDate, null)}
                            >
                                <span>Follow Weekly Schedule</span>
                                {!settings.exceptions[selectedExceptionDate] && <CheckCircle2 size={16} />}
                            </Button>

                            <div className="border-t border-slate-100 my-2"></div>

                            <Button
                                variant={settings.exceptions[selectedExceptionDate]?.enabled === false ? 'primary' : 'secondary'}
                                className="w-full justify-between"
                                onClick={() => saveException(selectedExceptionDate, { enabled: false, startTime: '00:00', endTime: '00:00' })}
                            >
                                <span>Set as Day Off (Holiday)</span>
                                {settings.exceptions[selectedExceptionDate]?.enabled === false && <CheckCircle2 size={16} />}
                            </Button>

                            <Button
                                variant={settings.exceptions[selectedExceptionDate]?.enabled === true ? 'primary' : 'secondary'}
                                className="w-full justify-between"
                                onClick={() => saveException(selectedExceptionDate, { enabled: true, startTime: '10:00', endTime: '16:00' })}
                            >
                                <span>Custom Hours</span>
                                {settings.exceptions[selectedExceptionDate]?.enabled === true && <CheckCircle2 size={16} />}
                            </Button>

                            {settings.exceptions[selectedExceptionDate]?.enabled === true && (
                                <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-2 mt-2 animate-in slide-in-from-top-2">
                                    <input
                                        type="time"
                                        value={settings.exceptions[selectedExceptionDate].startTime}
                                        onChange={(e) => saveException(selectedExceptionDate, { ...settings.exceptions[selectedExceptionDate], startTime: e.target.value })}
                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-700 w-full"
                                    />
                                    <span className="text-slate-300">-</span>
                                    <input
                                        type="time"
                                        value={settings.exceptions[selectedExceptionDate].endTime}
                                        onChange={(e) => saveException(selectedExceptionDate, { ...settings.exceptions[selectedExceptionDate], endTime: e.target.value })}
                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-700 w-full"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- LOCATION CONFIG MODAL --- */}
            {isLocationModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all">
                    <div className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 border border-white/20 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <div className="bg-pink-100 p-2 rounded-xl text-pink-600"><MapPin size={20} /></div>
                                Office Locations
                            </h3>
                            <button onClick={() => setLocationModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>

                        {/* Existing Locations */}
                        {settings.officeLocations && settings.officeLocations.length > 0 && (
                            <div className="space-y-2 mb-6">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Configured Locations ({settings.officeLocations.length})</p>
                                {settings.officeLocations.map((loc, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-pink-50/50 rounded-2xl border border-pink-100 group">
                                        <div className="bg-pink-100 p-2 rounded-xl text-pink-600 shrink-0"><MapPin size={16} /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-slate-700 truncate">{loc.name}</p>
                                            <p className="text-[10px] text-slate-400 font-mono">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)} · {loc.radiusMeters}m</p>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={() => handleEditLocation(i)} className="p-1.5 rounded-lg hover:bg-pink-100 text-slate-400 hover:text-pink-600 transition-all"><Edit size={14} /></button>
                                            <button onClick={() => handleDeleteLocation(i)} className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-all"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add / Edit Location Form */}
                        <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{editingLocationIndex !== null ? 'Edit Location' : 'Add New Location'}</p>
                                <Button type="button" onClick={handleGetLocation} variant="secondary" size="sm" className="bg-white text-pink-600 border-pink-200 hover:bg-pink-100 shadow-sm text-[10px] px-2 py-1">
                                    <MapPin size={12} /> Get My Position
                                </Button>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Name</label>
                                <input type="text" value={locationForm.name} onChange={e => setLocationForm({ ...locationForm, name: e.target.value })} placeholder="e.g. Main Office, Branch A" className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-semibold text-slate-700 outline-none focus:border-pink-300 transition-all" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Latitude</label>
                                    <input type="number" step="any" value={locationForm.lat} onChange={e => setLocationForm({ ...locationForm, lat: parseFloat(e.target.value) })} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-semibold text-slate-700 outline-none focus:border-pink-300 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Longitude</label>
                                    <input type="number" step="any" value={locationForm.lng} onChange={e => setLocationForm({ ...locationForm, lng: parseFloat(e.target.value) })} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-semibold text-slate-700 outline-none focus:border-pink-300 transition-all" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Radius (Meters)</label>
                                <input type="number" value={locationForm.radius} onChange={e => setLocationForm({ ...locationForm, radius: parseInt(e.target.value) })} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-semibold text-slate-700 outline-none focus:border-pink-300 transition-all" />
                            </div>

                            <div className="flex gap-3">
                                {editingLocationIndex !== null && (
                                    <Button variant="ghost" onClick={() => { setEditingLocationIndex(null); setLocationForm({ name: '', lat: 0, lng: 0, radius: 500 }); }} className="flex-1">Cancel Edit</Button>
                                )}
                                <Button onClick={handleAddLocation} className="flex-1 bg-pink-500 hover:bg-pink-600 shadow-pink-200 text-white border-none">
                                    <Plus size={16} /> {editingLocationIndex !== null ? 'Update Location' : 'Add Location'}
                                </Button>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <Button onClick={() => setLocationModalOpen(false)} className="w-full">Done</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- WIFI CONFIG MODAL --- */}
            {isWifiModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all">
                    <div className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 border border-white/20">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <div className="bg-orange-100 p-2 rounded-xl text-orange-600"><Signal size={20} /></div>
                                Network Settings
                            </h3>
                            <button onClick={() => setWifiModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Network Name (for reference)</label>
                                <input type="text" value={wifiForm.ssid} onChange={e => setWifiForm({ ...wifiForm, ssid: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-semibold text-slate-700 outline-none focus:border-orange-300 transition-all" placeholder="e.g. Office_Network" />
                            </div>

                            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xs text-orange-600 font-bold uppercase tracking-wide">Authorized IP Addresses</label>
                                    <button onClick={handleFetchMyIP} className="text-[10px] bg-white text-orange-600 px-2 py-1 rounded-lg border border-orange-200 font-bold hover:bg-orange-100 transition-all">Add My Current IP</button>
                                </div>

                                {/* IP Chips */}
                                {ipList.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {ipList.map((ip, i) => (
                                            <div key={i} className="flex items-center gap-1.5 bg-white border border-orange-200 rounded-xl px-3 py-1.5 group">
                                                <span className="font-mono text-xs font-bold text-slate-700">{ip}</span>
                                                <button onClick={() => handleRemoveIP(ip)} className="text-slate-300 hover:text-rose-500 transition-all"><X size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add IP Input */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={ipInput}
                                        onChange={e => setIpInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddIP()}
                                        className="flex-1 bg-white border border-orange-200 rounded-xl px-3 py-2 font-mono text-xs font-bold text-slate-700 outline-none focus:border-orange-400 transition-all"
                                        placeholder="e.g. 192.168.1.5"
                                    />
                                    <button onClick={handleAddIP} className="bg-orange-100 text-orange-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-orange-200 transition-all border border-orange-200">
                                        <Plus size={14} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-orange-400 mt-2 font-medium">Add IP addresses authorized to mark attendance.</p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button variant="ghost" onClick={() => setWifiModalOpen(false)} className="flex-1">Cancel</Button>
                                <Button onClick={handleSaveWifi} className="flex-1 bg-orange-500 hover:bg-orange-600 shadow-orange-200 text-white border-none">Save Settings</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- QR CONFIG MODAL --- */}
            {isQrModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all">
                    <div className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 border border-white/20">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <div className="bg-teal-100 p-2 rounded-xl text-teal-600"><QrCode size={20} /></div>
                                QR Settings
                            </h3>
                            <button onClick={() => setQrModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Rotation Interval (Seconds)</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        min="5"
                                        max="60"
                                        value={qrForm.expiry}
                                        onChange={e => setQrForm({ ...qrForm, expiry: parseInt(e.target.value) })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-semibold text-slate-700 outline-none focus:border-teal-300 transition-all"
                                    />
                                    <div className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-2 rounded-xl whitespace-nowrap">
                                        Rec: 10s
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                                <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                                    <Type size={16} /> Code Format
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Prefix</label>
                                        <input
                                            type="text"
                                            value={qrForm.prefix}
                                            placeholder="e.g. TEAM-"
                                            onChange={e => setQrForm({ ...qrForm, prefix: e.target.value.toUpperCase() })}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:border-teal-300 outline-none uppercase"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Random Chars</label>
                                        <input
                                            type="number"
                                            min="4" max="16"
                                            value={qrForm.length}
                                            onChange={e => setQrForm({ ...qrForm, length: parseInt(e.target.value) })}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:border-teal-300 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-2">
                                    <button
                                        onClick={() => setQrForm({ ...qrForm, includeLetters: !qrForm.includeLetters })}
                                        className={`flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${qrForm.includeLetters ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-slate-200 text-slate-400'}`}
                                    >
                                        {qrForm.includeLetters && <CheckCircle2 size={14} />} A-Z Letters
                                    </button>
                                    <button
                                        onClick={() => setQrForm({ ...qrForm, includeNumbers: !qrForm.includeNumbers })}
                                        className={`flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${qrForm.includeNumbers ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-slate-200 text-slate-400'}`}
                                    >
                                        {qrForm.includeNumbers && <CheckCircle2 size={14} />} 0-9 Numbers
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button variant="ghost" onClick={() => setQrModalOpen(false)} className="flex-1">Cancel</Button>
                                <Button onClick={handleSaveQrSettings} className="flex-1 bg-teal-500 hover:bg-teal-600 shadow-teal-200 text-white border-none">Save & Regenerate</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- NETWORK TEST MODAL --- */}
            {isNetworkTestOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all">
                    <div className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 border border-white/20">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <div className="bg-violet-100 p-2 rounded-xl text-violet-600"><Globe size={20} /></div>
                                Access Verification
                            </h3>
                            <button onClick={() => setNetworkTestOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            {/* IP Address */}
                            <div className={`p-4 rounded-2xl border ${networkTestResult.ipStatus === 'ok'
                                ? 'bg-emerald-50 border-emerald-200'
                                : networkTestResult.ipStatus === 'error'
                                    ? 'bg-rose-50 border-rose-200'
                                    : 'bg-slate-50 border-slate-100'
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Signal size={16} className={
                                            networkTestResult.ipStatus === 'ok' ? 'text-emerald-500' :
                                                networkTestResult.ipStatus === 'error' ? 'text-rose-500' : 'text-blue-500'
                                        } />
                                        <span className="text-sm font-bold text-slate-700">Network IP Address</span>
                                    </div>
                                    {networkTestResult.ipStatus === 'ok' && <CheckCircle size={16} className="text-emerald-500" />}
                                    {networkTestResult.ipStatus === 'error' && <AlertTriangle size={16} className="text-rose-500" />}
                                </div>
                                <div className="bg-white rounded-xl px-4 py-3 border border-slate-200 font-mono text-lg font-bold text-slate-800">
                                    {networkTestResult.loading ? (
                                        <span className="text-slate-400 animate-pulse">Detecting...</span>
                                    ) : networkTestResult.ip || 'Unknown'}
                                </div>
                                {networkTestResult.ipStatus === 'error' && (
                                    <p className="text-[10px] text-rose-500 mt-2 ml-1 font-bold">This IP is not in your allowed Network Settings!</p>
                                )}
                                <p className="text-[10px] text-slate-400 mt-1 ml-1">Detection based on office network configuration.</p>
                            </div>

                            {/* Location Status */}
                            <div className={`p-4 rounded-2xl border ${networkTestResult.locationStatus === 'ok'
                                ? 'bg-emerald-50 border-emerald-200'
                                : networkTestResult.locationStatus === 'error'
                                    ? 'bg-rose-50 border-rose-200'
                                    : 'bg-slate-50 border-slate-100'
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={16} className={
                                            networkTestResult.locationStatus === 'ok' ? 'text-emerald-500' :
                                                networkTestResult.locationStatus === 'error' ? 'text-rose-500' : 'text-slate-400'
                                        } />
                                        <span className="text-sm font-bold text-slate-700">Location Check</span>
                                    </div>
                                    {networkTestResult.locationStatus === 'ok' && <CheckCircle size={16} className="text-emerald-500" />}
                                    {networkTestResult.locationStatus === 'error' && <AlertTriangle size={16} className="text-rose-500" />}
                                </div>

                                {networkTestResult.locationStatus === 'checking' || networkTestResult.loading ? (
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <div className="w-4 h-4 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin"></div>
                                        <span className="font-medium">Checking location...</span>
                                    </div>
                                ) : networkTestResult.locationError ? (
                                    <p className="text-sm font-medium text-rose-600">{networkTestResult.locationError}</p>
                                ) : networkTestResult.locationDistance !== undefined ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-600">Closest location:</span>
                                            <span className="font-bold text-slate-700">{networkTestResult.closestLocationName || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-600">Distance:</span>
                                            <span className={`font-bold ${networkTestResult.locationStatus === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {networkTestResult.locationDistance}m
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-600">Allowed radius:</span>
                                            <span className="font-bold text-slate-700">{networkTestResult.closestLocationRadius || 500}m</span>
                                        </div>
                                        <div className={`mt-2 p-2 rounded-xl text-center text-sm font-bold ${networkTestResult.locationStatus === 'ok'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-rose-100 text-rose-700'
                                            }`}>
                                            {networkTestResult.locationStatus === 'ok'
                                                ? '✓ Within allowed range'
                                                : '✗ Outside allowed range'}
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            {/* Summary */}
                            {!networkTestResult.loading && (
                                <div className={`p-4 rounded-2xl ${networkTestResult.locationStatus === 'ok' && networkTestResult.ipStatus === 'ok'
                                    ? 'bg-emerald-500'
                                    : 'bg-amber-500'
                                    }`}>
                                    <p className="text-white font-bold text-center">
                                        {networkTestResult.locationStatus === 'ok' && networkTestResult.ipStatus === 'ok'
                                            ? '✓ Employees CAN check in correctly'
                                            : '⚠ Access might be RESTRICTED'}
                                    </p>
                                </div>
                            )}

                            <div className="pt-2">
                                <Button onClick={() => setNetworkTestOpen(false)} className="w-full">Close</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TEAM STUDIO MODAL --- */}
            {teamStudioOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all">
                    <div className="bg-white rounded-[32px] sm:rounded-[40px] w-full max-w-5xl h-[90vh] sm:h-[85vh] shadow-2xl animate-in fade-in zoom-in duration-200 border border-white/20 flex flex-col overflow-hidden">

                        {/* Header */}
                        <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <div className="flex-1 mr-4">
                                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">
                                    {editingTeamName ? 'Editing Team' : 'New Team Workspace'}
                                </p>
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="bg-[#7C3AED] p-2 sm:p-3 rounded-xl sm:rounded-2xl text-white shadow-lg shadow-violet-200 shrink-0">
                                        <ShieldCheck size={20} className="sm:w-6 sm:h-6" />
                                    </div>
                                    <input
                                        type="text"
                                        className="text-xl sm:text-3xl font-extrabold text-slate-800 bg-transparent border-none outline-none placeholder:text-slate-300 w-full focus:ring-0"
                                        placeholder="Name your team..."
                                        value={teamStudioName}
                                        onChange={(e) => setTeamStudioName(e.target.value)}
                                        onBlur={handleSaveTeamName}
                                        autoFocus={!editingTeamName}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                {editingTeamName && (
                                    <button
                                        onClick={() => setDeleteConfirmationTeam(editingTeamName)}
                                        className="bg-rose-100 p-2 sm:p-3 rounded-full text-rose-500 hover:bg-rose-200 transition-all border border-rose-200 shadow-sm"
                                        title="Delete Team"
                                    >
                                        <Trash2 size={20} className="sm:w-6 sm:h-6" />
                                    </button>
                                )}
                                <div className="hidden sm:block bg-slate-100 px-4 py-2 rounded-full text-xs font-bold text-slate-500">
                                    {users.filter(u => u.departments.includes(teamStudioName)).length} Members
                                </div>
                                <button onClick={closeTeamStudio} className="bg-white p-2 sm:p-3 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all border border-slate-100">
                                    <X size={20} className="sm:w-6 sm:h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex border-b border-slate-100 px-6 sm:px-8 shrink-0 bg-white">
                            <button onClick={() => setTeamStudioTab('members')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${teamStudioTab === 'members' ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                <Users size={16} /> Members
                            </button>
                            <button onClick={() => setTeamStudioTab('settings')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${teamStudioTab === 'settings' ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                <Settings size={16} /> Team Settings
                            </button>
                        </div>

                        {/* Content */}
                        {teamStudioTab === 'members' ? (
                            <div className="flex flex-col md:flex-row h-full overflow-hidden">

                                {/* Left: Current Members */}
                                <div className="w-full md:w-5/12 p-4 sm:p-6 border-b md:border-b-0 md:border-r border-slate-100 bg-white flex flex-col h-1/2 md:h-full">
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-4 shrink-0">
                                        Current Members
                                    </h4>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                                        {teamStudioName ? (
                                            users.filter(u => u.departments.includes(teamStudioName)).map(member => (
                                                <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl group border border-transparent hover:border-slate-200 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <img src={member.avatar} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white shadow-sm" />
                                                        <div>
                                                            <p className="font-bold text-slate-700 leading-tight text-sm sm:text-base">{member.name}</p>
                                                            <p className="text-[10px] uppercase font-bold text-slate-400">{member.role}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveUserFromTeam(member.id)}
                                                        className="text-slate-300 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-full transition-all"
                                                        title="Remove member"
                                                    >
                                                        <UserMinus size={18} />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-40 text-center text-slate-400">
                                                <ShieldCheck size={40} className="mb-3 opacity-20" />
                                                <p>Enter a team name to start.</p>
                                            </div>
                                        )}
                                        {teamStudioName && users.filter(u => u.departments.includes(teamStudioName)).length === 0 && (
                                            <div className="flex flex-col items-center justify-center h-full text-center text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl p-4">
                                                <Users size={32} className="mb-2 opacity-50" />
                                                <p className="text-sm font-medium">Team is empty</p>
                                                <p className="text-xs">Select people from the list to add them.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Available Users (Grouping Area) */}
                                <div className="w-full md:w-7/12 p-4 sm:p-6 bg-slate-50/50 flex flex-col relative h-1/2 md:h-full">
                                    <div className="mb-3 sm:mb-4 space-y-3 shrink-0">
                                        <div className="flex justify-between items-end">
                                            <h4 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest">Available People</h4>
                                            {selectedIds.size > 0 && (
                                                <span className="text-xs font-bold text-[#7C3AED] bg-violet-100 px-2 py-1 rounded-md animate-pulse">
                                                    {selectedIds.size} Selected
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="text"
                                                    placeholder="Search..."
                                                    className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 bg-white border border-slate-200 rounded-xl sm:rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-violet-200 outline-none"
                                                    value={modalSearch}
                                                    onChange={(e) => setModalSearch(e.target.value)}
                                                />
                                            </div>
                                            <button
                                                onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
                                                className={`px-3 sm:px-4 rounded-xl sm:rounded-2xl border font-bold text-[10px] sm:text-xs flex items-center gap-2 transition-all ${showUnassignedOnly ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                                title="Show only people with no team"
                                            >
                                                <Filter size={14} />
                                                {showUnassignedOnly ? 'Unassigned' : 'All'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 pb-20">
                                        {availableUsersForTeam.map(u => {
                                            const isSelected = selectedIds.has(u.id);
                                            return (
                                                <div
                                                    key={u.id}
                                                    onClick={() => toggleUserSelection(u.id)}
                                                    className={`flex items-center justify-between p-3 rounded-xl sm:rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-violet-50 border-[#7C3AED] shadow-sm' : 'bg-white border-slate-100 hover:border-violet-200'}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${isSelected ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-slate-300 bg-white'}`}>
                                                            {isSelected && <CheckCircle2 size={14} className="text-white" />}
                                                        </div>
                                                        <img src={u.avatar} className={`w-8 h-8 rounded-full bg-slate-100 ${!isSelected && 'grayscale opacity-70'}`} />
                                                        <div>
                                                            <p className={`font-bold text-sm ${isSelected ? 'text-[#7C3AED]' : 'text-slate-700'}`}>{u.name}</p>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[10px] text-slate-400">{u.role}</p>
                                                                {u.departments.length === 0 && <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-sm font-bold">Unassigned</span>}
                                                                {u.departments.length > 0 && <span className="text-[9px] text-slate-300 hidden sm:inline">{u.departments.join(', ')}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {availableUsersForTeam.length === 0 && (
                                            <div className="text-center py-10 text-slate-400">
                                                No users found matching filters.
                                            </div>
                                        )}
                                    </div>

                                    {/* Floating Action Bar */}
                                    <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6">
                                        <Button
                                            className="w-full shadow-xl text-sm sm:text-base py-3 sm:py-4"
                                            disabled={selectedIds.size === 0 || !teamStudioName}
                                            onClick={handleBulkAddUsers}
                                        >
                                            {selectedIds.size > 0 ? `Add ${selectedIds.size} Members` : 'Select members to add'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* SETTINGS TAB */
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
                                {!teamStudioName ? (
                                    <div className="text-center py-20 text-slate-400">
                                        <Settings size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-medium">Enter a team name first to configure settings.</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-xs text-slate-400 font-medium">Enable overrides below. When disabled, the team uses global settings.</p>

                                        {/* Custom IPs */}
                                        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><Wifi size={18} /></div>
                                                    <div>
                                                        <p className="font-bold text-slate-700 text-sm">Custom Allowed IPs</p>
                                                        <p className="text-xs text-slate-400">Override global network whitelist for this team</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => saveTeamSettings({ ...teamSettingsForm, useCustomIPs: !teamSettingsForm.useCustomIPs })} className={`w-12 h-7 rounded-full transition-all relative ${teamSettingsForm.useCustomIPs ? 'bg-[#7C3AED]' : 'bg-slate-200'}`}>
                                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow ${teamSettingsForm.useCustomIPs ? 'left-6' : 'left-1'}`} />
                                                </button>
                                            </div>
                                            {teamSettingsForm.useCustomIPs && (
                                                <div className="pt-3 border-t border-slate-50 space-y-3">
                                                    <div className="flex flex-wrap gap-2">
                                                        {teamSettingsForm.allowedIPs.map(ip => (
                                                            <span key={ip} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                                                                {ip}
                                                                <button onClick={() => handleTeamRemoveIP(ip)} className="hover:text-rose-500 transition-colors"><X size={12} /></button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input value={teamIpInput} onChange={e => setTeamIpInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTeamAddIP()} placeholder="e.g. 192.168.1.100" className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-violet-200 outline-none" />
                                                        <Button size="sm" onClick={handleTeamAddIP} className="rounded-xl px-4">Add</Button>
                                                        <button onClick={handleTeamFetchMyIP} className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:border-violet-300 hover:text-violet-600 transition-all flex items-center gap-1.5 whitespace-nowrap">
                                                            <Globe size={14} /> Get My IP
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Custom Locations */}
                                        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600"><MapPin size={18} /></div>
                                                    <div>
                                                        <p className="font-bold text-slate-700 text-sm">Custom Office Locations</p>
                                                        <p className="text-xs text-slate-400">Override global geofence for this team</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => saveTeamSettings({ ...teamSettingsForm, useCustomLocations: !teamSettingsForm.useCustomLocations })} className={`w-12 h-7 rounded-full transition-all relative ${teamSettingsForm.useCustomLocations ? 'bg-[#7C3AED]' : 'bg-slate-200'}`}>
                                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow ${teamSettingsForm.useCustomLocations ? 'left-6' : 'left-1'}`} />
                                                </button>
                                            </div>
                                            {teamSettingsForm.useCustomLocations && (
                                                <div className="pt-3 border-t border-slate-50 space-y-3">
                                                    {teamSettingsForm.officeLocations.map((loc, i) => (
                                                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                                            <div>
                                                                <p className="font-bold text-sm text-slate-700">{loc.name}</p>
                                                                <p className="text-[10px] text-slate-400">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)} · {loc.radiusMeters}m</p>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <button onClick={() => { setTeamLocForm({ name: loc.name, lat: loc.lat, lng: loc.lng, radius: loc.radiusMeters }); setEditingTeamLocIdx(i); }} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-violet-600"><Edit size={14} /></button>
                                                                <button onClick={() => handleTeamDeleteLocation(i)} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-rose-500"><Trash2 size={14} /></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        <input value={teamLocForm.name} onChange={e => setTeamLocForm({ ...teamLocForm, name: e.target.value })} placeholder="Name" className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-violet-200 outline-none" />
                                                        <input type="number" step="any" value={teamLocForm.lat || ''} onChange={e => setTeamLocForm({ ...teamLocForm, lat: parseFloat(e.target.value) || 0 })} placeholder="Latitude" className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-violet-200 outline-none" />
                                                        <input type="number" step="any" value={teamLocForm.lng || ''} onChange={e => setTeamLocForm({ ...teamLocForm, lng: parseFloat(e.target.value) || 0 })} placeholder="Longitude" className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-violet-200 outline-none" />
                                                        <div className="flex gap-2">
                                                            <input type="number" value={teamLocForm.radius} onChange={e => setTeamLocForm({ ...teamLocForm, radius: parseInt(e.target.value) || 500 })} placeholder="Radius (m)" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-violet-200 outline-none" />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" onClick={handleTeamAddLocation} className="rounded-xl">
                                                            {editingTeamLocIdx !== null ? 'Update' : 'Add Location'}
                                                        </Button>
                                                        <button onClick={() => { if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => setTeamLocForm(f => ({ ...f, lat: p.coords.latitude, lng: p.coords.longitude, name: f.name || 'My Location' }))); }} className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:border-violet-300 hover:text-violet-600 transition-all flex items-center gap-1.5">
                                                            <Globe size={14} /> Get My Position
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Custom QR */}
                                        <div className="bg-white rounded-2xl border border-slate-100 p-5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-amber-100 p-2 rounded-xl text-amber-600"><QrCode size={18} /></div>
                                                    <div>
                                                        <p className="font-bold text-slate-700 text-sm">Team QR Code</p>
                                                        <p className="text-xs text-slate-400">Supervisors get their own rotating QR. Global QR still works for all.</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => saveTeamSettings({ ...teamSettingsForm, useCustomQr: !teamSettingsForm.useCustomQr })} className={`w-12 h-7 rounded-full transition-all relative ${teamSettingsForm.useCustomQr ? 'bg-[#7C3AED]' : 'bg-slate-200'}`}>
                                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow ${teamSettingsForm.useCustomQr ? 'left-6' : 'left-1'}`} />
                                                </button>
                                            </div>
                                            {teamSettingsForm.useCustomQr && (
                                                <p className="mt-3 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl font-medium">✓ Supervisors of this team will see a dedicated team QR code. Employees can still use the global QR to check in.</p>
                                            )}
                                        </div>

                                        {/* Custom Schedule */}
                                        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-violet-100 p-2 rounded-xl text-violet-600"><Clock size={18} /></div>
                                                    <div>
                                                        <p className="font-bold text-slate-700 text-sm">Custom Schedule</p>
                                                        <p className="text-xs text-slate-400">Override global work hours for this team</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => saveTeamSettings({ ...teamSettingsForm, useCustomSchedule: !teamSettingsForm.useCustomSchedule })} className={`w-12 h-7 rounded-full transition-all relative ${teamSettingsForm.useCustomSchedule ? 'bg-[#7C3AED]' : 'bg-slate-200'}`}>
                                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow ${teamSettingsForm.useCustomSchedule ? 'left-6' : 'left-1'}`} />
                                                </button>
                                            </div>
                                            {teamSettingsForm.useCustomSchedule && (
                                                <div className="pt-3 border-t border-slate-50 space-y-2">
                                                    {daysOrder.map(day => {
                                                        const ds = teamSettingsForm.schedule[day] || { enabled: false, startTime: '09:00', endTime: '17:00' };
                                                        return (
                                                            <div key={day} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-50 transition-all">
                                                                <button onClick={() => handleTeamScheduleToggle(day, 'enabled', !ds.enabled)} className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${ds.enabled ? 'bg-[#7C3AED] border-[#7C3AED]' : 'border-slate-300 bg-white'}`}>
                                                                    {ds.enabled && <CheckCircle2 size={12} className="text-white" />}
                                                                </button>
                                                                <span className={`text-sm font-bold w-24 ${ds.enabled ? 'text-slate-700' : 'text-slate-300'}`}>{day}</span>
                                                                {ds.enabled && (
                                                                    <div className="flex items-center gap-2 text-sm">
                                                                        <input type="time" value={ds.startTime} onChange={e => handleTeamScheduleToggle(day, 'startTime', e.target.value)} className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-violet-200 outline-none" />
                                                                        <span className="text-slate-300">—</span>
                                                                        <input type="time" value={ds.endTime} onChange={e => handleTeamScheduleToggle(day, 'endTime', e.target.value)} className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-violet-200 outline-none" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- USER MODAL (Existing) --- */}
            {isUserModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all">
                    <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 border border-white/20">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <div className="bg-violet-100 p-2 rounded-xl text-violet-600"><UserPlus size={20} /></div>
                                {editingUser ? 'Edit Member' : 'New Member'}
                            </h3>
                            <div className="flex items-center gap-2">
                                {editingUser && (
                                    <button
                                        onClick={() => setDeleteConfirmationUser(editingUser)}
                                        className="text-rose-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-full transition-all"
                                        title="Delete Member"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
                            </div>
                        </div>

                        <form onSubmit={handleUserSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-semibold text-slate-700 focus:ring-2 focus:ring-violet-200 focus:border-violet-300 outline-none transition-all placeholder:text-slate-300"
                                    placeholder="e.g. John Doe"
                                    value={userForm.name}
                                    onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">User ID</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-semibold text-slate-700 focus:ring-2 focus:ring-violet-200 focus:border-violet-300 outline-none transition-all placeholder:text-slate-300"
                                        placeholder="e.g. john.doe"
                                        value={userForm.userId}
                                        onChange={e => setUserForm({ ...userForm, userId: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Password</label>
                                    <input
                                        type="password"
                                        required={!editingUser}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-semibold text-slate-700 focus:ring-2 focus:ring-violet-200 focus:border-violet-300 outline-none transition-all placeholder:text-slate-300"
                                        placeholder={editingUser ? "(Unchanged)" : "Start Password"}
                                        value={userForm.password}
                                        onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Profile & ID Card Images</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-2">
                                        <div className="h-24 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden relative group">
                                            {userForm.avatar ? (
                                                <img src={userForm.avatar} className="w-full h-full object-cover" />
                                            ) : (
                                                <Camera size={24} className="text-slate-300" />
                                            )}
                                            <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                                <Upload size={20} className="text-white" />
                                                <input type="file" className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'avatar')} />
                                            </label>
                                        </div>
                                        <p className="text-[10px] text-center font-bold text-slate-400 uppercase">Profile</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-24 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden relative group">
                                            {userForm.idCardFront ? (
                                                <img src={userForm.idCardFront} className="w-full h-full object-cover" />
                                            ) : (
                                                <FileImage size={24} className="text-slate-300" />
                                            )}
                                            <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                                <Upload size={20} className="text-white" />
                                                <input type="file" className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'idCardFront')} />
                                            </label>
                                        </div>
                                        <p className="text-[10px] text-center font-bold text-slate-400 uppercase">ID Front</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-24 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden relative group">
                                            {userForm.idCardBack ? (
                                                <img src={userForm.idCardBack} className="w-full h-full object-cover" />
                                            ) : (
                                                <FileImage size={24} className="text-slate-300" />
                                            )}
                                            <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                                <Upload size={20} className="text-white" />
                                                <input type="file" className="hidden" accept="image/*" onChange={e => handleFileChange(e, 'idCardBack')} />
                                            </label>
                                        </div>
                                        <p className="text-[10px] text-center font-bold text-slate-400 uppercase">ID Back</p>
                                    </div>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-2 ml-1 italic">* Max file size 2MB per image</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Role</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[Role.EMPLOYEE, Role.SUPERVISOR, Role.ADMIN].map((role) => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => setUserForm({ ...userForm, role })}
                                            className={`py-3 px-1 rounded-2xl text-xs font-bold border-2 transition-all ${userForm.role === role
                                                ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-sm'
                                                : 'border-slate-100 bg-white text-slate-400 hover:bg-slate-50 hover:border-slate-200'
                                                }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-4">
                                <Button type="submit" className="w-full shadow-xl shadow-blue-200/50 bg-[#004085]">{editingUser ? 'Save Updates' : 'Add Academy Member'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- DASHBOARD CONTENT --- */}
            <div className="mb-8 flex flex-col md:flex-row gap-8 items-start">
                <IDCard user={currentUser!} />
                <div className="flex-1 space-y-4 pt-4">
                    <h2 className="text-3xl font-black text-[#004085] tracking-tighter uppercase italic">Academy <span className="text-slate-800">Control Center</span></h2>
                    <p className="text-slate-500 font-medium max-w-lg">Full access to the UVERS STUDIO workforce. Manage academy members, monitor check-ins, and orchestrate system protocols.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* QR Station */}
                <div className="bg-white rounded-[32px] shadow-sm p-6 flex flex-col items-center justify-center border border-slate-50 relative overflow-hidden h-72">
                    <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${settings.requireQr ? 'from-teal-400 to-emerald-400' : 'from-slate-200 to-slate-300'}`}></div>
                    <h3 className="text-lg font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                        <QrCode className={settings.requireQr ? "text-teal-500" : "text-slate-400"} size={20} />
                        {settings.requireQr ? "Active Check-In" : "Check-In Station"}
                    </h3>

                    {settings.requireQr ? (
                        <div className="flex flex-col items-center">
                            <div className="bg-white p-2 rounded-[20px] border-4 border-slate-50 shadow-inner mb-3 relative group">
                                {globalQrCode ? (
                                    <QRCode value={globalQrCode.code} size={120} />
                                ) : (
                                    <div className="w-[120px] h-[120px] bg-slate-100 animate-pulse rounded-xl"></div>
                                )}
                                <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-[16px] cursor-pointer" onClick={() => generateNewQr()}>
                                    <RefreshCw size={24} className="text-slate-800" />
                                </div>
                            </div>
                            <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden mb-2">
                                <div className="bg-teal-500 h-full transition-all duration-1000 ease-linear rounded-full" style={{ width: `${(timeLeft / settings.qrExpirySeconds) * 100}%` }}></div>
                            </div>
                            <p className="font-mono text-xl font-bold text-slate-800">{globalQrCode?.code}</p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-3 mx-auto">
                                <QrCode size={32} />
                            </div>
                            <Button variant="primary" size="sm" onClick={() => updateSettings({ ...settings, requireQr: true })}>Enable</Button>
                        </div>
                    )}
                </div>

                {/* Charts */}
                <div className="lg:col-span-1 bg-white rounded-[32px] shadow-sm p-6 border border-slate-50 h-72 flex flex-col">
                    <h3 className="text-lg font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                        <BarChart2 className="text-[#004085]" size={20} /> Weekly Activity
                    </h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barSize={12}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', padding: '8px', fontSize: '12px' }} />
                                <Bar dataKey="present" fill="#004085" radius={[6, 6, 6, 6]} stackId="a" />
                                <Bar dataKey="late" fill="#FBBF24" radius={[6, 6, 6, 6]} stackId="a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Settings Compact */}
                <div className="bg-white rounded-[32px] shadow-sm p-6 border border-slate-50 h-72 overflow-y-auto custom-scrollbar">
                    <h3 className="text-lg font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                        <Settings className="text-slate-400" size={20} /> Configuration
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <MapPin size={18} className="text-pink-500" />
                                <div>
                                    <span className="text-sm font-bold text-slate-700 block">Geolocation</span>
                                    <button onClick={openLocationSettings} className="text-[10px] text-pink-500 font-bold hover:underline flex items-center gap-1 mt-0.5">
                                        Configure <Edit size={10} />
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => toggleSetting('requireLocation')} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${settings.requireLocation ? 'bg-pink-500' : 'bg-slate-300'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${settings.requireLocation ? 'translate-x-4' : ''}`}></div>
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <Signal size={18} className="text-orange-500" />
                                <div>
                                    <span className="text-sm font-bold text-slate-700 block">Network Check</span>
                                    <button onClick={openWifiSettings} className="text-[10px] text-orange-500 font-bold hover:underline flex items-center gap-1 mt-0.5">
                                        Configure <Edit size={10} />
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => toggleSetting('requireWifi')} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${settings.requireWifi ? 'bg-orange-500' : 'bg-slate-300'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${settings.requireWifi ? 'translate-x-4' : ''}`}></div>
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <QrCode size={18} className="text-teal-500" />
                                <div>
                                    <span className="text-sm font-bold text-slate-700 block">QR Check-In</span>
                                    <button onClick={openQrSettings} className="text-[10px] text-teal-500 font-bold hover:underline flex items-center gap-1 mt-0.5">
                                        Configure <Edit size={10} />
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => toggleSetting('requireQr')} className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${settings.requireQr ? 'bg-teal-500' : 'bg-slate-300'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${settings.requireQr ? 'translate-x-4' : ''}`}></div>
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <Clock size={18} className="text-blue-500" />
                                <div>
                                    <span className="text-sm font-bold text-slate-700 block">Work Schedule</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400 font-bold">
                                            {getCurrentDayConfig()?.enabled
                                                ? `${getCurrentDayConfig()?.startTime} (+${settings.gracePeriodMinutes}m)`
                                                : 'Off Day'}
                                        </span>
                                        <button onClick={() => setActiveTab('SCHEDULE')} className="text-[10px] text-blue-500 font-bold hover:underline flex items-center gap-1">
                                            <Edit size={10} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <Trash2 size={18} className="text-slate-400" />
                                <div>
                                    <span className="text-sm font-bold text-slate-700 block transition-all">Data Retention</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={settings.dataRetentionDays}
                                            onChange={e => updateSettings({ ...settings, dataRetentionDays: parseInt(e.target.value) || 0 })}
                                            className="w-12 bg-white border border-slate-200 rounded-md px-1 py-0.5 text-[10px] font-bold text-slate-600 outline-none focus:border-slate-400"
                                        />
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Days before delete</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Test Access Button */}
                        <button
                            onClick={handleNetworkTest}
                            className="w-full mt-3 flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl text-[#004085] font-bold text-sm transition-all hover:shadow-sm"
                        >
                            <Globe size={16} />
                            Test My Access
                        </button>
                    </div>
                </div>
            </div>

            {/* --- ORGANIZATION CONTROL SECTION --- */}
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[600px]">
                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-[#004085] flex items-center gap-3 uppercase tracking-tighter">
                            <ShieldCheck className="text-[#004085]" size={28} /> Organization Control
                        </h2>
                        <p className="text-slate-500 font-medium mt-1">Manage teams and workforce</p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto">


                        <div className="w-px h-6 bg-slate-200 mx-1"></div>

                        <button
                            onClick={() => setActiveTab('TEAMS')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'TEAMS' ? 'bg-[#004085] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Grid size={16} /> Teams
                        </button>
                        <button
                            onClick={() => setActiveTab('MEMBERS')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'MEMBERS' ? 'bg-[#004085] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List size={16} /> Members
                        </button>
                        <button
                            onClick={() => setActiveTab('SCHEDULE')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'SCHEDULE' ? 'bg-[#004085] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Calendar size={16} /> Schedule
                        </button>
                        <button
                            onClick={() => setActiveTab('REPORTS')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'REPORTS' ? 'bg-[#004085] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <FileBarChart size={16} /> Reports
                        </button>
                    </div>
                </div>

                <div className="p-4 sm:p-8 bg-slate-50/30 flex-1">

                    {/* TEAMS VIEW */}
                    {activeTab === 'TEAMS' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {/* Create New Team Card */}
                            <button
                                onClick={() => openTeamStudio(null)}
                                className="bg-white border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center p-8 gap-4 text-slate-400 hover:text-[#004085] hover:border-[#004085] hover:bg-blue-50 transition-all group h-64"
                            >
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-white transition-colors">
                                    <Plus size={32} />
                                </div>
                                <span className="font-extrabold text-lg">Create New Team</span>
                            </button>

                            {/* Existing Teams */}
                            {allDepartments.map(dept => {
                                const members = users.filter(u => u.departments.includes(dept));
                                const supervisors = members.filter(u => u.role === Role.SUPERVISOR);
                                const ts = settings.teamSettings?.[dept];
                                const hasCustom = ts && (ts.useCustomIPs || ts.useCustomLocations || ts.useCustomQr || ts.useCustomSchedule);

                                return (
                                    <div key={dept} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-blue-100 transition-all flex flex-col h-64">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center text-[#004085]">
                                                <Users size={20} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {hasCustom && (
                                                    <span className="bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                                                        <Settings size={10} /> Custom
                                                    </span>
                                                )}
                                                <div className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-500">
                                                    {members.length} Members
                                                </div>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-extrabold text-slate-800 mb-2 truncate">{dept}</h3>

                                        <div className="flex-1">
                                            {supervisors.length > 0 ? (
                                                <div className="flex items-center gap-2 mt-2">
                                                    {supervisors.slice(0, 3).map(s => (
                                                        <img key={s.id} src={s.avatar} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" title={s.name} />
                                                    ))}
                                                    {supervisors.length > 3 && (
                                                        <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">+{supervisors.length - 3}</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic mt-2">No supervisors assigned</p>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-slate-50 flex gap-2">
                                            <Button
                                                size="sm"
                                                className="w-full rounded-xl bg-[#004085] text-white hover:bg-blue-700"
                                                onClick={() => openTeamStudio(dept)}
                                            >
                                                Manage Team
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* MEMBERS VIEW */}
                    {activeTab === 'MEMBERS' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="relative w-full sm:max-w-md">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search employees..."
                                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-semibold text-slate-600 focus:ring-4 focus:ring-blue-100 outline-none"
                                        value={userSearchQuery}
                                        onChange={e => setUserSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button
                                        onClick={() => handleDownload(`${api.defaults.baseURL}/export/users`)}
                                        className="flex-1 sm:flex-none px-4 py-3 bg-white border border-slate-200 text-slate-600 hover:text-slate-800 hover:border-slate-300 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <FileBarChart size={18} /> Export CSV
                                    </button>
                                    <Button onClick={openAddUser} className="rounded-2xl flex-1 sm:flex-none w-full sm:w-auto">
                                        <UserPlus size={18} /> Add Member
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredUsers.map(u => (
                                    <div key={u.id} className="bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col gap-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <img src={u.avatar} alt={u.name} className="w-12 h-12 rounded-full bg-slate-100" />
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{u.name}</h4>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${u.role === Role.ADMIN ? 'text-rose-500' : u.role === Role.SUPERVISOR ? 'text-amber-500' : 'text-slate-400'}`}>{u.role}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => openEditUser(u)} className="text-slate-300 hover:text-[#004085] transition-colors p-1.5 hover:bg-blue-50 rounded-full">
                                                    <Edit size={16} />
                                                </button>

                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1 mt-auto">
                                            {u.departments.map(d => (
                                                <span key={d} className="text-[10px] bg-slate-50 text-slate-500 border border-slate-100 px-2 py-1 rounded-md font-bold">{d}</span>
                                            ))}
                                            {u.departments.length === 0 && <span className="text-[10px] text-slate-300 italic">No teams</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SCHEDULE VIEW */}
                    {activeTab === 'SCHEDULE' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-[500px]">
                            {/* Left: Weekly Schedule */}
                            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
                                <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-2">
                                    <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><Clock size={20} /></div>
                                    Weekly Routine
                                </h3>

                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                    {/* Grace Period */}
                                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mb-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-bold text-slate-700">Grace Period (Min)</label>
                                            <input
                                                type="number"
                                                value={gracePeriodForm}
                                                onChange={e => setGracePeriodForm(Math.max(0, parseInt(e.target.value)))}
                                                className="w-20 bg-white border border-slate-200 rounded-xl px-2 py-1 font-bold text-center outline-none focus:border-blue-400"
                                            />
                                        </div>
                                    </div>

                                    {daysOrder.map(day => {
                                        const config = scheduleForm[day] || { enabled: false, startTime: '09:00', endTime: '17:00' };

                                        return (
                                            <div key={day} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${config.enabled ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-70'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div onClick={() => toggleDayEnabled(day)} className={`w-10 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${config.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${config.enabled ? 'translate-x-4' : ''}`}></div>
                                                    </div>
                                                    <span className={`text-sm font-bold ${config.enabled ? 'text-slate-800' : 'text-slate-400'}`}>{day.substring(0, 3)}</span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {config.enabled ? (
                                                        <>
                                                            <input
                                                                type="time"
                                                                value={config.startTime}
                                                                onChange={(e) => updateDayTime(day, 'startTime', e.target.value)}
                                                                className="bg-slate-50 border border-transparent hover:border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all w-20"
                                                            />
                                                            <span className="text-slate-300 font-bold text-xs">-</span>
                                                            <input
                                                                type="time"
                                                                value={config.endTime}
                                                                onChange={(e) => updateDayTime(day, 'endTime', e.target.value)}
                                                                className="bg-slate-50 border border-transparent hover:border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all w-20"
                                                            />
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">Off</span>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="pt-4 mt-4 border-t border-slate-50">
                                    <Button onClick={handleSaveSchedule} className="w-full">Save Changes</Button>
                                </div>
                            </div>

                            {/* Right: Calendar Overrides */}
                            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
                                <h3 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-2">
                                    <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><Calendar size={20} /></div>
                                    Exceptions & Holidays
                                </h3>

                                {/* Calendar Controls */}
                                <div className="flex items-center justify-between mb-4 bg-slate-50 p-2 rounded-2xl">
                                    <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-700 transition-colors shadow-sm"><ChevronLeft size={20} /></button>
                                    <span className="font-bold text-slate-700">{calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                                    <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-700 transition-colors shadow-sm"><ChevronRight size={20} /></button>
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-2">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                                        <div key={d} className="text-center text-xs font-bold text-slate-300 py-2">{d}</div>
                                    ))}
                                    {calendarGrid.map((day, idx) => {
                                        if (!day) return <div key={idx} />;
                                        const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
                                        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const isException = !!settings.exceptions[dateStr];
                                        const exceptionConfig = settings.exceptions[dateStr];
                                        const isOff = exceptionConfig?.enabled === false;

                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => handleExceptionClick(dateStr)}
                                                className={`aspect-square rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all border-2 relative group
                                            ${isException
                                                        ? (isOff ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-blue-50 border-blue-200 text-blue-600')
                                                        : 'bg-white border-transparent hover:border-slate-100 hover:shadow-md text-slate-600'}
                                        `}
                                            >
                                                <span className="text-sm font-bold">{day}</span>
                                                {isException && (
                                                    <span className="text-[8px] font-bold uppercase mt-1">
                                                        {isOff ? 'OFF' : 'EDIT'}
                                                    </span>
                                                )}
                                                {isException && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm(`Delete exception for ${day}? This will revert to the weekly schedule.`)) {
                                                                const newExceptions = { ...settings.exceptions };
                                                                delete newExceptions[Object.keys(settings.exceptions).find(d => d.endsWith(String(day).padStart(2, '0'))) || ''];
                                                                // Actually finding by dateStr is better
                                                                delete newExceptions[dateStr];
                                                                updateSettings({ exceptions: newExceptions });
                                                            }
                                                        }}
                                                        className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 hover:scale-110 transition-all"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* REPORTS VIEW */}
                    {activeTab === 'REPORTS' && (
                        <div className="h-[600px] relative flex flex-col gap-4">
                            <div className="flex justify-end">
                                <Button
                                    onClick={() => handleDownload(`${api.defaults.baseURL}/export/attendance`)}
                                    className="flex items-center gap-2"
                                >
                                    <FileBarChart size={18} /> Export Attendance CSV
                                </Button>
                            </div>
                            <div className="flex-1 relative">
                                <AttendanceHistory scopeUsers={users} editable={true} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- DELETE CONFIRMATION MODAL --- */}
            {
                deleteConfirmationUser && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 transition-all">
                        <div className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200 border border-white/20 text-center">
                            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} className="text-rose-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Member?</h3>
                            <p className="text-slate-500 mb-6 text-sm">
                                Are you sure you want to remove <span className="font-bold text-slate-800">{deleteConfirmationUser.name}</span>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirmationUser(null)}
                                    className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        deleteUser(deleteConfirmationUser.id);
                                        setDeleteConfirmationUser(null);
                                        if (editingUser?.id === deleteConfirmationUser.id) {
                                            setIsUserModalOpen(false);
                                        }
                                    }}
                                    className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-200 transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* --- DELETE TEAM CONFIRMATION MODAL --- */}
            {
                deleteConfirmationTeam && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 transition-all">
                        <div className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200 border border-white/20 text-center">
                            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} className="text-rose-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Team?</h3>
                            <p className="text-slate-500 mb-6 text-sm">
                                Are you sure you want to delete <span className="font-bold text-slate-800">{deleteConfirmationTeam}</span>? This will remove the team from {users.filter(u => u.departments.includes(deleteConfirmationTeam)).length} member(s). This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirmationTeam(null)}
                                    className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        deleteTeam(deleteConfirmationTeam);
                                        setDeleteConfirmationTeam(null);
                                        closeTeamStudio();
                                    }}
                                    className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-200 transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default AdminDashboard;
