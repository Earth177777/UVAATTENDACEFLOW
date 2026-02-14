
import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, List, Clock, MapPin, Wifi, QrCode, AlertCircle, CheckCircle2, Users, Briefcase, ChevronDown, Filter, Edit2, X, Save, Plus, Trash2 } from 'lucide-react';
import { User, Status, AttendanceMethod, AttendanceRecord } from '../types';
import Button from './Button';

interface AttendanceHistoryProps {
    scopeUsers: User[]; // Users available to select
    preSelectedUserId?: string; // For employees, locked to themselves
    readOnly?: boolean; // If true, hides the user selector (for employees)
    editable?: boolean; // If true, allows editing records from the calendar
}

const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({ scopeUsers, preSelectedUserId, readOnly = false, editable = false }) => {
    const { records, updateRecord, createManualRecord, deleteRecord } = useApp();

    // Selection Format: "ALL" | "TEAM:DeptName" | "USER:UserId"
    const [selectionValue, setSelectionValue] = useState<string>(
        preSelectedUserId
            ? `USER:${preSelectedUserId}`
            : (scopeUsers.length > 1 ? 'ALL' : `USER:${scopeUsers[0]?.id || ''}`)
    );

    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'CALENDAR' | 'LIST'>('CALENDAR');

    // Editing State
    const [editingDate, setEditingDate] = useState<string | null>(null); // "YYYY-MM-DD"

    // --- Derived State for Filtering ---
    const availableDepartments = useMemo(() => {
        const depts = new Set<string>();
        scopeUsers.forEach(u => u.departments.forEach(d => depts.add(d)));
        return Array.from(depts).sort();
    }, [scopeUsers]);

    const { type: filterType, value: filterValue } = useMemo(() => {
        const [type, ...rest] = selectionValue.split(':');
        return { type, value: rest.join(':') };
    }, [selectionValue]);

    const activeScopeUsers = useMemo(() => {
        if (filterType === 'ALL') return scopeUsers;
        if (filterType === 'TEAM') return scopeUsers.filter(u => u.departments.includes(filterValue));
        if (filterType === 'USER') return scopeUsers.filter(u => u.id === filterValue);
        return [];
    }, [filterType, filterValue, scopeUsers]);

    const isAggregateView = filterType === 'ALL' || filterType === 'TEAM';
    const selectedUser = filterType === 'USER' ? activeScopeUsers[0] : null;

    // --- Date Navigation ---
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

    // --- Record Filtering ---
    const monthRecords = useMemo(() => {
        return records.filter(r => {
            const rDate = new Date(r.date);
            const isMonthMatch = rDate.getMonth() === currentDate.getMonth() &&
                rDate.getFullYear() === currentDate.getFullYear();

            if (!isMonthMatch) return false;
            return activeScopeUsers.some(u => u.id === r.userId);
        });
    }, [records, activeScopeUsers, currentDate]);

    // --- Calendar Logic ---
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentDate);
    const calendarGrid = useMemo(() => {
        const grid = [];
        for (let i = 0; i < firstDay; i++) grid.push(null);
        for (let i = 1; i <= days; i++) grid.push(i);
        return grid;
    }, [days, firstDay]);

    const stats = useMemo(() => {
        let present = 0, late = 0, absent = 0;
        monthRecords.forEach(r => {
            if (r.status === Status.PRESENT || r.status === Status.CHECKED_OUT) present++;
            if (r.status === Status.LATE) late++;
            if (r.status === Status.ABSENT) absent++;
        });
        return { present, late, absent };
    }, [monthRecords]);

    // --- Interaction Handlers ---
    const handleDayClick = (day: number) => {
        if (!editable) return;
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setEditingDate(dateStr);
    };

    const getStatusColor = (status: Status) => {
        switch (status) {
            case Status.PRESENT:
            case Status.CHECKED_OUT: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case Status.LATE: return 'bg-amber-100 text-amber-700 border-amber-200';
            case Status.ABSENT: return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-500 border-slate-200';
        }
    };

    const getMethodIcon = (method: AttendanceMethod) => {
        switch (method) {
            case AttendanceMethod.WIFI: return <Wifi size={12} />;
            case AttendanceMethod.LOCATION: return <MapPin size={12} />;
            case AttendanceMethod.QR: return <QrCode size={12} />;
            default: return <Clock size={12} />;
        }
    };

    // --- Render ---
    return (
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full relative">
            {/* --- Header & Controls --- */}
            <div className="p-4 sm:p-6 border-b border-slate-50 flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-50/50">
                {/* Filter Dropdown */}
                <div className="flex items-center gap-3 w-full xl:w-auto">
                    {!readOnly ? (
                        <div className="relative group w-full xl:w-auto">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#004085]">
                                {filterType === 'ALL' && <Users size={18} />}
                                {filterType === 'TEAM' && <Briefcase size={18} />}
                                {filterType === 'USER' && selectedUser?.avatar && <img src={selectedUser.avatar} className="w-5 h-5 rounded-full border border-slate-200" />}
                            </div>
                            <select
                                value={selectionValue}
                                onChange={(e) => setSelectionValue(e.target.value)}
                                className="appearance-none bg-white pl-11 pr-10 py-3 rounded-2xl border border-slate-200 font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 outline-none cursor-pointer w-full xl:min-w-[280px] shadow-sm transition-all hover:border-blue-200 text-sm sm:text-base"
                            >
                                <optgroup label="Overview">
                                    <option value="ALL">Whole Organization</option>
                                </optgroup>
                                {availableDepartments.length > 0 && (
                                    <optgroup label="Teams">
                                        {availableDepartments.map(dept => (
                                            <option key={`team-${dept}`} value={`TEAM:${dept}`}>{dept} Team</option>
                                        ))}
                                    </optgroup>
                                )}
                                <optgroup label="Members">
                                    {scopeUsers.map(u => (
                                        <option key={u.id} value={`USER:${u.id}`}>{u.name}</option>
                                    ))}
                                </optgroup>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronDown size={16} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm w-full sm:w-auto">
                            <img src={scopeUsers[0]?.avatar} className="w-8 h-8 rounded-full border border-slate-100" />
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Viewing History</p>
                                <p className="font-bold text-slate-700 leading-none">{scopeUsers[0]?.name}</p>
                            </div>
                        </div>
                    )}
                    {isAggregateView && (
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#004085] rounded-xl border border-blue-100 shrink-0">
                            <Users size={12} />
                            <span className="text-xs font-bold">{activeScopeUsers.length} Members</span>
                        </div>
                    )}
                </div>

                {/* Date & View Toggles */}
                <div className="flex items-center gap-2 w-full xl:w-auto justify-between xl:justify-end">
                    <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm flex-1 xl:flex-none justify-center">
                        <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"><ChevronLeft size={18} /></button>
                        <div className="px-2 font-bold text-slate-700 w-24 sm:w-32 text-center text-xs sm:text-sm whitespace-nowrap">
                            {currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </div>
                        <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"><ChevronRight size={18} /></button>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-2xl shrink-0">
                        <button
                            onClick={() => setViewMode('CALENDAR')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'CALENDAR' ? 'bg-white text-[#004085] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <CalIcon size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('LIST')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-white text-[#004085] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- Stats Summary --- */}
            <div className="grid grid-cols-3 divide-x divide-slate-50 border-b border-slate-50 bg-white">
                <div className="p-4 text-center group hover:bg-emerald-50/30 transition-colors cursor-default">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-600 transition-colors">On Time</p>
                    <p className="text-xl sm:text-2xl font-black text-emerald-500">{stats.present}</p>
                </div>
                <div className="p-4 text-center group hover:bg-amber-50/30 transition-colors cursor-default">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-amber-600 transition-colors">Late</p>
                    <p className="text-xl sm:text-2xl font-black text-amber-500">{stats.late}</p>
                </div>
                <div className="p-4 text-center group hover:bg-rose-50/30 transition-colors cursor-default">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-rose-600 transition-colors">Issues</p>
                    <p className="text-xl sm:text-2xl font-black text-rose-500">{stats.absent}</p>
                </div>
            </div>

            {/* --- Main Content Area --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-slate-50/30">
                {viewMode === 'CALENDAR' ? (
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-3 xl:gap-4">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-[10px] font-extrabold text-slate-300 py-2 uppercase tracking-wider">{day}</div>
                        ))}

                        {calendarGrid.map((day, idx) => {
                            if (!day) return <div key={idx} className="aspect-square"></div>;

                            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const dayRecords = monthRecords.filter(r => r.date === dateStr);
                            const singleRecord = !isAggregateView ? dayRecords[0] : null;
                            const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;
                            const isPast = new Date(dateStr) < new Date() && new Date(dateStr).toDateString() !== new Date().toDateString();

                            return (
                                <div
                                    key={idx}
                                    onClick={() => handleDayClick(day)}
                                    className={`aspect-square bg-white rounded-xl sm:rounded-2xl border border-slate-100 flex flex-col items-center justify-center relative hover:shadow-md hover:border-blue-100 transition-all group p-0.5 sm:p-1.5 ${editable ? 'cursor-pointer' : 'cursor-default'}`}
                                >
                                    <span className={`text-[10px] sm:text-xs font-bold mb-0.5 sm:mb-1.5 ${dayRecords.length > 0 ? 'text-slate-700' : 'text-slate-300'}`}>{day}</span>

                                    {isAggregateView ? (
                                        <div className="w-full flex flex-col items-center gap-1">
                                            {dayRecords.length > 0 ? (
                                                <div className="flex h-1.5 sm:h-2 w-full max-w-[90%] rounded-full overflow-hidden bg-slate-100 ring-1 sm:ring-2 ring-white">
                                                    <div className="bg-emerald-400 h-full" style={{ width: `${(dayRecords.filter(r => r.status === Status.PRESENT || r.status === Status.CHECKED_OUT).length / activeScopeUsers.length) * 100}%` }}></div>
                                                    <div className="bg-amber-400 h-full" style={{ width: `${(dayRecords.filter(r => r.status === Status.LATE).length / activeScopeUsers.length) * 100}%` }}></div>
                                                    <div className="bg-rose-400 h-full" style={{ width: `${(dayRecords.filter(r => r.status === Status.ABSENT).length / activeScopeUsers.length) * 100}%` }}></div>
                                                </div>
                                            ) : (
                                                isPast && !isWeekend && <div className="w-1.5 h-1.5 rounded-full bg-rose-200"></div>
                                            )}
                                            {dayRecords.length > 0 && (
                                                <span className="hidden sm:inline text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 rounded-md">{dayRecords.length}/{activeScopeUsers.length}</span>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {singleRecord ? (
                                                <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shadow-sm ring-2 ring-white ${singleRecord.status === Status.LATE ? 'bg-amber-400' : singleRecord.status === Status.ABSENT ? 'bg-rose-400' : 'bg-emerald-400'}`}></div>
                                            ) : (
                                                isPast && !isWeekend && <div className="w-1.5 h-1.5 rounded-full bg-rose-200"></div>
                                            )}
                                        </>
                                    )}
                                    {editable && <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"><Edit2 size={8} className="text-slate-400" /></div>}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {monthRecords.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                                <CalendarOffIcon />
                                <p className="font-bold mt-2">No records found</p>
                            </div>
                        ) : (
                            monthRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => {
                                const recordUser = scopeUsers.find(u => u.id === record.userId);
                                return (
                                    <div
                                        key={record.id}
                                        onClick={() => {
                                            if (editable) {
                                                setEditingDate(record.date);
                                            }
                                        }}
                                        className={`bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between hover:shadow-md hover:border-blue-100 transition-all group ${editable ? 'cursor-pointer' : ''}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border ${getStatusColor(record.status)} shrink-0 shadow-sm`}>
                                                {record.status === Status.LATE || record.status === Status.ABSENT ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                                            </div>
                                            <div>
                                                {isAggregateView && recordUser && (
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <img src={recordUser.avatar} className="w-5 h-5 rounded-full border border-slate-100 shadow-sm" />
                                                        <span className="text-sm font-bold text-slate-800">{recordUser.name}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-slate-600 text-xs">
                                                        {new Date(record.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </p>
                                                    {!isAggregateView && (
                                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wide bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                                            {getMethodIcon(record.method)} <span>{record.method}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {isAggregateView && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                                            {getMethodIcon(record.method)} <span>{record.method}</span>
                                                        </div>
                                                        <span className="hidden sm:inline text-[10px] text-slate-300">•</span>
                                                        <span className="text-[10px] text-slate-400 font-bold">{record.department}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm sm:text-base font-mono font-bold text-slate-700">
                                                {new Date(record.checkInTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <div className="flex items-center justify-end gap-1 mt-0.5">
                                                {record.checkOutTime ? (
                                                    <>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                        <p className="text-[10px] font-mono text-slate-400">
                                                            {new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
                                                )}
                                            </div>
                                            {editable && (
                                                <div className="mt-2 flex justify-end">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm('Are you sure you want to delete this record?')) {
                                                                deleteRecord(record.id);
                                                            }
                                                        }}
                                                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* --- EDIT MODAL --- */}
            {editingDate && (
                <EditRecordsModal
                    date={editingDate}
                    users={activeScopeUsers}
                    records={records.filter(r => r.date === editingDate)}
                    onClose={() => setEditingDate(null)}
                    onUpdate={(id, updates) => updateRecord(id, updates)}
                    onCreate={(record) => createManualRecord(record)}
                    onDelete={deleteRecord}
                />
            )}
        </div>
    );
};

const EditRecordsModal = ({ date, users, records, onClose, onUpdate, onCreate, onDelete }: { date: string, users: User[], records: AttendanceRecord[], onClose: () => void, onUpdate: (id: string, d: any) => void, onCreate: (r: AttendanceRecord) => void, onDelete?: (id: string) => void }) => {
    // Helper to from time string 'HH:MM' to ISO
    const fromTimeInput = (timeStr: string) => {
        if (!timeStr) return null;
        const [h, m] = timeStr.split(':');
        const d = new Date(date);
        d.setHours(parseInt(h), parseInt(m));
        return d.toISOString();
    }

    // Calculate summary stats
    const presentCount = records.filter(r => r.status === Status.PRESENT || r.status === Status.CHECKED_OUT).length;
    const lateCount = records.filter(r => r.status === Status.LATE).length;
    const absentCount = users.length - presentCount - lateCount;

    return (
        <div className="absolute inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white w-full max-w-3xl h-[85%] rounded-[32px] shadow-2xl shadow-slate-900/20 flex flex-col overflow-hidden border border-white/60">
                {/* Premium Header with Gradient */}
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#004085] via-[#003366] to-[#001f4d]"></div>
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>

                    <div className="relative p-6 flex justify-between items-start">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg ring-1 ring-white/20">
                                <CalIcon className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-extrabold text-white tracking-tight">Edit Attendance</h3>
                                <p className="text-sm font-medium text-white/80 mt-0.5">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 hover:bg-white/20 rounded-xl text-white/70 hover:text-white transition-all duration-200 hover:scale-105"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Summary Stats Bar */}
                    <div className="relative px-6 pb-4 flex gap-3">
                        <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 ring-1 ring-white/10">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/50"></div>
                            <span className="text-xs font-bold text-white/90">{presentCount} Present</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 ring-1 ring-white/10">
                            <div className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-500/50"></div>
                            <span className="text-xs font-bold text-white/90">{lateCount} Late</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 ring-1 ring-white/10">
                            <div className="w-2 h-2 rounded-full bg-rose-400 shadow-sm shadow-rose-500/50"></div>
                            <span className="text-xs font-bold text-white/90">{absentCount} No Record</span>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3 bg-gradient-to-b from-slate-50 to-white">
                    {users.map(user => {
                        const record = records.find(r => r.userId === user.id);
                        return (
                            <EditRow
                                key={user.id}
                                user={user}
                                record={record}
                                date={date}
                                onDelete={onDelete}
                                onSave={(data: any) => {
                                    if (record) {
                                        onUpdate(record.id, {
                                            checkInTime: fromTimeInput(data.checkIn),
                                            checkOutTime: fromTimeInput(data.checkOut),
                                            status: data.status as Status
                                        });
                                    } else {
                                        onCreate({
                                            id: Math.random().toString(36).substr(2, 9),
                                            userId: user.id,
                                            userName: user.name,
                                            department: user.departments[0],
                                            date: date,
                                            checkInTime: fromTimeInput(data.checkIn),
                                            checkOutTime: fromTimeInput(data.checkOut),
                                            status: data.status as Status,
                                            method: AttendanceMethod.MANUAL
                                        });
                                    }
                                }}
                            />
                        )
                    })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-white/80 backdrop-blur-sm">
                    <p className="text-center text-[11px] text-slate-400 font-medium">
                        Changes are saved automatically • {users.length} team member{users.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>
        </div>
    )
}

const EditRow = ({ user, record, date, onSave, onDelete }: any) => {
    const [checkIn, setCheckIn] = useState(record?.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
    const [checkOut, setCheckOut] = useState(record?.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
    const [status, setStatus] = useState(record?.status || 'ABSENT');
    const [isDirty, setIsDirty] = useState(false);
    const [justSaved, setJustSaved] = useState(false);

    const handleSave = () => {
        onSave({ checkIn, checkOut, status });
        setIsDirty(false);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
    }

    const getStatusStyle = (s: string) => {
        switch (s) {
            case 'PRESENT':
            case 'CHECKED_OUT':
                return 'bg-emerald-50 border-emerald-200 hover:border-emerald-300';
            case 'LATE':
                return 'bg-amber-50 border-amber-200 hover:border-amber-300';
            case 'ABSENT':
                return 'bg-rose-50 border-rose-200 hover:border-rose-300';
            default:
                return 'bg-slate-50 border-slate-200 hover:border-slate-300';
        }
    };

    const getStatusBadge = (s: string) => {
        switch (s) {
            case 'PRESENT':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide"><CheckCircle2 size={12} /> Present</span>;
            case 'CHECKED_OUT':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide"><CheckCircle2 size={12} /> Done</span>;
            case 'LATE':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wide"><Clock size={12} /> Late</span>;
            case 'ABSENT':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-600 text-[10px] font-bold uppercase tracking-wide"><AlertCircle size={12} /> Absent</span>;
            default:
                return null;
        }
    };

    const statusOptions = [
        { value: 'PRESENT', label: 'Present', color: 'emerald' },
        { value: 'LATE', label: 'Late', color: 'amber' },
        { value: 'ABSENT', label: 'Absent', color: 'rose' },
        { value: 'CHECKED_OUT', label: 'Checked Out', color: 'emerald' },
    ];

    return (
        <div className={`group relative rounded-2xl border-2 transition-all duration-300 ${getStatusStyle(status)} ${isDirty ? 'ring-2 ring-blue-200 ring-offset-2' : ''}`}>
            {/* Success Animation Overlay */}
            {justSaved && (
                <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl flex items-center justify-center z-10 animate-in fade-in duration-200">
                    <div className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2">
                        <CheckCircle2 size={16} /> Saved!
                    </div>
                </div>
            )}

            <div className="p-4">
                {/* User Info Row */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <img src={user.avatar} className="w-12 h-12 rounded-xl border-2 border-white shadow-md object-cover" />
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${status === 'PRESENT' || status === 'CHECKED_OUT' ? 'bg-emerald-400' :
                                status === 'LATE' ? 'bg-amber-400' : 'bg-rose-400'
                                }`}></div>
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">{user.name}</p>
                            <p className="text-xs text-slate-500 font-medium">{record ? record.department : user.departments[0]}</p>
                        </div>
                    </div>
                    {getStatusBadge(status)}
                </div>

                {/* Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Check In */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <Clock size={10} className="text-emerald-500" />
                            Check In
                        </label>
                        <div className="relative">
                            <input
                                type="time"
                                value={checkIn}
                                onChange={e => { setCheckIn(e.target.value); setIsDirty(true) }}
                                className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-slate-700 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all hover:border-slate-300"
                            />
                        </div>
                    </div>

                    {/* Check Out */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <Clock size={10} className="text-rose-500" />
                            Check Out
                        </label>
                        <div className="relative">
                            <input
                                type="time"
                                value={checkOut}
                                onChange={e => { setCheckOut(e.target.value); setIsDirty(true) }}
                                className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-slate-700 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all hover:border-slate-300"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <AlertCircle size={10} className="text-[#004085]" />
                            Status
                        </label>
                        <select
                            value={status}
                            onChange={e => { setStatus(e.target.value); setIsDirty(true) }}
                            className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none cursor-pointer transition-all hover:border-slate-300 appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M2.5 4.5l3.5 3.5 3.5-3.5'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                        >
                            {statusOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end mt-4">
                    <button
                        onClick={handleSave}
                        disabled={!isDirty}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${isDirty
                            ? 'bg-gradient-to-r from-[#004085] to-[#003366] text-white shadow-lg shadow-blue-300/50 hover:shadow-blue-400/60 hover:scale-[1.02] active:scale-[0.98]'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        <Save size={16} />
                        {isDirty ? 'Save Changes' : 'No Changes'}
                    </button>
                </div>
            </div>
        </div>
    )
}

const CalendarOffIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-20">
        <path d="M21 4H3C2.44772 4 2 4.44772 2 5V19C2 19.5523 2.44772 20 3 20H21C21.5523 20 22 19.5523 22 19V5C22 4.44772 21.5523 4 21 4Z" />
        <path d="M16 2V6" />
        <path d="M8 2V6" />
        <path d="M2 10H22" />
        <path d="M2 2L22 22" />
    </svg>
);

export default AttendanceHistory;
