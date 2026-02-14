import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Shield, User, Users, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
    const { login, requestPermissions } = useApp();
    const [userId, setUserId] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId || !password) {
            setError('Please enter both User ID and Password');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const success = await login(userId, password);
            if (success) {
                // Request permissions after successful login
                requestPermissions();
            } else {
                setError('Invalid User ID or Password');
            }
        } catch (e) {
            setError('Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container min-h-screen flex items-center justify-center bg-[#004085] p-6 relative overflow-hidden">
            {/* Background shapes */}
            <div className="absolute top-10 left-10 text-white/20 transform rotate-12">
                <svg className="w-32 h-32" viewBox="0 0 100 100" fill="currentColor"><circle cx="50" cy="50" r="50" /></svg>
            </div>
            <div className="absolute bottom-10 right-10 text-white/20 transform -rotate-12">
                <svg className="w-40 h-40" viewBox="0 0 100 100" fill="currentColor"><rect width="100" height="100" rx="30" /></svg>
            </div>

            <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl shadow-blue-900/10 p-10 space-y-8 relative z-10">
                <div className="text-center space-y-2">
                    <div className="bg-white w-20 h-20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-900/20 transform rotate-3 overflow-hidden border-4 border-white">
                        <img src="/xcxx.png" alt="UVERS Logo" className="w-full h-full object-cover" />
                    </div>
                    <h1 className="text-4xl font-black text-[#004085] tracking-tighter">UVERS <span className="opacity-40">STUDIO</span></h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Academy Attendance System</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">User ID / Username</label>
                            <div className="relative z-20">
                                <input
                                    type="text"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FFCC00] focus:bg-white transition-all font-medium text-slate-800 cursor-text"
                                    placeholder="Enter your ID"
                                />
                                <User className="absolute left-3 top-3.5 text-slate-400 pointer-events-none" size={20} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Password</label>
                            <div className="relative z-20">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FFCC00] focus:bg-white transition-all font-medium text-slate-800 cursor-text"
                                    placeholder="Enter your password"
                                />
                                <Shield className="absolute left-3 top-3.5 text-slate-400 pointer-events-none" size={20} />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-red-50 text-red-500 text-sm font-bold text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-[#FF4B4B] hover:bg-[#E03A3A] text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-200 hover:shadow-red-300 transform hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Entering...' : 'Unlock Academy'}
                    </button>
                </form>

                <div className="text-center">
                    <p className="text-xs text-slate-400 font-medium mb-4">
                        Forgot credentials? Contact your administrator.
                    </p>
                    <div className="border-t border-slate-100 pt-4 space-y-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">UVERS STUDIO</p>
                        <p className="text-[10px] text-slate-400 font-medium">Produced by MITC (Maitreyawira Innovation Technology Club)</p>
                        <p className="text-[9px] text-slate-300">Fully Right of Webtinous • All License under Webtinous</p>
                        <div className="pt-2 text-[9px] text-slate-300 font-mono">
                            Support: gilbert177777@gmail.com <br />
                            +62 812-9292-4478
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;