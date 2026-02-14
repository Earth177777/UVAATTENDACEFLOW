
import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { LogOut, Moon, Sun, KeyRound, X, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

const Header: React.FC = () => {
  const { currentUser, logout, changePassword } = useApp();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Password change state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwResult, setPwResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  if (!currentUser) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwResult(null);

    if (newPw !== confirmPw) {
      setPwResult({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPw.length < 4) {
      setPwResult({ type: 'error', text: 'Password must be at least 4 characters' });
      return;
    }

    setPwLoading(true);
    const result = await changePassword(currentPw, newPw);
    setPwLoading(false);

    if (result.success) {
      setPwResult({ type: 'success', text: result.message });
      setTimeout(() => {
        setShowPasswordModal(false);
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
        setPwResult(null);
      }, 1500);
    } else {
      setPwResult({ type: 'error', text: result.message });
    }
  };

  return (
    <>
      <header className="header-bar h-20 flex items-center justify-between px-6 sticky top-0 z-[99]">
        <div className="flex items-center gap-3">
          <div className="bg-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/10 transform -rotate-3 overflow-hidden">
            <img src="/xcxx.png" alt="UVERS Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-black tracking-tight hidden md:block header-title text-[#004085]">UVERS <span className="opacity-50">STUDIO</span></h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full transition-all theme-toggle-btn"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Change Password */}
          <button
            onClick={() => { setShowPasswordModal(true); setPwResult(null); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}
            className="p-2 rounded-full transition-all theme-toggle-btn"
            title="Change Password"
          >
            <KeyRound size={16} />
          </button>

          {/* User Pill */}
          <div className="flex items-center gap-2 user-pill p-1.5 pr-2 rounded-full shadow-sm">
            <img src={currentUser.avatar} alt={currentUser.name} className="w-9 h-9 rounded-full border-2 border-slate-50" />
            <div className="flex flex-col items-start mr-2">
              <span className="text-xs font-bold leading-tight user-name">{currentUser.name}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider user-role">{currentUser.role}</span>
            </div>
            <button onClick={logout} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all relative z-10 cursor-pointer">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 transition-all">
          <div className="modal-content rounded-[32px] p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2 modal-title">
                <div className="bg-violet-100 p-2 rounded-xl text-violet-600"><KeyRound size={20} /></div>
                Change Password
              </h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1.5 ml-1 label-text">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    required
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    className="w-full input-field rounded-2xl px-4 py-3 font-semibold outline-none transition-all pr-10"
                    placeholder="Enter current password"
                  />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1.5 ml-1 label-text">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    required
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    className="w-full input-field rounded-2xl px-4 py-3 font-semibold outline-none transition-all pr-10"
                    placeholder="Enter new password"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1.5 ml-1 label-text">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  className="w-full input-field rounded-2xl px-4 py-3 font-semibold outline-none transition-all"
                  placeholder="Re-enter new password"
                />
              </div>

              {/* Result Message */}
              {pwResult && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-bold ${pwResult.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  {pwResult.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {pwResult.text}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={pwLoading}
                className="w-full py-3 bg-[#004085] text-white font-bold rounded-2xl shadow-lg shadow-blue-900/20 hover:shadow-blue-900/30 transition-all disabled:opacity-50"
              >
                {pwLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;