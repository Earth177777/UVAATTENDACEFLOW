
import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { AttendanceMethod, Status } from '../types';
import QRCode from 'react-qr-code';
import { Users, QrCode as QrIcon, Clock, Scan, XCircle, CheckCircle2, AlertCircle, AlertTriangle, Timer, Target, X, CheckCircle, MapPin, Wifi, Signal } from 'lucide-react';
import Button from '../components/Button';
import AttendanceHistory from '../components/AttendanceHistory';
import IDCard from '../components/IDCard';
import api from '../services/api';
import QRScanner from '../components/QRScanner';

// ── Requirement Card ──
const RequirementCard = ({ icon, title, active, detail }: { icon: React.ReactNode, title: string, active: boolean, detail: string }) => (
    <div className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all duration-300 ${active
        ? 'bg-white border border-slate-100 shadow-sm'
        : 'bg-slate-50 border border-slate-50'
        }`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active
            ? 'bg-violet-100 text-violet-600'
            : 'bg-slate-100 text-slate-400'
            }`}>
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm ${active ? 'text-slate-800' : 'text-slate-400'}`}>{title}</p>
            <p className={`text-xs font-medium ${active ? 'text-slate-500' : 'text-slate-300'}`}>{detail}</p>
        </div>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${active
            ? 'bg-emerald-100 text-emerald-600'
            : 'bg-slate-100 text-slate-300'
            }`}>
            {active ? <CheckCircle size={14} /> : <span className="text-xs">—</span>}
        </div>
    </div>
);

