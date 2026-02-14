import React from 'react';

const Footer: React.FC = () => {
    const year = new Date().getFullYear();

    return (
        <footer className="w-full py-6 mt-auto bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 text-center md:text-left flex flex-col sm:flex-row gap-1 sm:gap-0">
                    <span>&copy; {year} UVERS STUDIO</span>
                    <span>Academy Management System</span>
                </div>

                <div className="flex gap-6 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <a href="#" className="hover:text-[#004085] dark:hover:text-blue-400 transition-colors">Terms</a>
                    <a href="#" className="hover:text-[#004085] dark:hover:text-blue-400 transition-colors">Privacy</a>
                    <a href="#" className="hover:text-[#004085] dark:hover:text-blue-400 transition-colors">Support</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
