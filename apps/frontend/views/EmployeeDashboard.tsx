import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { AttendanceMethod, Status } from '../types';
import Button from '../components/Button';
import { MapPin, Signal, QrCode as QrIcon, Clock, ChevronRight, CheckCircle2, AlertCircle, Wifi, Scan, AlertTriangle, XCircle, Timer, Target, X, CheckCircle } from 'lucide-react';
import IDCard from '../components/IDCard';
import QRScanner from '../components/QRScanner';
import AttendanceHistory from '../components/AttendanceHistory';
import api from '../services/api';

// ── Requirement Card ──
const RequirementCard = ({ icon, title, active, detail }: { icon: React.ReactNode, title: string, active: boolean, detail: string }) => (
    <div className={`p-3.5 rounded-2xl flex items-center gap-3 transition-all duration-300 ${active
        ? 'bg-white border border-slate-100 shadow-sm'
        : 'bg-slate-50 border border-slate-50'
        }`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active
            ? 'bg-blue-100 text-[#004085]'
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

const EmployeeDashboard: React.FC = () => {
    const { currentUser, records, markAttendance, settings, globalQrCode, teamQrCodes, geoPermissionStatus, requestPermissions } = useApp();
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [scanInput, setScanInput] = useState('');

    const [currentIP, setCurrentIP] = useState<string>('Detecting...');
    const [isAuthorizedIP, setIsAuthorizedIP] = useState<boolean>(true);

    // Initial IP Check
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

    // Check today's records
    const todayRecords = records.filter(r => r.userId === currentUser?.id && r.date === new Date().toISOString().split('T')[0]);
    const activeRecords = todayRecords.filter(r => !r.checkOutTime);

    // Is checked in to ANY department?
    const isCheckedIn = activeRecords.length > 0;

    const showGeoWarning = settings.requireLocation && geoPermissionStatus === 'denied';

    // ── Personal Stats ──
    const personalStats = useMemo(() => {
        if (!currentUser) return { hoursThisWeek: 0, onTimeRate: 0 };

        const myRecords = records.filter(r => r.userId === currentUser.id);

        // ── Hours This Week ──
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

        // ── On-Time Rate ──
        const relevantRecords = myRecords.filter(r => r.status === Status.PRESENT || r.status === Status.LATE);
        const onTime = relevantRecords.filter(r => r.status === Status.PRESENT).length;
        const onTimeRate = relevantRecords.length > 0 ? Math.round((onTime / relevantRecords.length) * 100) : 100;

        return { hoursThisWeek: Math.round(hoursThisWeek * 10) / 10, onTimeRate };
    }, [records, currentUser]);



    const handleAttendance = async (type: 'IN' | 'OUT', method: AttendanceMethod, targetDept?: string, qrCodeContent?: string) => {
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

            const res = await markAttendance(currentUser!.id, type, method, location, targetDept, method === AttendanceMethod.QR ? (qrCodeContent || scanInput) : undefined);

            setStatusMsg(res.success ? { type: 'success', text: res.message } : { type: 'error', text: res.message });
            if (res.success) setShowScanner(false);

        } catch (err: any) {
            setStatusMsg({ type: 'error', text: err.message || 'Error marking attendance' });
        } finally {
            setLoading(false);
        }
    };

    const processQrScan = (code: string) => {
        const now = Date.now();
        console.log("Scanned QR:", code);

        const isGlobal = globalQrCode && code === globalQrCode.code;
        if (isGlobal) {
            // Check if global QR code is expired
            if (globalQrCode && now > globalQrCode.timestamp + globalQrCode.expiresIn) {
                setStatusMsg({ type: 'error', text: 'Global QR Code has expired. Please wait for a new one.' });
                return;
            }
            handleAttendance('IN', AttendanceMethod.QR, undefined, code);
            return;
        }

        const matchingDept = Object.keys(teamQrCodes).find(dept => teamQrCodes[dept].code === code);

        if (matchingDept) {
            const qrData = teamQrCodes[matchingDept];
            // Check if team QR code is expired
            if (now > qrData.timestamp + qrData.expiresIn) {
                setStatusMsg({ type: 'error', text: `QR Code for ${matchingDept} has expired. Please ask an admin to generate a new one.` });
                return;
            }

            if (currentUser?.departments.includes(matchingDept)) {
                handleAttendance('IN', AttendanceMethod.QR, matchingDept, code);
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
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(0, 64, 133, 0.3); }
                    50% { box-shadow: 0 0 40px rgba(0, 64, 133, 0.6); }
                }
                .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
            `}</style>

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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Key Actions & ID Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gradient-to-br from-[#004085] via-[#003366] to-[#001f4d] p-6 sm:p-8 rounded-[40px] shadow-xl shadow-blue-200/40 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-8 -mt-8 blur-2xl"></div>
                        <div className="relative z-10 text-center">
                            <div className="flex items-center justify-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                                    <span className="text-2xl">{greetingEmoji}</span>
                                </div>
                                <div className="text-left">
                                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{greeting}</p>
                                    <h2 className="text-xl font-extrabold text-white leading-none">{currentUser?.name.split(' ')[0]}</h2>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {!isCheckedIn ? (
                                    settings.requireQr ? (
                                        <button
                                            onClick={() => setShowScanner(true)}
                                            disabled={loading}
                                            className="w-full bg-white text-[#004085] py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                                        >
                                            <Scan className="w-5 h-5" />
                                            Scan QR Check-In
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleAttendance('IN', settings.requireWifi ? AttendanceMethod.WIFI : AttendanceMethod.LOCATION)}
                                            disabled={loading}
                                            className="w-full bg-white text-[#004085] py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 disabled:opacity-60"
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-50 flex flex-col items-center text-center">
                            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-3">
                                <Timer size={20} />
                            </div>
                            <span className="text-xl font-extrabold text-slate-800 leading-none">{personalStats.hoursThisWeek}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Hrs / Week</span>
                        </div>
                        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-50 flex flex-col items-center text-center">
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mb-3">
                                <Target size={20} />
                            </div>
                            <span className="text-xl font-extrabold text-slate-800 leading-none">{personalStats.onTimeRate}%</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">On-Time</span>
                        </div>
                    </div>

                    <IDCard user={currentUser!} />
                </div>

                {/* Right Column: Requirements & History */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-50">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-extrabold text-slate-800">Check-In Rules</h3>
                            <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-wider">Policy v1.2</div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAuthorizedIP ? 'bg-indigo-50 text-indigo-500' : 'bg-rose-50 text-rose-500'}`}>
                                        <Signal size={18} />
                                    </div>
                                    <div>
                                        <p className={`font-bold text-xs ${isAuthorizedIP ? 'text-slate-800' : 'text-rose-600'}`}>{currentIP}</p>
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{isAuthorizedIP ? 'Authorized Office Network' : 'Unauthorized Network'}</p>
                                    </div>
                                </div>
                                {!isAuthorizedIP && (
                                    <div className="text-rose-500 animate-pulse">
                                        <AlertTriangle size={20} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-[40px] shadow-sm border border-slate-50 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-lg font-extrabold text-slate-800">Recent Activity</h3>
                            <button className="text-xs font-bold text-[#004085] hover:text-blue-700">View All</button>
                        </div>
                        <div className="h-[400px]">
                            <AttendanceHistory
                                scopeUsers={currentUser ? [currentUser] : []}
                                preSelectedUserId={currentUser?.id}
                                readOnly={true}
                            />
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
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setShowScanner(false)}></div>
                    <div className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col items-center">
                        <div className="w-full pt-8 pb-4 text-center px-6">
                            <button onClick={() => setShowScanner(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2">
                                <X size={20} />
                            </button>
                            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Scan size={24} className="text-[#004085]" />
                            </div>
                            <h3 className="text-xl font-extrabold text-slate-800">Ready to Scan</h3>
                            <p className="text-slate-400 text-sm mt-1 font-medium">Verify your check-in with the team QR</p>
                        </div>

                        <div className="w-full px-8 pb-8 space-y-6">
                            {/* Real QR Scanner */}
                            {/* Real QR Scanner */}
                            <div className="w-full">
                                <QRScanner
                                    onScan={(code) => {
                                        if (code) processQrScan(code);
                                    }}
                                    onError={(err) => console.log(err)}
                                    onClose={() => setShowScanner(false)}
                                />
                            </div>

                            <div className="relative">
                                <div className="text-center text-xs font-bold text-slate-300 uppercase mb-2">Or Enter Manually</div>
                                <input
                                    type="text"
                                    value={scanInput}
                                    onChange={(e) => setScanInput(e.target.value.toUpperCase())}
                                    placeholder="Enter Code"
                                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-mono font-bold text-left tracking-widest text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                                <button
                                    onClick={() => processQrScan(scanInput)}
                                    disabled={!scanInput}
                                    className="absolute right-2 top-8 bottom-2 px-4 bg-[#004085] text-white rounded-xl font-bold text-xs uppercase disabled:opacity-50"
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

export default EmployeeDashboard;