const SupervisorDashboard: React.FC = () => {
    const { users, records, teamQrCodes, generateNewQr, settings, currentUser, markAttendance, globalQrCode, geoPermissionStatus, requestPermissions } = useApp();
    const [timeLeft, setTimeLeft] = useState(10);
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [scanInput, setScanInput] = useState('');

    const [currentIP, setCurrentIP] = useState<string>('Detecting...');
    const [isAuthorizedIP, setIsAuthorizedIP] = useState<boolean>(true);

    // A supervisor can have multiple departments
    const myDepts = currentUser?.departments || [];
    const [activeDept, setActiveDept] = useState(myDepts[0] || '');

    const myTeamQr = teamQrCodes[activeDept];

    // Initialize Team QR if not active for selected dept
    useEffect(() => {
        if (!myTeamQr && settings.requireQr && activeDept) {
            generateNewQr(activeDept);
        }
    }, [activeDept, settings.requireQr, myTeamQr]);

    useEffect(() => {
        if (myTeamQr) {
            const expiresAt = myTeamQr.timestamp + myTeamQr.expiresIn;
            const interval = setInterval(() => {
                const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
                setTimeLeft(remaining);

                // Auto-renew if expired
                if (remaining === 0) {
                    generateNewQr(activeDept);
                }
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [myTeamQr, activeDept, generateNewQr]);

    // IP Check
    useEffect(() => {
        const checkIP = async () => {
            try {
                const res = await api.get('/network-check');
                setCurrentIP(res.data.ip);
                if (settings.requireWifi && settings.allowedIPs && settings.allowedIPs.length > 0) {
                    setIsAuthorizedIP(settings.allowedIPs.includes(res.data.ip));
                }
            } catch (err) {
                console.error("IP Check failed", err);
                setCurrentIP('Error detecting IP');
            }
        };
        checkIP();
    }, [settings.requireWifi, settings.allowedIPs]);

    // Filter users: Employees who have activeDept in their departments list
    const myTeam = users.filter(u => u.role === 'EMPLOYEE' && u.departments.includes(activeDept));

    // Check today's records for supervisor
    const todayRecords = records.filter(r => r.userId === currentUser?.id && r.date === new Date().toISOString().split('T')[0]);
    const activeRecords = todayRecords.filter(r => !r.checkOutTime);
    const isCheckedIn = activeRecords.length > 0;

    const showGeoWarning = settings.requireLocation && geoPermissionStatus === 'denied';

    // Personal stats
    const personalStats = useMemo(() => {
        if (!currentUser) return { hoursThisWeek: 0, onTimeRate: 0 };
        const myRecords = records.filter(r => r.userId === currentUser.id);
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        let hoursThisWeek = 0;
        myRecords.forEach(r => {
            if (r.checkInTime && r.checkOutTime) {
                const inDate = new Date(r.checkInTime);
                if (inDate >= startOfWeek) {
                    const diff = new Date(r.checkOutTime).getTime() - inDate.getTime();
                    hoursThisWeek += diff / (1000 * 60 * 60);
                }
            }
        });
        const relevantRecords = myRecords.filter(r => r.status === Status.PRESENT || r.status === Status.LATE);
        const onTime = relevantRecords.filter(r => r.status === Status.PRESENT).length;
        const onTimeRate = relevantRecords.length > 0 ? Math.round((onTime / relevantRecords.length) * 100) : 100;
        return { hoursThisWeek: Math.round(hoursThisWeek * 10) / 10, onTimeRate };
    }, [records, currentUser]);

    // Team stats
    const teamStats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        let present = 0, late = 0, absent = 0;
        myTeam.forEach(member => {
            const record = records.find(r => r.userId === member.id && r.date === today && r.department === activeDept);
            if (!record) absent++;
            else if (record.status === Status.LATE) late++;
            else present++;
        });
        return { present, late, absent, total: myTeam.length };
    }, [records, myTeam, activeDept]);

    const getTodayStatus = (userId: string) => {
        const today = new Date().toISOString().split('T')[0];
        const record = records.find(r => r.userId === userId && r.date === today && r.department === activeDept);
        if (!record) return 'Absent';
        if (record.checkOutTime) return 'Checked Out';
        return record.status === 'LATE' ? 'Late' : 'Present';
    };

    // Attendance handlers (same as employee)
    const handleAttendance = async (type: 'IN' | 'OUT', method: AttendanceMethod, targetDept?: string) => {
        setLoading(true);
        setStatusMsg(null);
        try {
            let location = undefined;
            if (settings.requireLocation) {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                    if (!navigator.geolocation) reject(new Error('Geolocation not supported'));
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });
                location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            }
            if (settings.requireWifi) {
                if (!isAuthorizedIP) {
                    throw new Error(`Unauthorized network. Your IP: ${currentIP}`);
                }
            }
            const res = await markAttendance(currentUser!.id, type, method, location, targetDept, method === AttendanceMethod.QR ? scanInput : undefined);
            setStatusMsg(res.success ? { type: 'success', text: res.message } : { type: 'error', text: res.message });
            if (res.success) setShowScanner(false);
        } catch (err: any) {
            setStatusMsg({ type: 'error', text: err.message || 'Error marking attendance' });
        } finally {
            setLoading(false);
        }
    };

    const handleQrScan = (code?: string) => {
        const inputToUse = code || scanInput;
        if (!inputToUse) return;

        const now = Date.now();
        const isGlobal = globalQrCode && inputToUse === globalQrCode.code;
        if (isGlobal) {
            if (globalQrCode && now > globalQrCode.timestamp + globalQrCode.expiresIn) {
                setStatusMsg({ type: 'error', text: 'Global QR Code has expired. Please wait for a new one.' });
                return;
            }
            handleAttendance('IN', AttendanceMethod.QR, undefined); // undefined target dept for global
            return;
        }
        const matchingDept = Object.keys(teamQrCodes).find(dept => teamQrCodes[dept].code === inputToUse);
        if (matchingDept) {
            const qrData = teamQrCodes[matchingDept];
            if (now > qrData.timestamp + qrData.expiresIn) {
                setStatusMsg({ type: 'error', text: `QR Code for ${matchingDept} has expired.` });
                return;
            }
            if (currentUser?.departments.includes(matchingDept)) {
                handleAttendance('IN', AttendanceMethod.QR, matchingDept);
            } else {
                setStatusMsg({ type: 'error', text: `You are not a member of ${matchingDept}` });
            }
        } else {
            setStatusMsg({ type: 'error', text: 'Invalid or Expired QR Code' });
        }
    };

    const timeOfDay = new Date().getHours();
    const greeting = timeOfDay < 12 ? 'Good Morning' : timeOfDay < 17 ? 'Good Afternoon' : 'Good Evening';
    const greetingEmoji = timeOfDay < 12 ? '☀️' : timeOfDay < 17 ? '🌤️' : '🌙';

    // Early return for no departments (AFTER all hooks)
    if (myDepts.length === 0) {
        return (
            <div className="max-w-6xl mx-auto p-4 sm:p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="bg-white p-12 rounded-[40px] shadow-sm border border-slate-50 max-w-md w-full">
                    <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-400">
                        <Users size={40} />
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-800 mb-2">No Department Assigned</h2>
                    <p className="text-slate-500 font-medium mb-8">You are currently logged in as a Supervisor, but you haven't been assigned to any departments yet.</p>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider bg-slate-50 py-2 rounded-lg">Contact Administrator</div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
            <style>{`
                @keyframes scan {
                    0% { top: 10%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }
                .animate-scan {
                    animation: scan 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
            `}</style>

            {/* Permission Warning */}
            {showGeoWarning && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3 text-rose-600">
                        <AlertTriangle className="w-6 h-6 shrink-0" />
                        <div>
                            <p className="text-sm font-bold">Location Access Denied</p>
                            <p className="text-[10px] font-medium text-rose-500 uppercase tracking-wide">Please enable location in browser settings to check in</p>
                        </div>
                    </div>
                    <Button size="sm" variant="secondary" className="bg-white text-rose-600 border-rose-200 hover:bg-rose-50 whitespace-nowrap" onClick={() => requestPermissions()}>
                        Try Again
                    </Button>
                </div>
            )}

            {/* Department Selector (if multiple depts) */}
            {myDepts.length > 1 && (
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-50 flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">Team:</span>
                    <div className="flex gap-2 overflow-x-auto">
                        {myDepts.map(d => (
                            <button
                                key={d}
                                onClick={() => setActiveDept(d)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeDept === d ? 'bg-[#7C3AED] text-white shadow-lg shadow-violet-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ═══ LEFT COLUMN ═══ */}
                <div className="lg:col-span-1 space-y-6">

                    {/* ── 1. Clock In/Out Card ── */}
                    <div className="bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#4C1D95] p-6 sm:p-8 rounded-[40px] shadow-xl shadow-violet-200/40 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-8 -mt-8 blur-2xl"></div>
                        <div className="relative z-10 text-center">
                            <div className="flex items-center justify-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                                    <span className="text-2xl">{greetingEmoji}</span>
                                </div>
                                <div className="text-left">
                                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{greeting}, Supervisor</p>
                                    <h2 className="text-xl font-extrabold text-white leading-none">{currentUser?.name.split(' ')[0]}</h2>
                                </div>
                            </div>

                            {myDepts.length <= 1 && (
                                <div className="mb-4 px-4 py-1.5 bg-white/10 rounded-full text-white/80 text-xs font-bold inline-block">
                                    {activeDept}
                                </div>
                            )}

                            <div className="space-y-3">
                                {!isCheckedIn ? (
                                    settings.requireQr ? (
                                        <button
                                            onClick={() => setShowScanner(true)}
                                            disabled={loading}
                                            className="w-full bg-white text-[#7C3AED] py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                                        >
                                            <Scan className="w-5 h-5" />
                                            Scan QR Check-In
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleAttendance('IN', settings.requireWifi ? AttendanceMethod.WIFI : AttendanceMethod.LOCATION)}
                                            disabled={loading}
                                            className="w-full bg-white text-[#7C3AED] py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 disabled:opacity-60"
                                        >
                                            <Clock className="w-5 h-5" />
                                            {loading ? 'Processing...' : 'Clock In Now'}
                                        </button>
                                    )
                                ) : (
                                    <button
                                        onClick={() => handleAttendance('OUT', AttendanceMethod.MANUAL)}
                                        disabled={loading}
                                        className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white py-4 rounded-2xl font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-60"
                                    >
                                        <XCircle className="w-5 h-5" />
                                        {loading ? 'Processing...' : 'Clock Out'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Personal Stats ── */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-50 flex flex-col items-center text-center">
                            <div className="w-10 h-10 bg-violet-50 text-violet-500 rounded-xl flex items-center justify-center mb-3">
                                <Timer size={20} />
                            </div>
                            <span className="text-xl font-extrabold text-slate-800 leading-none">{personalStats.hoursThisWeek}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Hrs / Week</span>
                        </div>
                        <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-50 flex flex-col items-center text-center">
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mb-3">
                                <Target size={20} />
                            </div>
                            <span className="text-xl font-extrabold text-slate-800 leading-none">{personalStats.onTimeRate}%</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">On-Time</span>
                        </div>
                    </div>

                    {/* ── 2. QR Code Display (for team) ── */}
                    {settings.requireQr && (
                        <div className="bg-white p-6 sm:p-8 rounded-[40px] shadow-sm flex flex-col items-center text-center border border-slate-50">
                            <div className="w-14 h-14 bg-violet-100 rounded-3xl flex items-center justify-center mb-4 text-violet-600">
                                <QrIcon size={28} />
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-800 mb-1">Team QR Code</h3>
                            <p className="text-xs font-medium text-slate-400 mb-6">{activeDept} · Show this to your team</p>

                            <div className="bg-white p-5 rounded-[28px] border-4 border-violet-100 shadow-inner mb-6">
                                {myTeamQr ? (
                                    <QRCode value={myTeamQr.code} size={160} />
                                ) : (
                                    <div className="w-[160px] h-[160px] bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400">Loading...</div>
                                )}
                            </div>

                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-4">
                                <div
                                    className="bg-[#7C3AED] h-full transition-all duration-1000 ease-linear rounded-full"
                                    style={{ width: `${(timeLeft / settings.qrExpirySeconds) * 100}%` }}
                                ></div>
                            </div>

                            <div className="bg-slate-50 px-5 py-3 rounded-2xl w-full">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Backup Code</p>
                                <p className="text-2xl font-mono font-bold text-slate-800 tracking-wider">{myTeamQr?.code || '---'}</p>
                            </div>

                            {!myTeamQr && (
                                <Button size="sm" onClick={() => generateNewQr(activeDept)} className="mt-4">Start Session</Button>
                            )}
                        </div>
                    )}

                    {/* ── 3. ID Card ── */}
                    <IDCard user={currentUser!} />

                    {/* ── Check-In Rules ── */}
                    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-50">
                        <h3 className="text-sm font-extrabold text-slate-800 mb-4">Check-In Rules</h3>
                        <div className="space-y-3">
                            <RequirementCard
                                icon={<MapPin size={18} />}
                                title="Location"
                                active={settings.requireLocation}
                                detail={settings.requireLocation ? "GPS Active" : "Disabled"}
                            />
                            <RequirementCard
                                icon={<Wifi size={18} />}
                                title="Wi-Fi"
                                active={settings.requireWifi}
                                detail={settings.requireWifi ? "Office Only" : "Anywhere"}
                            />
                            <RequirementCard
                                icon={<QrIcon size={18} />}
                                title="QR Scan"
                                active={settings.requireQr}
                                detail={settings.requireQr ? "Required" : "Manual"}
                            />
                        </div>
                        {settings.requireWifi && !isCheckedIn && (
                            <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isAuthorizedIP ? 'bg-violet-50 text-violet-500' : 'bg-rose-50 text-rose-500'}`}>
                                        <Signal size={16} />
                                    </div>
                                    <div>
                                        <p className={`font-bold text-xs ${isAuthorizedIP ? 'text-slate-800' : 'text-rose-600'}`}>{currentIP}</p>
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{isAuthorizedIP ? 'Authorized' : 'Unauthorized'}</p>
                                    </div>
                                </div>
                                {!isAuthorizedIP && <AlertTriangle size={18} className="text-rose-500 animate-pulse" />}
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══ RIGHT COLUMN ═══ */}
                <div className="lg:col-span-2 space-y-6">

                    {/* ── 4. Team Status Overview ── */}
                    <div className="bg-white rounded-[40px] shadow-sm overflow-hidden border border-slate-50">
                        <div className="p-6 sm:p-8 border-b border-slate-50">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center">
                                        <Users size={20} />
                                    </div>
                                    {activeDept} Team
                                </h3>
                                <div className="flex gap-2 flex-wrap">
                                    <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">{teamStats.present} Present</span>
                                    {teamStats.late > 0 && <span className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-xs font-bold">{teamStats.late} Late</span>}
                                    {teamStats.absent > 0 && <span className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-xs font-bold">{teamStats.absent} Absent</span>}
                                    <span className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">{teamStats.total} Total</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 overflow-x-auto">
                            {myTeam.length === 0 ? (
                                <div className="p-10 text-center text-slate-400">
                                    <Users size={40} className="mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">No employees assigned to {activeDept}</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse min-w-[500px]">
                                    <thead className="text-slate-400 text-xs uppercase font-bold tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 rounded-l-xl">Employee</th>
                                            <th className="px-6 py-4 hidden sm:table-cell">Dept</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 rounded-r-xl">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {myTeam.map(member => {
                                            const status = getTodayStatus(member.id);
                                            const record = records.find(r => r.userId === member.id && r.date === new Date().toISOString().split('T')[0] && r.department === activeDept);

                                            let statusBadge = 'bg-slate-100 text-slate-500';
                                            if (status === 'Present') statusBadge = 'bg-emerald-100 text-emerald-700';
                                            if (status === 'Late') statusBadge = 'bg-amber-100 text-amber-700';
                                            if (status === 'Checked Out') statusBadge = 'bg-blue-50 text-blue-600';
                                            if (status === 'Absent') statusBadge = 'bg-rose-50 text-rose-600';

                                            return (
                                                <tr key={member.id} className="group hover:bg-slate-50/80 transition-colors rounded-2xl">
                                                    <td className="px-6 py-4 rounded-l-2xl">
                                                        <div className="flex items-center gap-3">
                                                            <img src={member.avatar} alt="" className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm" />
                                                            <span className="font-bold text-slate-700 group-hover:text-[#7C3AED] transition-colors">{member.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-slate-500 hidden sm:table-cell">
                                                        {member.departments.join(', ')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadge}`}>
                                                            {status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-mono font-semibold text-slate-600 rounded-r-2xl">
                                                        {record?.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* ── 5. Team History & Reports ── */}
                    <div className="bg-white rounded-[40px] shadow-sm border border-slate-50 overflow-hidden">
                        <div className="p-6 sm:p-8 border-b border-slate-50">
                            <h3 className="text-lg font-extrabold text-slate-800">Team History & Reports</h3>
                            <p className="text-xs text-slate-400 font-medium mt-1">{activeDept} attendance records</p>
                        </div>
                        <div className="h-[500px]">
                            <AttendanceHistory scopeUsers={myTeam} editable={true} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Status Toast ── */}
            {statusMsg && (
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 z-[200] ${statusMsg.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                    <span className="font-bold text-sm">{statusMsg.text}</span>
                    <button onClick={() => setStatusMsg(null)} className="ml-2 text-white/70 hover:text-white">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* ── Scanner Modal ── */}
            {showScanner && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setShowScanner(false)}></div>
                    <div className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col items-center">
                        <div className="w-full pt-8 pb-4 text-center px-6">
                            <button onClick={() => setShowScanner(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2">
                                <X size={20} />
                            </button>
                            <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Scan size={24} className="text-[#7C3AED]" />
                            </div>
                            <h3 className="text-xl font-extrabold text-slate-800">Ready to Scan</h3>
                            <p className="text-slate-400 text-sm mt-1 font-medium">Verify your check-in with the QR code</p>
                        </div>

                        <div className="w-full px-8 pb-8 space-y-6">
                            <div className="w-full">
                                <QRScanner
                                    onScan={(code) => {
                                        if (code) {
                                            setScanInput(code);
                                            handleQrScan(code);
                                        }
                                    }}
                                    onError={(err) => console.log(err)}
                                    onClose={() => setShowScanner(false)}
                                />
                            </div>

                            <div className="relative">
                                <input
                                    type="text"
                                    value={scanInput}
                                    onChange={(e) => setScanInput(e.target.value.toUpperCase())}
                                    placeholder="Or Enter Code"
                                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-mono font-bold text-left tracking-widest text-slate-700 outline-none focus:ring-2 focus:ring-violet-500/20"
                                />
                                <button
                                    onClick={() => handleQrScan(scanInput)}
                                    disabled={!scanInput}
                                    className="absolute right-2 top-2 bottom-2 px-4 bg-[#7C3AED] text-white rounded-xl font-bold text-xs uppercase disabled:opacity-50"
                                >
                                    Verify
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupervisorDashboard;
